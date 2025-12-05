// Daily Entries Module
import { getFirestoreDb } from './firebase-config.js';
import { getUserId } from './auth.js';

// Firebase Firestore functions
let doc, getDoc, setDoc, getDocs, collection, query, where, orderBy, onSnapshot, serverTimestamp;

// Local cache of entries
let entriesCache = {};

// Listeners for entry changes
const entryListeners = [];

// Initialize entries module
async function initEntries() {
    // Import Firestore functions
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    doc = firestoreModule.doc;
    getDoc = firestoreModule.getDoc;
    setDoc = firestoreModule.setDoc;
    getDocs = firestoreModule.getDocs;
    collection = firestoreModule.collection;
    query = firestoreModule.query;
    where = firestoreModule.where;
    orderBy = firestoreModule.orderBy;
    onSnapshot = firestoreModule.onSnapshot;
    serverTimestamp = firestoreModule.serverTimestamp;

    return true;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get today's date string
function getTodayString() {
    return formatDate(new Date());
}

// Subscribe to entry for a specific date
function subscribeToEntry(dateString, callback) {
    const userId = getUserId();
    if (!userId) {
        console.error('No user ID available');
        return () => {};
    }

    const db = getFirestoreDb();
    const entryRef = doc(db, `users/${userId}/entries`, dateString);

    const unsubscribe = onSnapshot(entryRef, (docSnapshot) => {
        let entry = null;
        if (docSnapshot.exists()) {
            entry = { id: docSnapshot.id, ...docSnapshot.data() };
        } else {
            entry = {
                id: dateString,
                date: dateString,
                morning: [],
                evening: []
            };
        }
        entriesCache[dateString] = entry;
        if (callback) callback(entry);
    }, (error) => {
        console.error('Entry subscription error:', error);
    });

    return unsubscribe;
}

// Get entry for a specific date
async function getEntry(dateString) {
    // Check cache first
    if (entriesCache[dateString]) {
        return entriesCache[dateString];
    }

    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const entryRef = doc(db, `users/${userId}/entries`, dateString);
    const docSnapshot = await getDoc(entryRef);

    if (docSnapshot.exists()) {
        const entry = { id: docSnapshot.id, ...docSnapshot.data() };
        entriesCache[dateString] = entry;
        return entry;
    }

    // Return empty entry
    return {
        id: dateString,
        date: dateString,
        morning: [],
        evening: []
    };
}

// Toggle habit completion for a date
async function toggleHabit(dateString, habitId, type) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const entryRef = doc(db, `users/${userId}/entries`, dateString);

    // Get current entry
    const entry = await getEntry(dateString);
    const completedHabits = entry[type] || [];

    // Toggle the habit
    let newCompletedHabits;
    const isCompleted = completedHabits.includes(habitId);

    if (isCompleted) {
        newCompletedHabits = completedHabits.filter(id => id !== habitId);
    } else {
        newCompletedHabits = [...completedHabits, habitId];
    }

    // Update entry
    await setDoc(entryRef, {
        date: dateString,
        [type]: newCompletedHabits,
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Update cache
    entriesCache[dateString] = {
        ...entry,
        [type]: newCompletedHabits
    };

    notifyListeners(dateString, entriesCache[dateString]);

    return !isCompleted; // Return new state
}

// Set habit completion status
async function setHabitCompletion(dateString, habitId, type, completed) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const entryRef = doc(db, `users/${userId}/entries`, dateString);

    // Get current entry
    const entry = await getEntry(dateString);
    const completedHabits = entry[type] || [];

    // Update based on completed flag
    let newCompletedHabits;
    const isCurrentlyCompleted = completedHabits.includes(habitId);

    if (completed && !isCurrentlyCompleted) {
        newCompletedHabits = [...completedHabits, habitId];
    } else if (!completed && isCurrentlyCompleted) {
        newCompletedHabits = completedHabits.filter(id => id !== habitId);
    } else {
        return completed; // No change needed
    }

    // Update entry
    await setDoc(entryRef, {
        date: dateString,
        [type]: newCompletedHabits,
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Update cache
    entriesCache[dateString] = {
        ...entry,
        [type]: newCompletedHabits
    };

    notifyListeners(dateString, entriesCache[dateString]);

    return completed;
}

// Check if habit is completed for a date
function isHabitCompleted(dateString, habitId, type) {
    const entry = entriesCache[dateString];
    if (!entry) return false;
    const completedHabits = entry[type] || [];
    return completedHabits.includes(habitId);
}

// Get entries for a date range
async function getEntriesForRange(startDate, endDate) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const entriesRef = collection(db, `users/${userId}/entries`);
    const q = query(
        entriesRef,
        where('date', '>=', formatDate(startDate)),
        where('date', '<=', formatDate(endDate)),
        orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const entries = {};

    snapshot.forEach((doc) => {
        const entry = { id: doc.id, ...doc.data() };
        entries[entry.date] = entry;
        entriesCache[entry.date] = entry;
    });

    return entries;
}

// Get entries for a specific month
async function getEntriesForMonth(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return await getEntriesForRange(startDate, endDate);
}

// Calculate completion stats for a date
function getCompletionStats(entry, habits) {
    const stats = {
        morning: { completed: 0, total: 0, percentage: 0 },
        evening: { completed: 0, total: 0, percentage: 0 },
        overall: { completed: 0, total: 0, percentage: 0 }
    };

    // Morning stats
    stats.morning.total = habits.morning.length;
    stats.morning.completed = entry?.morning?.length || 0;
    stats.morning.percentage = stats.morning.total > 0
        ? Math.round((stats.morning.completed / stats.morning.total) * 100)
        : 0;

    // Evening stats
    stats.evening.total = habits.evening.length;
    stats.evening.completed = entry?.evening?.length || 0;
    stats.evening.percentage = stats.evening.total > 0
        ? Math.round((stats.evening.completed / stats.evening.total) * 100)
        : 0;

    // Overall stats
    stats.overall.total = stats.morning.total + stats.evening.total;
    stats.overall.completed = stats.morning.completed + stats.evening.completed;
    stats.overall.percentage = stats.overall.total > 0
        ? Math.round((stats.overall.completed / stats.overall.total) * 100)
        : 0;

    return stats;
}

// Calculate habit completion rate for a period
function calculateHabitRate(entries, habitId, type, totalDays) {
    let completedDays = 0;

    Object.values(entries).forEach(entry => {
        const completed = entry[type] || [];
        if (completed.includes(habitId)) {
            completedDays++;
        }
    });

    return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
}

// Calculate streak
function calculateStreak(entries, habits) {
    const today = getTodayString();
    const dates = Object.keys(entries).sort().reverse();

    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
        const dateString = formatDate(currentDate);
        const entry = entries[dateString];

        // Check if day has any completions
        if (entry) {
            const morningComplete = entry.morning?.length === habits.morning.length;
            const eveningComplete = entry.evening?.length === habits.evening.length;

            if (morningComplete && eveningComplete) {
                streak++;
            } else if (streak === 0) {
                // First day doesn't need to be complete
                currentDate.setDate(currentDate.getDate() - 1);
                continue;
            } else {
                break;
            }
        } else if (streak > 0) {
            break;
        }

        currentDate.setDate(currentDate.getDate() - 1);

        // Don't go back more than 365 days
        if (streak > 365) break;
    }

    return streak;
}

// Add entry change listener
function addEntryListener(callback) {
    entryListeners.push(callback);
}

// Remove entry change listener
function removeEntryListener(callback) {
    const index = entryListeners.indexOf(callback);
    if (index > -1) {
        entryListeners.splice(index, 1);
    }
}

// Notify all listeners
function notifyListeners(dateString, entry) {
    entryListeners.forEach(callback => {
        try {
            callback(dateString, entry);
        } catch (error) {
            console.error('Entry listener error:', error);
        }
    });
}

// Clear cache
function clearCache() {
    entriesCache = {};
}

// Export functions
export {
    initEntries,
    formatDate,
    getTodayString,
    subscribeToEntry,
    getEntry,
    toggleHabit,
    setHabitCompletion,
    isHabitCompleted,
    getEntriesForRange,
    getEntriesForMonth,
    getCompletionStats,
    calculateHabitRate,
    calculateStreak,
    addEntryListener,
    removeEntryListener,
    clearCache
};
