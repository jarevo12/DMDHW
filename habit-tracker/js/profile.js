// ========== USER PROFILE ==========
// Functions for managing user profile data

import { getDb, doc, getDoc, setDoc, serverTimestamp } from './firebase-init.js';
import { currentUser } from './state.js';

/**
 * Get the current user's profile
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export async function getUserProfile() {
    try {
        const db = getDb();
        const profileRef = doc(db, `users/${currentUser.uid}/profile`, 'main');
        const snapshot = await getDoc(profileRef);
        return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Set/update the current user's profile
 * @param {Object} data - Profile data to set
 */
export async function setUserProfile(data) {
    try {
        const db = getDb();
        const profileRef = doc(db, `users/${currentUser.uid}/profile`, 'main');
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
 */
export async function completeOnboarding() {
    await setUserProfile({
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    });
}
