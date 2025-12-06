// ========== USER PROFILE MANAGEMENT ==========
// Handles user profile data and onboarding state

import { getFirestoreDb } from './firebase-config.js';
import { getUserId } from './auth.js';

// Firebase Firestore functions (loaded dynamically)
let doc = null;
let getDoc = null;
let setDoc = null;
let serverTimestamp = null;

/**
 * Initialize profile module by loading Firebase Firestore functions
 */
export async function initProfile() {
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    doc = firestoreModule.doc;
    getDoc = firestoreModule.getDoc;
    setDoc = firestoreModule.setDoc;
    serverTimestamp = firestoreModule.serverTimestamp;
}

/**
 * Get user profile from Firestore
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export async function getUserProfile() {
    try {
        const db = getFirestoreDb();
        const userId = getUserId();

        if (!userId) {
            console.warn('No user ID available');
            return null;
        }

        const profileRef = doc(db, `users/${userId}/profile`, 'main');
        const snapshot = await getDoc(profileRef);
        return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Set user profile data in Firestore
 * @param {Object} data - Profile data to save
 * @returns {Promise<void>}
 */
export async function setUserProfile(data) {
    try {
        const db = getFirestoreDb();
        const userId = getUserId();

        if (!userId) {
            console.warn('No user ID available');
            return;
        }

        const profileRef = doc(db, `users/${userId}/profile`, 'main');
        await setDoc(profileRef, {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error setting user profile:', error);
    }
}

/**
 * Mark onboarding as completed for the current user
 * @returns {Promise<void>}
 */
export async function completeOnboarding() {
    await setUserProfile({
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    });
}

/**
 * Check if user has completed onboarding
 * @param {Object|null} profile - User profile object
 * @returns {boolean} True if onboarding is completed
 */
export function hasCompletedOnboarding(profile) {
    return profile && profile.onboardingCompleted === true;
}
