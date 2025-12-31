// ========== AUTHENTICATION ==========
// Functions for handling user authentication

import {
    getAuthInstance,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
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
 * Check if the current URL is an email sign-in link
 * @returns {boolean} True if URL is an email sign-in link
 */
export function checkIsSignInWithEmailLink() {
    const auth = getAuthInstance();
    return isSignInWithEmailLink(auth, window.location.href);
}

/**
 * Handle email link sign-in
 */
export async function handleEmailLinkSignIn() {
    let email = localStorage.getItem('emailForSignIn');

    if (!email) {
        email = prompt('Please enter your email to confirm sign-in:');
    }

    if (email) {
        try {
            const auth = getAuthInstance();
            await signInWithEmailLink(auth, email, window.location.href);
            localStorage.removeItem('emailForSignIn');
            window.history.replaceState(null, '', window.location.pathname);
        } catch (error) {
            console.error('Email link sign-in error:', error);
            throw error;
        }
    }
}

/**
 * Send a magic link to the user's email
 * @param {string} email - User's email address
 */
export async function sendMagicLink(email) {
    const continueUrl = window.location.origin + window.location.pathname;
    console.log('Sending magic link to:', email);
    console.log('Continue URL:', continueUrl);

    const actionCodeSettings = {
        url: continueUrl,
        handleCodeInApp: true
    };

    try {
        const auth = getAuthInstance();
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        console.log('Magic link sent successfully!');
        localStorage.setItem('emailForSignIn', email);
    } catch (err) {
        console.error('sendSignInLinkToEmail error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        throw err;
    }
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
