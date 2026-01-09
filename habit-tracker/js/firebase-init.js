// ========== FIREBASE INITIALIZATION ==========
// Firebase SDK imports and initialization

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { setFirebaseInstances } from './state.js';

// Check if running on localhost (for emulator usage)
// Set to false to use production Firebase even on localhost
const USE_EMULATORS = false; // Disabled - set to true and run `firebase emulators:start` for local testing

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAodoB3p7-Cex_Imus3slp_g50Bs0UlBko",
    authDomain: "habit-tracker-f3c23.firebaseapp.com",
    projectId: "habit-tracker-f3c23",
    storageBucket: "habit-tracker-f3c23.firebasestorage.app",
    messagingSenderId: "506442188864",
    appId: "1:506442188864:web:37b25d676ca80c58cd77a5"
};

// Firebase instances (will be set after initialization)
let app = null;
let db = null;
let auth = null;
let emulatorsConnected = false;

/**
 * Initialize Firebase and connect to emulators if on localhost
 * @returns {Object} Object containing app, db, and auth instances
 */
export async function initializeFirebase() {
    if (app) {
        // Already initialized
        return { app, db, auth };
    }

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Connect to emulators if on localhost
    if (USE_EMULATORS && !emulatorsConnected) {
        try {
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
            connectAuthEmulator(auth, 'http://127.0.0.1:9099');
            emulatorsConnected = true;
            console.log('Connected to Firebase emulators');
        } catch (e) {
            console.log('Emulators already connected or not available');
        }
    }

    // Store in centralized state
    setFirebaseInstances(app, db, auth);

    return { app, db, auth };
}

/**
 * Get the Firestore database instance
 * @returns {Firestore} Firestore instance
 */
export function getDb() {
    return db;
}

/**
 * Get the Firebase Auth instance
 * @returns {Auth} Auth instance
 */
export function getAuthInstance() {
    return auth;
}

/**
 * Check if using emulators
 * @returns {boolean} True if using emulators
 */
export function isUsingEmulators() {
    return USE_EMULATORS;
}

// Re-export Firestore functions for use in other modules
export {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch
};

// Re-export Auth functions for use in other modules
export {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
};
