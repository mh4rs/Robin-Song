import React, { useState, useEffect } from 'react'; 
import { View, Text, Image, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import colors from '../assets/theme/colors';
import TextFormField from '../components/TextForm';
import Button from '../components/Button';
import NavLink from '../components/NavLink';
import { loginUser } from '../auth/authService';
import ErrorMessage from "../components/ErrorMessage";
import SuccessMessage from "../components/SuccessMessage";
import * as WebBrowser from "expo-web-browser";
import { ResponseType } from "expo-auth-session";
import { useAuthRequest } from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import { GoogleAuthProvider } from "firebase/auth";
import { signInWithCredential } from "firebase/auth";
import { useUserData } from '../UserContext'; 
import { API_BASE_URL } from '../../database/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();
  const [success, setSuccess] = useState<string | null>(
    route.params?.successMessage || null
  );

  const { setUserData } = useUserData();


  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: "691628560884-hh9bsk5fm8i9bbpde1lltmvt36u4qs16.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      responseType: ResponseType.IdToken,
      redirectUri: makeRedirectUri({ scheme: "robinsong" }),
      usePKCE: false, 
    },
    { authorizationEndpoint: "https://accounts.google.com/o/oauth2/auth" }
  );
  

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleLogin = async () => {
    console.log("Attempting login...");
  
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
  
    setLoading(true);
  
    try {
      const result = await loginUser(email, password); 
      if (result) {
        console.log("Login successful:", result);
        const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
          method: "GET",
          credentials: "include", 
        });
        const userData = await userResponse.json();
        if (userResponse.ok) {
          console.log("User data fetched:", userData);
          setUserData(userData); 
        } else {
          console.error("Error fetching user data:", userData.error);
        }
        navigation.navigate("Tabs");
      } else {
        setError("Invalid email or password.");
      }
    } catch (error: any) {
      console.log("Login failed:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleGoogleSignIn = async () => {
    try {
      const result = await promptAsync();
      if (result.type !== "success") {
        console.error("Google sign-in failed:", result);
        return;
      }
  
      const { id_token } = result.params;
  
      const credential = GoogleAuthProvider.credential(id_token);
      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
  
      if (!user) {
        console.error("Google sign-in failed: No user returned.");
        return;
      }
  
      console.log("User signed in with Google:", user);
  
      const response = await fetch(`${API_BASE_URL}/google-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: user.email,
        firstName: user.displayName?.split(" ")[0] || "Google",
        lastName: user.displayName?.split(" ")[1] || "User",
        uid: user.uid,
      }),
    });
  
      const data = await response.json();
      if (!response.ok) {
        console.error("Google user registration failed:", data.error);
        return;
      }
  
      console.log("Google user registered successfully:", data);
  
      navigation.navigate("Tabs");
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.area}>
        <Image
          source={require('../assets/img/logos/robinNoText72.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Sign in to Robin!</Text>

        <Text style={styles.subtitle}>Enter your account information to sign in.</Text>

        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        <TextFormField
          placeholder="Email"
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
          autoCapitalize="none"
          style={{marginBottom: 20}}
          textStyle={styles.form}
        />

        <TextFormField
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
          style={{marginBottom: 12}}
          textStyle={styles.form}
        />

        <Button
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleLogin} 
          variant="primary"
          style={styles.form}
          textStyle={{fontSize: 20}}
        />

        <View style={styles.noAccountLayout}>
          <Text style={styles.noAccountText}>
            Don't have an account?
          </Text>
          <NavLink
            text="Sign up"
            targetTab="Register"
            textStyle={[styles.noAccountLink, styles.noAccountText]}
          />
        </View>
        
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  area: {
    width: '100%',
  },
  logo: {
    width: 125,
    height: 125,
    alignSelf: "center",
  },
  title: {
    fontFamily: 'Caprasimo',
    fontSize: 32,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "Radio Canada",
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    fontSize: 20,
    height: 50,
  },
  sizeContainer: {
    marginBottom: 24,
  },
  noAccountLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  noAccountText: {
    fontFamily: 'Radio Canada',
    fontSize: 18,
    color: colors.secondary,
    marginRight: 4,
  },
  noAccountLink: {
    fontWeight: 'bold',
  },
});
