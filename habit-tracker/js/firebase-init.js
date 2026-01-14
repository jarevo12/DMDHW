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

import {
    getAnalytics,
    logEvent,
    setUserId,
    setUserProperties
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

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
    appId: "1:506442188864:web:37b25d676ca80c58cd77a5",
    measurementId: "G-X7BGCTYYWN"
};

// Firebase instances (will be set after initialization)
let app = null;
let db = null;
let auth = null;
let analytics = null;
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
    console.log('Starting Firebase initialization...');
    app = initializeApp(firebaseConfig);
    console.log('Firebase App initialized');

    db = getFirestore(app);
    console.log('Firestore initialized');

    auth = getAuth(app);
    console.log('Auth initialized');

    try {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Analytics:', error);
        console.error('Analytics error details:', error.message);
    }

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

/**
 * Track custom analytics event
 * @param {string} eventName - Name of the event
 * @param {Object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
    if (!analytics) {
        console.warn('Analytics not initialized yet');
        return;
    }

    try {
        logEvent(analytics, eventName, params);
        console.log(`Analytics: ${eventName}`, params);
    } catch (error) {
        console.error('Error tracking event:', error);
    }
}

/**
 * Set user ID for analytics
 * @param {string} userId - Firebase user ID
 */
export function setAnalyticsUserId(userId) {
    if (!analytics) {
        console.warn('Analytics not initialized yet');
        return;
    }

    try {
        setUserId(analytics, userId);
        console.log('Analytics: User ID set');
    } catch (error) {
        console.error('Error setting user ID:', error);
    }
}

/**
 * Set user properties for analytics
 * @param {Object} properties - User properties
 */
export function setAnalyticsUserProperties(properties) {
    if (!analytics) {
        console.warn('Analytics not initialized yet');
        return;
    }

    try {
        setUserProperties(analytics, properties);
        console.log('Analytics: User properties set', properties);
    } catch (error) {
        console.error('Error setting user properties:', error);
    }
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
