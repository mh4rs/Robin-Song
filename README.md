# Robin-Song

The Bird Sound Identifier application is a cutting-edge tool designed to enhance birdwatching and education by identifying bird species through real-time audio recordings. This app integrates advanced technologies to detect, analyze, and provide detailed information on bird species, offering an interactive and accessible platform for users of all skill levels. Whether you're an avid birdwatcher or a beginner, this application enriches your experience by combining bird detection, history tracking, and forecasting with interactive AI-powered features.

---

## **Features**

- **Real-Time Bird Sound Identification**  
  Accurately detects bird species based on real-time audio recordings, leveraging advanced sound processing and APIs.

- **Bird History and Statistical Insights**  
  Provides a detailed history of past identifications, including timestamps, locations, and audio clips, with filtering options for species, date, and location.

- **Bird Availability Forecasting**  
  Predicts bird sightings based on historical data, user location, and environmental factors, helping users plan birdwatching activities.

- **ChatGPT Integration**  
  Enables users to interact with AI for questions about bird behaviors, habitats, and conservation tips, creating an engaging learning experience.

- **Accessibility Features**  
  Includes voice commands and text-to-speech capabilities to ensure usability for visually impaired users.

- **Interactive User Interface**  
  A user-friendly frontend designed with React, providing seamless navigation and a visually appealing layout.

- **Customizable User Settings**  
  Allows users to personalize their experience with notification preferences, language settings, and accessibility options.

---

## **Getting Started**

Follow these steps to clone, set up, and run the app in it's current development mode.



### 1. **Clone the Repository**
```bash
git clone https://github.com/leahmirch/Robin-Song.git
cd Robin-Song
```

---

### 2. **Backend Setup**
#### **Virtual Environment**
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

#### **Firebase Admin Key**
1. Obtain the `firebase-admin-key.json` file:
   - Reach out to another team member or refer to the **Discord backend chat** to access this file.
2. Place the file in the following location:
   ```
   backend/secrets/firebase-admin-key.json
   ```

#### **Run the Detection Script**
1. Start the backend by running:
   ```bash
   python src/detect_birds.py
   ```
2. Confirm bird detection:
   - Birds heard will be identified.
   - Data will be uploaded to Firestore under the "birds" collection.

---

### 3. **Frontend Setup**
#### **Dependencies**
1. Open a new terminal (preferably cmd for Windows).

2. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

#### **Expo**
1. Ensure you have Expo CLI installed:
   ```bash
   npm install -g expo-cli
   ```
2. Log in to Expo:
   ```bash
   npx expo login -u <your-email>
   ```

#### **Run the Frontend**
1. Start the Expo development server:
   ```bash
   npm start
   ```
2. Access the app:
   - **Mobile**: Scan the QR code displayed in the terminal with the Expo Go app.
   - **Web**: Press `w` in the terminal to open the app in your browser.

---

### 4. **Environment Variables**

Set up the `.env` file in the root directory with the following:
```
EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_api_key
FIREBASE_ADMIN_CREDENTIALS=backend/secrets/firebase-admin-key.json
```

Replace `your_unsplash_api_key` with your actual Unsplash API key from your Unsplash account.

---

### 5. **Development Builds**

Before creating any development builds, download the Google services files from [Firebase](https://console.firebase.google.com/u/3/project/robin-server-45ac7/settings/general/android:com.robinsong.robinsong). 

Then, create a folder in the root directory called `google-services` and place both Google service files within that folder. **Do not push these files to the repo**. They can't currently be added to the .gitignore because of the access required to create the build, but they **cannot** be pushed to the repo. You may have to replace the relative paths with absolute paths if the files cannot be found when you try to create a build.

##### Android Emulator
1. Members of the Robin team must be added into the Expo "robin-song" organization. Please ask Jodi to be added into the org upon making an Expo account.

2. Install an Android emulator with a device using the [Expo documentation](https://docs.expo.dev/get-started/set-up-your-environment/?mode=development-build&platform=android&device=simulated).

3. Install the EAS CLI:
```bash
   npm install -g eas-cli
```

4. Ensure that Expo is installed:
```bash
   npm install expo
```

5. Install metro-config:
```bash
   npm install metro-config
```

6. Install dependencies:
```bash
   npm install
```

7. Login to your EAS account, if you aren't already logged in:
```bash
   eas login
```

8. Initialize the project with the Expo project ID:
```bash
   eas init --id 1a6b53c7-9874-4c72-93cf-b6b6799eef84
```

9. Configure the build: 
```bash
   eas build:configure
```

10. Create the development build:
```bash
   eas build --platform android --profile development
```

11. Start the development server:
```bash
   npm start
```

12. Select the option to run on Android by typing `a` into the terminal

##### iOS Device

1. Reach out to Leah for the credentials to the Apple Developer account so that you can use it throughout the process when prompted.

2. Install the EAS CLI, if you haven't already:
```bash
   npm install -g eas-cli
```

3. Login to your EAS account, if you aren't already logged in:
```bash
   eas login
```

4. Configure your project through EAS and select the `iOS` option:
```bash
   eas build:configure
```

5. Create an ad hoc provisioning profile for your iOS device and follow the instructions: 
```bash
   eas device:create
```

6. Create the development build:
```bash
   eas build --platform ios --profile development
```
   Depending

7. Turn on developer mode:
   Open **Settings > Privacy & Security**, scroll down to developer mode, and enable the setting. You will be prompted to restart the device because developer mode reduce your device's security.

8. Install the build by scanning the QR code in your terminal.

9. Start the development server:
```bash
   npm start
```

---

Enjoy exploring the wonders of the avian world with **Robin**! 🌟