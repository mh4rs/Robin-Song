import React, { useState, useEffect } from 'react';
import { Image, SafeAreaView, ScrollView, Text, StyleSheet, View, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import colors from '../assets/theme/colors';
import Card from '../components/Card';
import Accordion from '../components/Accordion';
import TextFormField from '../components/TextForm';
import Button from '../components/Button';
import Toggle from '../components/Toggle';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState<boolean>(false);
  const userId = "CQsoyFEnAxWfG20BWvULv9hJSZa2"; // hardcoded for now
  const [profilePicture, setProfilePicture] = useState<string>('');

  useFocusEffect(
    React.useCallback(() => {
      const fetchUserPrefs = async () => {
        try {
          const response = await fetch(`http://10.0.0.4:5000/users/${userId}`);
          if (!response.ok) {
            console.error("Failed to fetch user doc from server");
            return;
          }
          const userData = await response.json();
          setLocationEnabled(Boolean(userData.locationPreferences));
          // Debug: Log the fetched profile picture from Firebase
          console.log("Fetched Profile Picture from Firebase:", userData.profilePicture);
          setProfilePicture(userData.profilePicture || '');
        } catch (err) {
          console.error("Error fetching user prefs:", err);
        }
      };
      fetchUserPrefs();
    }, [])
  );
  
  
const getImageSource = (path: string) => {
  if (!path) return require("../assets/img/robin.png"); 

  const normalizedPath = path.replace(/\.\.\//g, "").trim(); 

  const imageMappings: { [key: string]: any } = {
    "assets/img/blue_jay.png": require("../assets/img/blue_jay.png"),
    "assets/img/american_crow.png": require("../assets/img/american_crow.png"),
    "assets/img/canada_goose.png": require("../assets/img/canada_goose.png"),
    "assets/img/canvasback.png": require("../assets/img/canvasback.png"),
    "assets/img/common_grackle.png": require("../assets/img/common_grackle.png"),
    "assets/img/european_starling.png": require("../assets/img/european_starling.png"),
    "assets/img/mallard.png": require("../assets/img/mallard.png"),
    "assets/img/northern_cardinal.png": require("../assets/img/northern_cardinal.png"),
    "assets/img/red-winged-blackbird.png": require("../assets/img/red-winged-blackbird.png"),
    "assets/img/ring-billed-gull.png": require("../assets/img/ring-billed-gull.png"),
    "assets/img/tree-swallow.png": require("../assets/img/tree-swallow.png"),
    "assets/img/turkey_vulture.png": require("../assets/img/turkey_vulture.png"),
  };

  return imageMappings[normalizedPath] || require("../assets/img/robin.png");
};



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Account</Text>
        <View style={styles.accountCard}>
          <View style={styles.leftSide}>
            <View style={styles.topRow}>
            <Image source={getImageSource(profilePicture)} style={styles.image} />
            </View>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.label}>Location</Text>
          </View>
          <View>
            <View style={styles.topRow}>
              <Text style={styles.name}>Jodi Joven</Text>
            </View>
            <Text style={styles.infoText}>jodijov@umich.edu</Text>
            <Text style={styles.infoText}>Dearborn, Michigan</Text>
          </View>
        </View>

        <Text style={styles.title}>Settings</Text>
        <Accordion title="Change Name" startIcon="account-edit-outline">
          <TextFormField
            label="Change First Name"
            placeholder="Jodi"
            value={firstName}
            onChangeText={setFirstName}
            keyboardType="name-phone-pad"
            autoCapitalize="none"
          />
          <TextFormField
            label="Change Last Name"
            placeholder="Joven"
            value={lastName}
            onChangeText={setLastName}
            keyboardType="name-phone-pad"
            autoCapitalize="none"
          />
          <Button
            title="Submit"
            onPress={() => Alert.alert('Submit Button Pressed')}
            variant="primary"
          />
        </Accordion>

        <Accordion title="Change Email Address" startIcon="email-edit-outline">
          <TextFormField
            label="Change Email"
            placeholder="jodijov@umich.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title="Submit"
            onPress={() => Alert.alert('Submit Button Pressed')}
            variant="primary"
          />
        </Accordion>

        <Accordion title="Change Password" startIcon="shield-edit-outline">
          <TextFormField placeholder="Enter new password" isPassword />
          <Button
            title="Submit"
            onPress={() => Alert.alert('Submit Button Pressed')}
            variant="primary"
          />
        </Accordion>

        <Toggle
          title="Enable Voice Commands"
          startIcon="microphone-outline"
          value={voiceCommandsEnabled}
          onToggle={(newValue) => {
            setVoiceCommandsEnabled(newValue);
            console.log("Voice commands toggle is now:", newValue);
          }}
          description="Enabling voice commands allows you to navigate the app using verbal commands. Microphone access is required in order to enable voice commands."
        />

        <Toggle
          title="Enable Location for Predictions"
          startIcon="map-marker-outline"
          value={locationEnabled}
          onToggle={async (newValue) => {
            setLocationEnabled(newValue);
            try {
              const patchResp = await fetch(`http://10.0.0.4:5000/users/${userId}/preferences`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationPreferences: newValue }),
              });
              if (!patchResp.ok) {
                console.error("Failed to update locationPreferences on server");
              }
            } catch (err) {
              console.error("Error PATCHing preferences:", err);
            }
          }}
          description="Enable your location for personalized bird species predictions for your area. Location access is required in order to receive bird forecast prediction local to your area."
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Logout"
            onPress={() => navigation.navigate("Home")}
            variant="secondary"
          />
          <Button
            title="Delete Account"
            onPress={() => Alert.alert('Delete Account Pressed')}
            variant="primary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 10,
  },
  title: {
    fontFamily: 'Caprasimo',
    fontSize: 36,
    color: colors.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  accountCard: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 5,
    shadowRadius: 4,
  },
  leftSide: {
    width: 90,
  },
  topRow: {
    height: 75,
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Caprasimo',
    fontSize: 32,
    color: colors.primary,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Radio Canada',
    color: colors.primary,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 18,
    fontFamily: 'Radio Canada',
    color: colors.text,
    marginBottom: 5,
  },
  image: {
    width: 65,
    height: 65,
    marginBottom: 10,
    borderRadius: 50,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

export default SettingsScreen;
