# Habit Tracker PWA

A beautiful, mobile-friendly Progressive Web App for tracking your daily morning and evening habits.

## Features

- **Daily Check-ins**: Track morning and evening habits with one-tap toggles
- **Cloud Sync**: Data syncs across all your devices via Firebase
- **Editable Habits**: Add, edit, and remove habits as your routine evolves
- **Dashboard**: View completion rates, calendar heatmap, and streaks
- **Dark Mode**: Sleek dark theme that's easy on the eyes
- **Offline Support**: Works without internet, syncs when back online
- **Installable**: Add to home screen like a native app

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it "habit-tracker" (or your preference)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Add Web App to Firebase

1. In project dashboard, click the web icon `</>`
2. Register app with nickname "habit-tracker-web"
3. Check "Also set up Firebase Hosting" (optional)
4. Copy the `firebaseConfig` object shown

### 3. Enable Firestore

1. Go to "Build" → "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose nearest location (e.g., `us-central1` or `europe-west1`)
5. Click "Enable"

### 4. Enable Authentication

1. Go to "Build" → "Authentication"
2. Click "Get started"
3. Under "Sign-in method", enable "Email/Password"
4. Also enable "Email link (passwordless sign-in)"
5. Add your domain to "Authorized domains"

### 5. Update Firebase Config

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### 6. Deploy Security Rules

In Firebase Console, go to Firestore Database → Rules, and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

Click "Publish".

### 7. Deploy the App

#### Option A: Firebase Hosting (Recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### Option B: Any Static Host

Upload all files to:
- GitHub Pages
- Netlify
- Vercel
- Any web server

## Usage

1. Open the app in your browser
2. Enter your email and click "Send Magic Link"
3. Check your email and click the link to sign in
4. Start tracking your habits!

### Installing on Mobile

**iPhone/iPad:**
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

**Android:**
1. Open in Chrome
2. Tap menu (3 dots)
3. Select "Add to Home Screen"

## Default Habits

The app comes pre-loaded with these habits from your routine:

**Morning (10 habits):**
1. Stop alarm without snooze and get up
2. Go to bathroom and wash face with soap
3. Eat protein bar/fruit
4. Look phone (only messages)
5. 5-10 minute stretching & get changed
6. Go to the gym
7. Complete scheduled gym session
8. Go home, prepare breakfast & have shower
9. Eat breakfast + phone (social/news)
10. Get changed & go to uni

**Evening (8 habits):**
1. Send messages to Adri
2. Check calendar + gym session next day
3. Set up alarm & Airplane mode
4. Prepare bag & clothes for next day
5. Wash face + apply Roche Possay
6. Take pill
7. Read 5-10 pages book
8. Turn lights off

You can edit these anytime in Settings.

## File Structure

```
habit-tracker/
├── index.html              # Main app
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── firestore.rules         # Database security rules
├── css/
│   └── styles.css          # Dark theme styles
├── js/
│   ├── firebase-config.js  # Firebase setup (edit this!)
│   ├── auth.js             # Authentication
│   ├── habits.js           # Habit management
│   ├── entries.js          # Daily entries
│   ├── dashboard.js        # Statistics
│   └── app.js              # Main controller
└── assets/
    └── icons/              # PWA icons
```

## Cost

The app uses Firebase's free tier, which is more than enough for personal use:

| Resource | Free Limit | Your Usage |
|----------|------------|------------|
| Firestore reads | 50,000/day | ~50/day |
| Firestore writes | 20,000/day | ~20/day |
| Storage | 1 GB | < 1 MB |
| Hosting | 10 GB/month | ~100 KB |

**Total monthly cost: $0**

## Troubleshooting

### "Setup Required" message
- Make sure you've updated `js/firebase-config.js` with your Firebase credentials

### Email link not working
- Check that "Email link (passwordless sign-in)" is enabled in Firebase Auth
- Make sure your domain is in the authorized domains list

### Data not syncing
- Check your internet connection
- Verify Firestore security rules are published
- Check browser console for errors

## License

MIT License - feel free to modify and use as you wish!
