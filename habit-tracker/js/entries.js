// ========== ENTRIES ==========
// Functions for managing daily habit entries

import { getDb, doc, setDoc, onSnapshot } from './firebase-init.js';
import { currentUser, currentDate, currentEntry, setCurrentEntry, setUnsubscribeEntry, unsubscribeEntry } from './state.js';
import { formatDate } from './utils.js';

// Callback for when entry changes (set by main.js)
let entryChangeCallback = null;

/**
 * Set the callback function to handle entry changes
 * @param {Function} callback - Function to call when entry changes
 */
export function setEntryChangeCallback(callback) {
    entryChangeCallback = callback;
}

/**
 * Subscribe to entry changes for the current date
 */
export function subscribeToEntry() {
    // Unsubscribe from previous subscription if exists
    if (unsubscribeEntry) unsubscribeEntry();

    const db = getDb();
    const dateString = formatDate(currentDate);
    const entryRef = doc(db, `users/${currentUser.uid}/entries`, dateString);

    const unsubscribe = onSnapshot(entryRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            setCurrentEntry({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
            setCurrentEntry({ morning: [], evening: [] });
        }

        if (entryChangeCallback) {
            entryChangeCallback(currentEntry);
        }
    });

    setUnsubscribeEntry(unsubscribe);
}

/**
 * Toggle a habit completion for the current date
 * @param {string} habitId - Habit document ID
 * @param {string} type - 'morning' or 'evening'
 */
export async function toggleHabit(habitId, type) {
    const todayString = formatDate(new Date());
    const currentString = formatDate(currentDate);
    if (currentString > todayString) {
        return;
    }
    const db = getDb();
    const dateString = formatDate(currentDate);
    const entryRef = doc(db, `users/${currentUser.uid}/entries`, dateString);

    const completed = currentEntry[type] || [];
    const isCompleted = completed.includes(habitId);

    const newCompleted = isCompleted
        ? completed.filter(id => id !== habitId)
        : [...completed, habitId];

    await setDoc(entryRef, {
        date: dateString,
        [type]: newCompleted
    }, { merge: true });
}

/**
 * Get completion status for a habit on the current date
 * @param {string} habitId - Habit document ID
 * @param {string} type - 'morning' or 'evening'
 * @returns {boolean} True if habit is completed
 */
export function isHabitCompleted(habitId, type) {
    const completed = currentEntry?.[type] || [];
    return completed.includes(habitId);
}

/**
 * Get the current entry
 * @returns {Object} Current entry object
 */
export function getCurrentEntry() {
    return currentEntry;
}

/**
 * Resubscribe to entry when date changes
 */
export function resubscribeToEntry() {
    subscribeToEntry();
}
