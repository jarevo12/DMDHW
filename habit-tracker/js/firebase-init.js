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
    setUserProperties,
    setAnalyticsCollectionEnabled
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

import { setFirebaseInstances } from './state.js';

// Check if running on localhost (for emulator usage)
// Set to false to use production Firebase even on localhost
const USE_EMULATORS = false; // Disabled - set to true and run `firebase emulators:start` for local testing

// Environment detection for logging
const IS_PRODUCTION = window.location.hostname !== 'localhost' &&
                      window.location.hostname !== '127.0.0.1';
const ENABLE_DEBUG_LOGS = !IS_PRODUCTION; // Show logs only in dev (localhost)

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
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    try {
        analytics = getAnalytics(app);

        // Only show success message in development
        if (ENABLE_DEBUG_LOGS) {
            console.log('✅ Firebase Analytics initialized successfully');
        }

        // Enable debug mode if URL parameter is present
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug_mode');
        if (debugMode === '1') {
            // Enable analytics collection for debug mode
            setAnalyticsCollectionEnabled(analytics, true);

            // Set debug mode via gtag (this makes events appear in DebugView)
            if (window.gtag) {
                window.gtag('config', 'G-X7BGCTYYWN', { 'debug_mode': true });
            } else {
                // If gtag isn't available, set it on window for Firebase to pick up
                window['GA_DEBUG_MODE'] = true;
            }

            // Always show debug mode messages (helpful for testing)
            console.log('🐛 DEBUG MODE ENABLED - Events will appear in Firebase DebugView');
            console.log('📊 View events at: Firebase Console → Analytics → DebugView');
        }
    } catch (error) {
        // Always log errors (helpful for troubleshooting)
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
        if (ENABLE_DEBUG_LOGS) {
            console.warn('Analytics not initialized yet');
        }
        return;
    }

    try {
        // Always send event to Firebase
        logEvent(analytics, eventName, params);

        // Only log to console in development or debug mode
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug_mode') === '1';

        if (ENABLE_DEBUG_LOGS || debugMode) {
            console.log(`Analytics: ${eventName}`, params);
        }
    } catch (error) {
        // Always log errors (helpful for troubleshooting)
        console.error('Error tracking event:', error);
    }
}

/**
 * Set user ID for analytics
 * @param {string} userId - Firebase user ID
 */
export function setAnalyticsUserId(userId) {
    if (!analytics) {
        if (ENABLE_DEBUG_LOGS) {
            console.warn('Analytics not initialized yet');
        }
        return;
    }

    try {
        setUserId(analytics, userId);

        // Only log in development or debug mode
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug_mode') === '1';

        if (ENABLE_DEBUG_LOGS || debugMode) {
            console.log('Analytics: User ID set');
        }
    } catch (error) {
        // Always log errors
        console.error('Error setting user ID:', error);
    }
}

/**
 * Set user properties for analytics
 * @param {Object} properties - User properties
 */
export function setAnalyticsUserProperties(properties) {
    if (!analytics) {
        if (ENABLE_DEBUG_LOGS) {
            console.warn('Analytics not initialized yet');
        }
        return;
    }

    try {
        setUserProperties(analytics, properties);

        // Only log in development or debug mode
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug_mode') === '1';

        if (ENABLE_DEBUG_LOGS || debugMode) {
            console.log('Analytics: User properties set', properties);
        }
    } catch (error) {
        // Always log errors
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
