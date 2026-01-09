// ========== AUTHENTICATION ==========
// Functions for handling user authentication

import {
    getAuthInstance,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
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
    return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Create a new account with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
export async function createAccount(email, password) {
    const auth = getAuthInstance();
    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function logout() {
    // Cleanup subscriptions
    if (unsubscribeHabits) unsubscribeHabits();
    if (unsubscribeEntry) unsubscribeEntry();

    const auth = getAuthInstance();
    await signOut(auth);
}
