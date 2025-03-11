import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, View,  Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { collection, onSnapshot, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../database/firebaseConfig";
import axios from "axios";
import colors from "frontend/assets/theme/colors";
import Card from "../components/Card";
import Constants from 'expo-constants';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
  
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


interface BirdInfo {
  description: string;
  at_a_glance: string;
  habitat: string;
  image_url: string;
  feeding_behavior: string;
  diet: string;
  scientific_name: string;
  size?: string;      
  color?: string;     
  wing_shape?: string;
  tail_shape?: string;
  migration_text?: string;
  migration_map_url?: string;
 }
 const IdentifyScreen: React.FC = () => {
  const [latestBird, setLatestBird] = useState<BirdData | null>(null);
  const [birdInfo, setBirdInfo] = useState<BirdInfo | null>(null);
  const [birdImage, setBirdImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState("Not Identifying Birds");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

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
          await fetchBirdInfo(data.bird);
        }
      } catch (err) {
        console.error("Error fetching last bird from Firestore:", err);
      }
    };
    fetchLastBird();
  }, []);

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


  const fetchBirdInfo = async (birdName: string) => {
    setLoading(true);
    try {
      const urlResponse = await axios.get<{ name: string; url: string }>(
        "http://192.168.1.108:5000/bird-info",
        { params: { bird: birdName } }
      );
      const birdUrl = urlResponse.data.url;
  
      const scrapeResponse = await axios.get<BirdInfo>(
        "http://192.168.1.108:5000/scrape-bird-info",
        { params: { url: birdUrl } }
      );
      setBirdInfo(scrapeResponse.data);
      setBirdImage(scrapeResponse.data.image_url);
    } catch (error) {
      console.error("Error fetching bird info:", error);
      setBirdInfo(null);
      setBirdImage(null);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
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
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };
  
  const stopRecordingAndUpload = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (uri) {
        const formData = new FormData();
        formData.append("file", {
          uri,
          name: "recording.wav",
          type: "audio/wav",
        } as any);
        formData.append("latitude", String(latitude ?? 0));
        formData.append("longitude", String(longitude ?? 0));
        const response = await axios.post<UploadResponse>(
          "http://192.168.1.108:5000/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (isDetecting && response.data.birds?.length) {
          for (const bird of response.data.birds) {
            console.log(`Detected: ${bird}`);
            setLatestBird({
              bird,
              latitude: latitude ?? 0,
              longitude: longitude ?? 0,
              timestamp: new Date(),
            });
            await fetchBirdInfo(bird);
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
    }
  
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isDetecting]);
  
  const toggleDetection = () => {
    setIsDetecting((prev) => !prev);
  };

  

export default IdentifyScreen;
