// Authentication Module
import { getFirebaseAuth } from './firebase-config.js';

// Firebase Auth functions loaded dynamically
let signInWithEmailAndPassword = null;
let createUserWithEmailAndPassword = null;
let signOut = null;
let onAuthStateChanged = null;
let sendSignInLinkToEmail = null;
let isSignInWithEmailLink = null;
let signInWithEmailLink = null;

// Current user
let currentUser = null;

// Auth state listeners
const authListeners = [];

// Initialize auth module
async function initAuth() {
    // Import Firebase Auth functions
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    signOut = authModule.signOut;
    onAuthStateChanged = authModule.onAuthStateChanged;
    sendSignInLinkToEmail = authModule.sendSignInLinkToEmail;
    isSignInWithEmailLink = authModule.isSignInWithEmailLink;
    signInWithEmailLink = authModule.signInWithEmailLink;

    const auth = getFirebaseAuth();

    // Check if this is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
        await handleEmailLinkSignIn();
    }

    // Set up auth state listener
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            notifyListeners(user);
            resolve(user);
        });
    });
}

// Handle email link sign-in
async function handleEmailLinkSignIn() {
    const auth = getFirebaseAuth();
    let email = window.localStorage.getItem('emailForSignIn');

    if (!email) {
        // User opened the link on a different device
        email = window.prompt('Please provide your email for confirmation');
    }

    if (email) {
        try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname);
            return true;
        } catch (error) {
            console.error('Email link sign-in error:', error);
            throw error;
        }
    }
    return false;
}

// Send magic link to email
async function sendMagicLink(email) {
    const auth = getFirebaseAuth();

    const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
    };

    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Save email for when user clicks the link
        window.localStorage.setItem('emailForSignIn', email);
        return true;
    } catch (error) {
        console.error('Send magic link error:', error);
        throw error;
    }
}

// Sign in with email and password (fallback)
async function signInWithEmail(email, password) {
    const auth = getFirebaseAuth();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        // If user doesn't exist, create account
        if (error.code === 'auth/user-not-found') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                return userCredential.user;
            } catch (createError) {
                throw createError;
            }
        }
        throw error;
    }
}

// Sign out
async function logOut() {
    const auth = getFirebaseAuth();
    try {
        await signOut(auth);
        currentUser = null;
        return true;
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Get user ID
function getUserId() {
    return currentUser?.uid || null;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Add auth state listener
function addAuthListener(callback) {
    authListeners.push(callback);
    // Immediately call with current state
    if (currentUser !== undefined) {
        callback(currentUser);
    }
}

// Remove auth state listener
function removeAuthListener(callback) {
    const index = authListeners.indexOf(callback);
    if (index > -1) {
        authListeners.splice(index, 1);
    }
}

// Notify all listeners
function notifyListeners(user) {
    authListeners.forEach(callback => {
        try {
            callback(user);
        } catch (error) {
            console.error('Auth listener error:', error);
        }
    });
}

// Get user display info
function getUserInfo() {
    if (!currentUser) return null;
    return {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
    };
}

// Export functions
export {
    initAuth,
    sendMagicLink,
    signInWithEmail,
    logOut,
    getCurrentUser,
    getUserId,
    isAuthenticated,
    addAuthListener,
    removeAuthListener,
    getUserInfo
};
