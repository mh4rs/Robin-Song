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
 }

export default IdentifyScreen;
