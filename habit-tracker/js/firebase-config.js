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

// Initialize Firebase
async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        // Wait for Firebase modules to be ready
        if (window.firebaseModules) {
            setupFirebase();
        } else {
            window.addEventListener('firebase-ready', setupFirebase);
        }

        function setupFirebase() {
            try {
                const { initializeApp, getFirestore, enableIndexedDbPersistence, getAuth } = window.firebaseModules;

                // Initialize Firebase app
                app = initializeApp(firebaseConfig);

                // Initialize Firestore
                db = getFirestore(app);

                // Initialize Auth
                auth = getAuth(app);

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

                resolve({ app, db, auth });
            } catch (error) {
                console.error('Firebase initialization error:', error);
                reject(error);
            }
        }
    });
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
