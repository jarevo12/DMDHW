// ========== HABITS ==========
// Functions for managing habits (CRUD operations)

import {
    getDb,
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    trackEvent
} from './firebase-init.js';
import { currentUser, habits, setHabits, setUnsubscribeHabits } from './state.js';
import { DEFAULT_MORNING_HABITS, DEFAULT_EVENING_HABITS } from './constants.js';

// Callback for when habits change (set by main.js)
let habitsChangeCallback = null;

/**
 * Set the callback function to handle habits changes
 * @param {Function} callback - Function to call when habits change
 */
export function setHabitsChangeCallback(callback) {
    habitsChangeCallback = callback;
}

/**
 * Initialize default habits for new users
 */
export async function initializeDefaultHabits() {
    const db = getDb();
    const habitsRef = collection(db, `users/${currentUser.uid}/habits`);
    const snapshot = await getDocs(habitsRef);

    if (!snapshot.empty) return; // Already has habits

    // Add default morning habits
    for (let i = 0; i < DEFAULT_MORNING_HABITS.length; i++) {
        await addDoc(habitsRef, {
            name: DEFAULT_MORNING_HABITS[i],
            type: 'morning',
            order: i + 1,
            createdAt: serverTimestamp(),
            archived: false
        });
    }

    // Add default evening habits
    for (let i = 0; i < DEFAULT_EVENING_HABITS.length; i++) {
        await addDoc(habitsRef, {
            name: DEFAULT_EVENING_HABITS[i],
            type: 'evening',
            order: i + 1,
            createdAt: serverTimestamp(),
            archived: false
        });
    }
}

/**
 * Subscribe to habits changes from Firestore
 */
export function subscribeToHabits() {
    const db = getDb();
    const habitsRef = collection(db, `users/${currentUser.uid}/habits`);
    const q = query(habitsRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newHabits = { morning: [], evening: [] };

        snapshot.forEach((doc) => {
            const habit = { id: doc.id, ...doc.data() };
            if (!habit.archived) {
                newHabits[habit.type]?.push(habit);
            }
        });

        setHabits(newHabits);

        if (habitsChangeCallback) {
            habitsChangeCallback(newHabits);
        }
    });

    setUnsubscribeHabits(unsubscribe);
}

/**
 * Add a new habit
 * @param {string} name - Habit name
 * @param {string} type - 'morning' or 'evening'
 * @param {Object} schedule - Schedule configuration
 */
export async function addHabit(name, type, schedule = { type: 'daily' }) {
    const db = getDb();
    const habitsRef = collection(db, `users/${currentUser.uid}/habits`);
    const maxOrder = habits[type].length > 0
        ? Math.max(...habits[type].map(h => h.order || 0))
        : 0;

    await addDoc(habitsRef, {
        name: name.trim(),
        type: type,
        order: maxOrder + 1,
        schedule: schedule,
        createdAt: serverTimestamp(),
        archived: false
    });

    // Track habit creation
    trackEvent('habit_created', {
        type: type,
        schedule_type: schedule.type,
        is_default: false
    });
}

/**
 * Update an existing habit
 * @param {string} habitId - Habit document ID
 * @param {string} name - New habit name
 * @param {Object} schedule - New schedule configuration
 */
export async function updateHabit(habitId, name, schedule) {
    const db = getDb();
    const habitRef = doc(db, `users/${currentUser.uid}/habits`, habitId);
    await updateDoc(habitRef, {
        name: name.trim(),
        schedule: schedule
    });

    // Track habit update
    trackEvent('habit_updated', {
        habitId: habitId,
        schedule_type: schedule.type
    });
}

/**
 * Delete (archive) a habit
 * @param {string} habitId - Habit document ID
 */
export async function deleteHabit(habitId) {
    const db = getDb();
    const habitRef = doc(db, `users/${currentUser.uid}/habits`, habitId);

    // Find the habit to get its type before archiving
    const habit = [...habits.morning, ...habits.evening].find(h => h.id === habitId);

    await updateDoc(habitRef, { archived: true });

    // Track habit deletion
    if (habit) {
        trackEvent('habit_deleted', {
            type: habit.type,
            habitId: habitId
        });
    }
}

/**
 * Save new order for habits after drag and drop
 * @param {string} type - 'morning' or 'evening'
 * @param {Array} orderedHabits - Array of habits in new order
 */
export async function saveHabitOrder(type, orderedHabits) {
    const db = getDb();
    const batch = writeBatch(db);

    orderedHabits.forEach((habit, index) => {
        const habitRef = doc(db, `users/${currentUser.uid}/habits`, habit.id);
        batch.update(habitRef, { order: index + 1 });
    });

    await batch.commit();

    // Track habit reordering
    trackEvent('habits_reordered', {
        type: type,
        count: orderedHabits.length
    });
}

/**
 * Get habits for a specific type
 * @param {string} type - 'morning' or 'evening'
 * @returns {Array} Array of habits
 */
export function getHabitsByType(type) {
    return habits[type] || [];
}

/**
 * Get all habits
 * @returns {Object} Object with morning and evening arrays
 */
export function getAllHabits() {
    return habits;
}
