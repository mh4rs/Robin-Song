import os
import logging
import wave
import numpy as np
from datetime import datetime
from pytz import timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import credentials, firestore, initialize_app, auth
import firebase_admin
import bcrypt
import psutil
import signal
import subprocess
import werkzeug
from pydub import AudioSegment
from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer

app = Flask(__name__)
CORS(app)

cred = credentials.Certificate(
    os.path.join(os.path.dirname(os.path.dirname(__file__)),
    "secrets/firebase-admin-key.json")
)
initialize_app(cred)
db = firestore.client()

# BirdNET init
analyzer = Analyzer()
analyzer.verbose = False
logging.getLogger("birdnetlib").setLevel(logging.ERROR)

NOISE_FLOOR_THRESHOLD = 1e6
ALPHA = 0.9
is_running = False
process = None  

def terminate_process_and_children(proc_pid):
    """Gracefully terminate a process and any child processes."""
    try:
        parent = psutil.Process(proc_pid)
        for child in parent.children(recursive=True):
            child.terminate()
        parent.terminate()
    except psutil.NoSuchProcess:
        pass


def adjust_floor(current_thresh, observed_power, alpha=0.9):
    return alpha * current_thresh + (1 - alpha) * observed_power

@app.route('/upload', methods=['POST'])
def upload():
    global NOISE_FLOOR_THRESHOLD, ALPHA

    if 'file' not in request.files:
        return jsonify({"error": "No file found"}), 400

    uploaded_file = request.files['file']
    raw_filename = "incoming.m4a"
    uploaded_file.save(raw_filename)

    wav_filename = "temp.wav"
    try:
        audio_data = AudioSegment.from_file(raw_filename, format="m4a")
        audio_data.export(wav_filename, format="wav")
    except Exception as e:
        print("Error converting to WAV:", e)
        if os.path.exists(raw_filename):
            os.remove(raw_filename)
        return jsonify({"error": "Failed to convert M4A to WAV"}), 500

    os.remove(raw_filename)
    lat = 0.0
    lon = 0.0

    # Noise-floor check
    with wave.open(wav_filename, 'rb') as wf:
        frames = wf.readframes(wf.getnframes())
        audio_data_np = np.frombuffer(frames, dtype=np.int16)

    fft_data = np.fft.fft(audio_data_np)
    power_spectrum = np.abs(fft_data) ** 2
    max_power = np.max(power_spectrum)

    if max_power < NOISE_FLOOR_THRESHOLD:
        NOISE_FLOOR_THRESHOLD = adjust_floor(NOISE_FLOOR_THRESHOLD, max_power, ALPHA)
        os.remove(wav_filename)
        return jsonify({
            "message": "Below noise threshold, skipping BirdNET",
            "birds": []
        })
    else:
    
        recording = Recording(analyzer, wav_filename, lat=lat, lon=lon, date=datetime.now(), min_conf=0.25)
        recording.analyze()
        birds = list({item['common_name'] for item in recording.detections})

        # Store to Firestore
        eastern = timezone('US/Eastern')
        current_time = datetime.now().astimezone(eastern)
        for bird in birds:
            db.collection("birds").add({
                "bird": bird,
                "latitude": lat,
                "longitude": lon,
                "timestamp": current_time
            })

        os.remove(wav_filename)
        return jsonify({
            "message": "File processed successfully",
            "birds": birds
        })

@app.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        first_name = data.get("firstName")
        last_name = data.get("lastName")

        try:
            existing_user = auth.get_user_by_email(email)
            if existing_user:
                return jsonify({"error": "This email is already in use."}), 400
        except firebase_admin.auth.UserNotFoundError:
            pass  

        hashed_password = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

        user = auth.create_user(email=email, password=password)

        user_data = {
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "password": hashed_password,
            "voiceCommandsEnabled": False,
            "locationPreferences": False,
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        db.collection("users").document(user.uid).set(user_data)

        print(f"User registered successfully: {user.uid}")
        return jsonify({"message": "User registered successfully", "userId": user.uid})

    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return jsonify({"error": f"Error creating user: {str(e)}"}), 500


@app.route('/google-register', methods=['POST'])
def google_register():
    """Register or update a user who signs in with Google."""
    try:
        data = request.json
        email = data.get("email")
        first_name = data.get("firstName", "Google")
        last_name = data.get("lastName", "User")
        uid = data.get("uid")

        if not email or not uid:
            return jsonify({"error": "Missing required fields"}), 400

        # Check if user is in Firestore
        user_query = db.collection("users").where("email", "==", email).stream()
        existing_user = next(user_query, None)

        if existing_user:
            return jsonify({
                "message": "User already exists in Firestore",
                "userId": existing_user.id
            }), 200

        user_data = {
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "uid": uid,
            "password": "Google Account",
            "voiceCommandsEnabled": False,
            "locationPreferences": False,
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        new_user_ref = db.collection("users").add(user_data)

        return jsonify({
            "message": "Google user registered successfully",
            "userId": new_user_ref[1].id
        }), 201

    except Exception as e:
        return jsonify({"error": f"Error registering Google user: {str(e)}"}), 500


@app.route('/login', methods=['POST'])
def login():
    """Authenticate user login."""
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Both the email and password are required."}), 400

        user_query = db.collection("users").where("email", "==", email).stream()
        user_doc = next(user_query, None)

        if not user_doc:
            print(f"Login failed: User with email {email} not found")
            return jsonify({"error": "User not found."}), 404

        user_data = user_doc.to_dict()
        stored_password = user_data.get("password")

        if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            print(f"Login successful for user: {user_doc.id}")
            return jsonify({"message": "Login successful", "userId": user_doc.id})
        else:
            print(f"Login failed: Incorrect password for user {email}")
            return jsonify({"error": "Invalid credentials."}), 401

    except Exception as e:
        print(f"Error logging in: {str(e)}")
        return jsonify({"error": f"Error logging in: {str(e)}"}), 500


@app.route('/users', methods=['POST'])
def add_user():
    """Add a new user."""
    try:
        data = request.json
        user = {
            "firstName": data["firstName"],
            "lastName": data["lastName"],
            "email": data["email"],
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        user_ref = db.collection("users").add(user)
        return jsonify({"message": "User added", "userId": user_ref[1].id})
    except Exception as e:
        return jsonify({"error": f"Error adding user: {str(e)}"}), 500


@app.route('/users/<user_id>/preferences', methods=['PATCH'])
def update_user_preferences(user_id):
    """Update user preferences (voice commands & location)."""
    try:
        data = request.json
        updates = {}

        if "voiceCommandsEnabled" in data:
            updates["voiceCommandsEnabled"] = data["voiceCommandsEnabled"]

        if "locationPreferences" in data:
            updates["locationPreferences"] = data["locationPreferences"]

        if updates:
            db.collection("users").document(user_id).update(updates)

        return jsonify({"message": "User preferences updated"}), 200
    except Exception as e:
        return jsonify({"error": f"Error updating preferences: {str(e)}"}), 500

@app.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """
    Fetch the user document for the given user_id.
    Returns the user's data as JSON, or 404 if not found.
    """
    try:
        doc_ref = db.collection("users").document(user_id).get()
        if not doc_ref.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = doc_ref.to_dict()
        return jsonify(user_data), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching user: {str(e)}"}), 500


@app.route('/chats/<user_id>', methods=['GET'])
def get_user_chats(user_id):
    """Fetch all chats for a user."""
    try:
        chats = db.collection("chats").where("userId", "==", user_id).stream()
        chat_list = [{"chatId": chat.id, **chat.to_dict()} for chat in chats]
        return jsonify(chat_list)
    except Exception as e:
        return jsonify({"error": f"Error fetching chats: {str(e)}"}), 500


@app.route('/chats', methods=['POST'])
def create_chat():
    """Create a new chat for a user."""
    try:
        data = request.json
        chat = {
            "userId": data["userId"],
            "title": data["title"],
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        chat_ref = db.collection("chats").add(chat)
        return jsonify({"message": "Chat created", "chatId": chat_ref[1].id})
    except Exception as e:
        return jsonify({"error": f"Error creating chat: {str(e)}"}), 500


@app.route('/chats/<chat_id>/messages', methods=['POST'])
def add_message_to_chat(chat_id):
    """Add a message to an existing chat."""
    try:
        data = request.json
        message = {
            "content": data["content"],
            "timestamp": firestore.SERVER_TIMESTAMP
        }
        messages_ref = db.collection("chats").document(chat_id).collection("messages")
        message_ref = messages_ref.add(message)
        return jsonify({"message": "Message added", "messageId": message_ref[1].id})
    except Exception as e:
        return jsonify({"error": f"Error adding message: {str(e)}"}), 500


@app.route('/chats/<chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    """Fetch all messages for a chat."""
    try:
        messages_ref = db.collection("chats").document(chat_id).collection("messages")
        snapshot = messages_ref.order_by("timestamp").stream()
        messages = [{"messageId": message.id, **message.to_dict()} for message in snapshot]
        return jsonify(messages)
    except Exception as e:
        return jsonify({"error": f"Error fetching messages: {str(e)}"}), 500



def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance in KM between two lat/lon points using Haversine.
    We'll convert to miles below if we want that.
    """
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@app.route("/get-hotspot", methods=["GET"])
def get_hotspot():
    bird = request.args.get("bird", "robins")
    month = int(request.args.get("month", 1))

    # optional lat/lon
    user_lat = request.args.get("lat", type=float)
    user_lon = request.args.get("lon", type=float)

    # 1) fetch the single doc
    doc_ref = (
        db.collection("forecasts")
          .document(bird)
          .collection("topHotspots")
          .document(str(month))
          .get()
    )
    if not doc_ref.exists:
        return jsonify({"error": "No precomputed topHotspots for this bird/month"}), 404

    data = doc_ref.to_dict()  

    if "topHotspots" not in data or not data["topHotspots"]:
        return jsonify({"error": "No hotspots found"}), 404

    hotspots = data["topHotspots"]  

    if user_lat is not None and user_lon is not None:
        for h in hotspots:
            dist_km = haversine_distance(user_lat, user_lon, h["lat"], h["lon"])
            dist_mi = dist_km * 0.621371
            h["distance_miles"] = dist_mi

        hotspots.sort(key=lambda x: (x["distance_miles"], -x["reliability_score"]))

        best_hotspot = hotspots[0]
    else:
        hotspots.sort(key=lambda x: x["reliability_score"], reverse=True)
        best_hotspot = hotspots[0]

    return jsonify(best_hotspot), 200



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)