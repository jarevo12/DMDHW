// Habits Management Module
import { getFirestoreDb } from './firebase-config.js';
import { getUserId } from './auth.js';

// Firebase Firestore functions
let collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, writeBatch;

// Local cache of habits
let habitsCache = {
    morning: [],
    evening: []
};

// Listeners for habit changes
const habitListeners = [];

// Default habits from user's Excel file
const DEFAULT_MORNING_HABITS = [
    "Stop alarm without snooze and get up",
    "Go to bathroom and wash face with soap",
    "Eat protein bar/fruit",
    "Look phone (only messages)",
    "5-10 minute stretching & get changed",
    "Go to the gym",
    "Complete scheduled gym session",
    "Go home, prepare breakfast & have shower",
    "Eat breakfast + phone (social/news)",
    "Get changed & go to uni"
];

const DEFAULT_EVENING_HABITS = [
    "Send messages to Adri",
    "Check calendar + gym session next day",
    "Set up alarm & Airplane mode",
    "Prepare bag & clothes for next day",
    "Wash face + apply Roche Possay",
    "Take pill",
    "Read 5-10 pages book",
    "Turn lights off"
];

// Initialize habits module
async function initHabits() {
    // Import Firestore functions
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    collection = firestoreModule.collection;
    doc = firestoreModule.doc;
    getDocs = firestoreModule.getDocs;
    addDoc = firestoreModule.addDoc;
    updateDoc = firestoreModule.updateDoc;
    deleteDoc = firestoreModule.deleteDoc;
    query = firestoreModule.query;
    orderBy = firestoreModule.orderBy;
    onSnapshot = firestoreModule.onSnapshot;
    serverTimestamp = firestoreModule.serverTimestamp;
    writeBatch = firestoreModule.writeBatch;

    return true;
}

// Set up real-time listener for habits
function subscribeToHabits(callback) {
    const userId = getUserId();
    if (!userId) {
        console.error('No user ID available');
        return () => {};
    }

    const db = getFirestoreDb();
    const habitsRef = collection(db, `users/${userId}/habits`);
    const q = query(habitsRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const habits = {
            morning: [],
            evening: []
        };

        snapshot.forEach((doc) => {
            const habit = { id: doc.id, ...doc.data() };
            if (!habit.archived) {
                if (habit.type === 'morning') {
                    habits.morning.push(habit);
                } else if (habit.type === 'evening') {
                    habits.evening.push(habit);
                }
            }
        });

        // Sort by order
        habits.morning.sort((a, b) => a.order - b.order);
        habits.evening.sort((a, b) => a.order - b.order);

        habitsCache = habits;
        notifyListeners(habits);
        if (callback) callback(habits);
    }, (error) => {
        console.error('Habits subscription error:', error);
    });

    return unsubscribe;
}

// Get all habits (from cache)
function getHabits() {
    return habitsCache;
}

// Get habits by type
function getHabitsByType(type) {
    return habitsCache[type] || [];
}

// Get habit by ID
function getHabitById(habitId) {
    const allHabits = [...habitsCache.morning, ...habitsCache.evening];
    return allHabits.find(h => h.id === habitId) || null;
}

// Add a new habit
async function addHabit(name, type) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const habitsRef = collection(db, `users/${userId}/habits`);

    // Get current max order for this type
    const existingHabits = habitsCache[type] || [];
    const maxOrder = existingHabits.length > 0
        ? Math.max(...existingHabits.map(h => h.order || 0))
        : 0;

    const habitData = {
        name: name.trim(),
        type: type,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
        archived: false
    };

    const docRef = await addDoc(habitsRef, habitData);
    return { id: docRef.id, ...habitData };
}

// Update a habit
async function updateHabit(habitId, updates) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const habitRef = doc(db, `users/${userId}/habits`, habitId);

    await updateDoc(habitRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });

    return true;
}

// Delete (archive) a habit
async function deleteHabit(habitId) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const habitRef = doc(db, `users/${userId}/habits`, habitId);

    // Archive instead of delete to preserve historical data
    await updateDoc(habitRef, {
        archived: true,
        archivedAt: serverTimestamp()
    });

    return true;
}

// Permanently delete a habit
async function permanentlyDeleteHabit(habitId) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const habitRef = doc(db, `users/${userId}/habits`, habitId);

    await deleteDoc(habitRef);
    return true;
}

// Reorder habits
async function reorderHabits(type, habitIds) {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const batch = writeBatch(db);

    habitIds.forEach((habitId, index) => {
        const habitRef = doc(db, `users/${userId}/habits`, habitId);
        batch.update(habitRef, { order: index + 1 });
    });

    await batch.commit();
    return true;
}

// Initialize default habits for new user
async function initializeDefaultHabits() {
    const userId = getUserId();
    if (!userId) throw new Error('Not authenticated');

    const db = getFirestoreDb();
    const habitsRef = collection(db, `users/${userId}/habits`);

    // Check if user already has habits
    const snapshot = await getDocs(habitsRef);
    if (!snapshot.empty) {
        return false; // User already has habits
    }

    // Create default morning habits
    for (let i = 0; i < DEFAULT_MORNING_HABITS.length; i++) {
        await addDoc(habitsRef, {
            name: DEFAULT_MORNING_HABITS[i],
            type: 'morning',
            order: i + 1,
            createdAt: serverTimestamp(),
            archived: false
        });
    }

    // Create default evening habits
    for (let i = 0; i < DEFAULT_EVENING_HABITS.length; i++) {
        await addDoc(habitsRef, {
            name: DEFAULT_EVENING_HABITS[i],
            type: 'evening',
            order: i + 1,
            createdAt: serverTimestamp(),
            archived: false
        });
    }

    return true;
}

// Add habit change listener
function addHabitListener(callback) {
    habitListeners.push(callback);
}

// Remove habit change listener
function removeHabitListener(callback) {
    const index = habitListeners.indexOf(callback);
    if (index > -1) {
        habitListeners.splice(index, 1);
    }
}

// Notify all listeners
function notifyListeners(habits) {
    habitListeners.forEach(callback => {
        try {
            callback(habits);
        } catch (error) {
            console.error('Habit listener error:', error);
        }
    });
}

// Export functions
export {
    initHabits,
    subscribeToHabits,
    getHabits,
    getHabitsByType,
    getHabitById,
    addHabit,
    updateHabit,
    deleteHabit,
    permanentlyDeleteHabit,
    reorderHabits,
    initializeDefaultHabits,
    addHabitListener,
    removeHabitListener,
    DEFAULT_MORNING_HABITS,
    DEFAULT_EVENING_HABITS
};
