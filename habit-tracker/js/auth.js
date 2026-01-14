// ========== AUTHENTICATION ==========
// Functions for handling user authentication

import {
    getAuthInstance,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    trackEvent,
    setAnalyticsUserId
} from './firebase-init.js';
import { setCurrentUser, unsubscribeHabits, unsubscribeEntry } from './state.js';

// Callback for auth state changes (set by main.js)
let authStateCallback = null;

/**
 * Set the callback function to handle auth state changes
 * @param {Function} callback - Function to call when auth state changes
 */
export function setAuthStateCallback(callback) {
    authStateCallback = callback;
}

/**
 * Initialize authentication and set up auth state listener
 */
export function initAuth() {
    const auth = getAuthInstance();

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);

        // Track login event and set user ID for analytics
        if (user) {
            setAnalyticsUserId(user.uid);
            trackEvent('user_login', {
                method: 'email_password',
                timestamp: Date.now()
            });
        }

        if (authStateCallback) {
            await authStateCallback(user);
        }
    });
}

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
export async function signInWithPassword(email, password) {
    const auth = getAuthInstance();
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Note: user_login event is tracked in onAuthStateChanged listener

    return result;
}

/**
 * Create a new account with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
export async function createAccount(email, password) {
    const auth = getAuthInstance();
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Track signup event
    trackEvent('user_signup', {
        method: 'email_password',
        timestamp: Date.now()
    });

    return result;
}

/**
 * Sign out the current user
 */
export async function logout() {
    // Track logout event
    trackEvent('user_logout', {
        timestamp: Date.now()
    });

    // Cleanup subscriptions
    if (unsubscribeHabits) unsubscribeHabits();
    if (unsubscribeEntry) unsubscribeEntry();

    const auth = getAuthInstance();
    await signOut(auth);
}
