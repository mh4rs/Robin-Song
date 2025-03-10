import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import colors from "frontend/assets/theme/colors";
import Card from "../components/Card";
import Constants from 'expo-constants';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Location from 'expo-location';

// Firestore imports for fetching last detection
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from "../../database/firebaseConfig";

const UNSPLASH_ACCESS_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  Constants.expoConfig?.extra?.UNSPLASH_ACCESS_KEY;

interface BirdData {
  bird: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface UploadResponse {
  birds: string[];
  message: string;
}

const IdentifyScreen: React.FC = () => {
  const [latestBird, setLatestBird] = useState<BirdData | null>(null);
  const [birdImage, setBirdImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState("Not Identifying Birds");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Fetch the user's last detection from Firestore on mount
  useEffect(() => {
    const fetchLastBird = async () => {
      try {
        const birdsRef = collection(db, "birds");
        const q = query(birdsRef, orderBy("timestamp", "desc"), limit(1));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const doc = querySnap.docs[0];
          const data = doc.data();
          const docTimestamp = data.timestamp ? data.timestamp.toDate() : new Date();
          setLatestBird({
            bird: data.bird,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timestamp: docTimestamp,
          });
          await fetchBirdImage(data.bird);
        }
      } catch (err) {
        console.error("Error fetching last bird from Firestore:", err);
      }
    };
    fetchLastBird();
  }, []);

  // Get device location once on mount
  useEffect(() => {
    const fetchInitialLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission required", "Enable location access for detection logs.");
          return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        if (loc && loc.coords) {
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
        }
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    };
    fetchInitialLocation();
  }, []);

  // Fetch bird image from Unsplash
  const fetchBirdImage = async (birdName: string) => {
    setLoading(true);
    try {
      const response = await axios.get<{
        results: { urls: { small: string } }[];
      }>("https://api.unsplash.com/search/photos", {
        params: { query: birdName, per_page: 1 },
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      });
      const images = response.data.results;
      setBirdImage(images.length > 0 ? images[0].urls.small : null);
    } catch (error) {
      console.error("Error fetching bird image:", error);
      setBirdImage(null);
    } finally {
      setLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission required", "Enable microphone access in settings.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      console.log("Recording started.");
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Stop recording and upload
  const stopRecordingAndUpload = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      console.log("Recording stopped.");
      const uri = recordingRef.current.getURI();
      if (uri) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'recording.wav',
          type: 'audio/wav',
        } as any);
        formData.append("latitude", String(latitude ?? 0));
        formData.append("longitude", String(longitude ?? 0));
        const response = await axios.post<UploadResponse>(
          'http://192.168.1.108:5000/upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        if (isDetecting && response.data.birds?.length) {
          for (const bird of response.data.birds) {
            if (!isDetecting) break;
            console.log(`Detected: ${bird}`);
            setLatestBird({
              bird,
              latitude: latitude ?? 0,
              longitude: longitude ?? 0,
              timestamp: new Date(),
            });
            await fetchBirdImage(bird);
          }
        }
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
    } finally {
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  };

  // Continuous detection cycle
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const startDetectionCycle = async () => {
      console.log("Detection started.");
      setDetectionStatus("Identifying Birds");
      await startRecording();
      intervalId = setInterval(async () => {
        if (!isDetecting) return;
        await stopRecordingAndUpload();
        if (isDetecting) {
          await startRecording();
        }
      }, 3000);
    };
    if (isDetecting) {
      startDetectionCycle();
    } else {
      console.log("Detection stopped.");
      setDetectionStatus("Not Identifying Birds");
      if (intervalId) clearInterval(intervalId);
      stopRecordingAndUpload();
      setLatestBird(null);
      setBirdImage(null);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isDetecting]);

  // Toggle detection state
  const toggleDetection = () => {
    setIsDetecting((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.statusContainer}>
          <Card style={styles.badge}>
            <Text style={styles.badgeDate}></Text>
            <Text style={styles.badgeText}>{detectionStatus}</Text>
            <Text style={styles.badgeDate}></Text>
          </Card>
          <TouchableOpacity style={styles.listeningButton} onPress={toggleDetection}>
            <MaterialCommunityIcons
              name={isDetecting ? "microphone" : "microphone-off"}
              size={36}
              color={colors.card}
            />
          </TouchableOpacity>
          <Card style={styles.badge}>
            <Text style={styles.badgeText}>Bird Last Identified On</Text>
            <Text style={styles.badgeDate}>
              {latestBird ? latestBird.timestamp.toLocaleString() : "No bird detected yet"}
            </Text>
          </Card>
        </View>
        <Text style={styles.speciesName}>
          {latestBird ? latestBird.bird : "No Bird Found Yet"}
        </Text>
        <Text style={styles.speciesLatin}>
          {latestBird ? "Dynamic Bird Info" : ""}
        </Text>
        <View style={styles.robinContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : birdImage ? (
            <Image source={{ uri: birdImage }} style={styles.robinImage} />
          ) : (
            <Text style={styles.sectionText}>No image available.</Text>
          )}
        </View>
        <View>
          <Text style={styles.sectionHeading}>Physical Description</Text>
          <Text style={styles.sectionText}>
            American Robins are fairly large songbirds...
          </Text>
        </View>
        <View style={styles.separator} />
        <View>
          <Text style={styles.sectionHeading}>Overview</Text>
          <Text style={styles.sectionText}>
            A very familiar bird over most of North America...
          </Text>
        </View>
        <View style={styles.separator} />
        <View>
          <Text style={styles.sectionHeading}>Habitat</Text>
          <Text style={styles.sectionText}>
            Cities, towns, lawns, farmland, forests...
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { padding: 20 },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  badge: {
    width: "35%",
    height: 110,
    justifyContent: "center",
    shadowRadius: 0,
    elevation: 3,
    padding: 0,
  },
  badgeText: {
    fontFamily: "Caprasimo",
    fontSize: 16,
    color: colors.primary,
    textAlign: "center",
  },
  badgeDate: {
    fontFamily: "Radio Canada",
    fontSize: 12,
    color: colors.text,
    textAlign: "center",
  },
  listeningButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  speciesName: {
    fontFamily: "Caprasimo",
    fontSize: 36,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 5,
  },
  speciesLatin: {
    fontFamily: "Radio Canada Italic",
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 20,
  },
  robinContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  robinImage: {
    width: 350,
    height: 250,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sectionText: {
    fontFamily: "Radio Canada",
    fontSize: 16,
    color: colors.text,
    textAlign: "left",
    lineHeight: 24,
  },
  sectionHeading: {
    fontFamily: "Caprasimo",
    fontSize: 28,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 10,
  },
  separator: {
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: 10,
  },
});

export default IdentifyScreen;
