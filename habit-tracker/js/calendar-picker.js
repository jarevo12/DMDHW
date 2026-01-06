// ========== CALENDAR PICKER ==========
// Functions for the date picker calendar

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser, currentDate, calendarState, setCalendarState, setCurrentDate, accountCreatedAt } from './state.js';
import { formatDate } from './utils.js';
import { subscribeToEntry } from './entries.js';
import { updateDateDisplay } from './ui/progress.js';
import { renderHabits } from './ui/habits-ui.js';

/**
 * Render the calendar picker for date selection
 */
export async function renderTodayCalendar() {
    const db = getDb();
    const monthDate = new Date(calendarState.currentYear, calendarState.currentMonth, 1);
    const lastDay = new Date(calendarState.currentYear, calendarState.currentMonth + 1, 0);
    const startDayOfWeek = monthDate.getDay();
    const today = formatDate(new Date());
    const selectedString = formatDate(currentDate);
    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationDateValid = creationDate && !Number.isNaN(creationDate.getTime());
    const creationDateOnly = creationDateValid
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate())
        : null;
    const earliestMonthDate = creationDateValid
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), 1)
        : null;

    // Update month label
    const monthYearEl = document.getElementById('calendar-month-year');
    if (monthYearEl) {
        monthYearEl.textContent = monthDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }

    // Fetch entries for this month
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);
    const entriesMap = {};
    entriesSnapshot.forEach(doc => {
        entriesMap[doc.id] = doc.data();
    });
    setCalendarState({ entriesData: entriesMap });

    // Build calendar grid
    const allHabits = [...habits.morning, ...habits.evening];
    const totalHabits = allHabits.length;
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push('<button class="calendar-day-btn empty" disabled></button>');
    }

    // Days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateObj = new Date(calendarState.currentYear, calendarState.currentMonth, day);
        const dateString = formatDate(dateObj);
        const entry = entriesMap[dateString];
        const isToday = dateString === today;
        const isSelected = dateString === selectedString;
        const isBeforeCreation = creationDateOnly ? dateObj < creationDateOnly : false;

        let classes = 'calendar-day-btn';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (isBeforeCreation) classes += ' before-account';

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
                ${isBeforeCreation ? 'disabled' : ''}
                onclick="window.selectCalendarDate('${dateString}')"
            >
                ${day}
            </button>
        `);
    }

    const calendarDaysEl = document.getElementById('calendar-days');
    if (calendarDaysEl) {
        calendarDaysEl.innerHTML = days.join('');
    }

    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.disabled = false;
    }

    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        if (!earliestMonthDate) {
            prevMonthBtn.disabled = false;
        } else {
            const currentMonthDate = new Date(calendarState.currentYear, calendarState.currentMonth, 1);
            prevMonthBtn.disabled = currentMonthDate <= earliestMonthDate;
        }
    }
}

/**
 * Select a date from the calendar picker
 * @param {string} dateString - Date in YYYY-MM-DD format
 */
export function selectCalendarDate(dateString) {
    // Fix: Parse manually to avoid UTC timezone shift
    const [y, m, d] = dateString.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, d));

    updateDateDisplay();
    renderHabits();
    subscribeToEntry();

    // Close calendar
    if (calendarState.isOpen) {
        setCalendarState({ isOpen: false });
        const calendarPicker = document.getElementById('calendar-picker');
        const toggleBtn = document.getElementById('toggle-calendar');
        if (calendarPicker) calendarPicker.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
    }
}

/**
 * Navigate to previous month
 */
export function previousMonth() {
    let newMonth = calendarState.currentMonth - 1;
    let newYear = calendarState.currentYear;

    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    }

    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationDateValid = creationDate && !Number.isNaN(creationDate.getTime());
    const earliestMonthDate = creationDateValid
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), 1)
        : null;
    const candidateMonthDate = new Date(newYear, newMonth, 1);
    if (earliestMonthDate && candidateMonthDate < earliestMonthDate) {
        return;
    }

    setCalendarState({
        currentMonth: newMonth,
        currentYear: newYear
    });

    renderTodayCalendar();
}

/**
 * Navigate to next month
 */
export function nextMonth() {
    let newMonth = calendarState.currentMonth + 1;
    let newYear = calendarState.currentYear;

    if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }

    setCalendarState({
        currentMonth: newMonth,
        currentYear: newYear
    });

    renderTodayCalendar();
}

/**
 * Toggle the calendar picker visibility
 */
export function toggleCalendar() {
    const isOpen = !calendarState.isOpen;
    setCalendarState({ isOpen });

    const calendarPicker = document.getElementById('calendar-picker');
    const toggleBtn = document.getElementById('toggle-calendar');

    if (isOpen) {
        if (calendarPicker) calendarPicker.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');
        renderTodayCalendar();
    } else {
        if (calendarPicker) calendarPicker.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
    }
}

// Make selectCalendarDate globally accessible for onclick handlers
window.selectCalendarDate = selectCalendarDate;
