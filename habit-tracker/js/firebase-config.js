// Firebase Configuration Module
// Replace these values with your Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyAodoB3p7-Cex_Imus3slp_g50Bs0UlBko",
    authDomain: "habit-tracker-f3c23.firebaseapp.com",
    projectId: "habit-tracker-f3c23",
    storageBucket: "habit-tracker-f3c23.firebasestorage.app",
    messagingSenderId: "506442188864",
    appId: "1:506442188864:web:37b25d676ca80c58cd77a5"
};

// Firebase instances
let app = null;
let db = null;
let auth = null;

// Check if running on localhost (for emulator usage)
const USE_EMULATORS = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Initialize Firebase
async function initializeFirebase() {
    if (app && db && auth) {
        return { app, db, auth };
    }

    try {
        // Load Firebase SDK modules directly from CDN
        const [
            appModule,
            firestoreModule,
            authModule
        ] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
        ]);

        const { initializeApp } = appModule;
        const { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } = firestoreModule;
        const { getAuth, connectAuthEmulator } = authModule;

        // Initialize Firebase app
        app = initializeApp(firebaseConfig);

        // Initialize Firestore
        db = getFirestore(app);

        // Initialize Auth
        auth = getAuth(app);

        // Connect to emulators if running locally
        if (USE_EMULATORS) {
            console.log('🔧 Using Firebase Emulators');
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectAuthEmulator(auth, 'http://localhost:9099');
        }

        // Enable offline persistence
        enableIndexedDbPersistence(db)
            .then(() => {
                console.log('Offline persistence enabled');
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Persistence failed: Multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('Persistence not supported by browser');
                }
            });

        return { app, db, auth };
    } catch (error) {
        console.error('Firebase initialization error:', error);
        throw error;
    }
}

// Get Firebase instances
function getFirebaseApp() {
    return app;
}

function getFirestoreDb() {
    return db;
}

function getFirebaseAuth() {
    return auth;
}

// Check if Firebase is configured
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

// Export for use in other modules
export {
    firebaseConfig,
    initializeFirebase,
    getFirebaseApp,
    getFirestoreDb,
    getFirebaseAuth,
    isFirebaseConfigured
};
