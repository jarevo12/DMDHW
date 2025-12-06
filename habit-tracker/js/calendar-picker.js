// ========== CALENDAR PICKER ==========
// Month/day picker with completion indicators

import { getUserId } from './auth.js';
import { getFirestoreDb } from './firebase-config.js';

// Firebase Firestore functions (loaded dynamically)
let collection = null;
let getDocs = null;

// Calendar state
const calendarState = {
    isOpen: false,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    entriesData: {}
};

// Callbacks for date selection
let dateSelectCallback = null;

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Initialize calendar picker module
 */
export async function initCalendarPicker() {
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    collection = firestoreModule.collection;
    getDocs = firestoreModule.getDocs;

    // Make selectCalendarDate globally accessible for onclick handlers
    window.selectCalendarDate = selectCalendarDate;
}

/**
 * Toggle calendar picker visibility
 * @param {Date} currentDate - Currently selected date
 * @param {Function} onDateSelect - Callback when date is selected
 */
export function toggleCalendar(currentDate, onDateSelect) {
    calendarState.isOpen = !calendarState.isOpen;
    dateSelectCallback = onDateSelect;

    const picker = document.getElementById('calendar-picker');
    picker.classList.toggle('hidden', !calendarState.isOpen);
    document.getElementById('toggle-calendar').classList.toggle('active', calendarState.isOpen);

    if (calendarState.isOpen) {
        calendarState.currentMonth = currentDate.getMonth();
        calendarState.currentYear = currentDate.getFullYear();
        renderCalendar(currentDate, {});
    }
}

/**
 * Render calendar grid for the current month
 * @param {Date} currentDate - Currently selected date
 * @param {Object} habits - Habits object with morning and evening arrays
 */
export async function renderCalendar(currentDate, habits) {
    const monthDate = new Date(calendarState.currentYear, calendarState.currentMonth, 1);
    const lastDay = new Date(calendarState.currentYear, calendarState.currentMonth + 1, 0);
    const startDayOfWeek = monthDate.getDay();
    const today = formatDate(new Date());
    const selectedString = formatDate(currentDate);

    // Update month label
    document.getElementById('calendar-month-year').textContent = monthDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Fetch entries for this month
    const db = getFirestoreDb();
    const userId = getUserId();

    if (userId) {
        try {
            const entriesRef = collection(db, `users/${userId}/entries`);
            const entriesSnapshot = await getDocs(entriesRef);
            const entriesMap = {};
            entriesSnapshot.forEach(doc => {
                entriesMap[doc.id] = doc.data();
            });
            calendarState.entriesData = entriesMap;
        } catch (error) {
            console.error('Error fetching calendar entries:', error);
        }
    }

    // Build calendar grid
    const allHabits = [...(habits.morning || []), ...(habits.evening || [])];
    const totalHabits = allHabits.length;
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push('<button class="calendar-day-btn empty" disabled></button>');
    }

    // Days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateString = formatDate(new Date(calendarState.currentYear, calendarState.currentMonth, day));
        const entry = calendarState.entriesData[dateString];
        const isToday = dateString === today;
        const isSelected = dateString === selectedString;
        const isFuture = new Date(dateString) > new Date();

        let classes = 'calendar-day-btn';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';

        // Add data indicator
        if (entry && totalHabits > 0) {
            let completedCount = 0;
            allHabits.forEach(habit => {
                const type = habit.type;
                if (entry[type] && entry[type].includes(habit.id)) {
                    completedCount++;
                }
            });

            if (completedCount === totalHabits) {
                classes += ' has-data';
            } else if (completedCount > 0) {
                classes += ' partial-data';
            }
        }

        days.push(`
            <button
                class="${classes}"
                data-date="${dateString}"
                ${isFuture ? 'disabled' : ''}
                onclick="selectCalendarDate('${dateString}')"
            >
                ${day}
            </button>
        `);
    }

    document.getElementById('calendar-days').innerHTML = days.join('');

    // Disable next month if it's in the future
    const nextMonth = new Date(calendarState.currentYear, calendarState.currentMonth + 1, 1);
    const nowDate = new Date();
    const thisMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    document.getElementById('next-month').disabled = nextMonth.getTime() > thisMonth.getTime();
}

/**
 * Select a specific date (called from onclick in calendar grid)
 * @param {string} dateString - Date in YYYY-MM-DD format
 */
export function selectCalendarDate(dateString) {
    // Parse date string properly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);

    // Close calendar
    if (calendarState.isOpen) {
        calendarState.isOpen = false;
        document.getElementById('calendar-picker').classList.add('hidden');
        document.getElementById('toggle-calendar').classList.remove('active');
    }

    // Call callback with new date
    if (dateSelectCallback) {
        dateSelectCallback(newDate);
    }
}

/**
 * Navigate to previous month
 */
export function navigateToPreviousMonth() {
    calendarState.currentMonth--;
    if (calendarState.currentMonth < 0) {
        calendarState.currentMonth = 11;
        calendarState.currentYear--;
    }
}

/**
 * Navigate to next month
 */
export function navigateToNextMonth() {
    calendarState.currentMonth++;
    if (calendarState.currentMonth > 11) {
        calendarState.currentMonth = 0;
        calendarState.currentYear++;
    }
}

/**
 * Go to today's date
 */
export function goToToday() {
    const today = new Date();
    selectCalendarDate(formatDate(today));
}
