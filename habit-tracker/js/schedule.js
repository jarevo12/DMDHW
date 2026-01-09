// ========== SCHEDULE UTILITIES ==========
// Functions for handling habit scheduling logic

import { DAY_NAMES } from './constants.js';

/**
 * Check if a habit is scheduled for a specific date
 * @param {Object} habit - The habit object with schedule property
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} True if habit is scheduled for the date
 */
export function isHabitScheduledForDate(habit, dateString) {
    const schedule = habit.schedule || { type: 'daily' };
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0-6 (Sun-Sat)

    switch (schedule.type) {
        case 'daily':
            return true;

        case 'specific_days':
            return (schedule.days || [0,1,2,3,4,5,6]).includes(dayOfWeek);

        case 'weekly_goal':
            // For weekly goal, always show - tracking is separate
            return true;

        case 'interval':
            const interval = schedule.intervalDays || 1;
            const skipDays = schedule.intervalSkipDays || [];
            if (skipDays.length >= 7) return false;

            const startDateValue = schedule.intervalStartDate || dateString;
            const startDate = new Date(startDateValue + 'T00:00:00');
            if (Number.isNaN(startDate.getTime())) return false;

            let effectiveStart = new Date(startDate);
            while (skipDays.includes(effectiveStart.getDay())) {
                effectiveStart.setDate(effectiveStart.getDate() + 1);
            }

            if (date < effectiveStart) return false;
            if (skipDays.includes(dayOfWeek)) return false;

            let eligibleDays = 0;
            const cursor = new Date(effectiveStart);
            while (cursor <= date) {
                if (!skipDays.includes(cursor.getDay())) {
                    eligibleDays++;
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            if (eligibleDays === 0) return false;
            return (eligibleDays - 1) % interval === 0;

        default:
            return true;
    }
}

/**
 * Get habits scheduled for a specific date
 * @param {Object} allHabits - Object with morning and evening habit arrays
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Object} Object with filtered morning and evening arrays
 */
export function getScheduledHabitsForDate(allHabits, dateString) {
    return {
        morning: allHabits.morning.filter(h => isHabitScheduledForDate(h, dateString)),
        evening: allHabits.evening.filter(h => isHabitScheduledForDate(h, dateString))
    };
}

/**
 * Get habits NOT scheduled for a specific date
 * @param {Object} allHabits - Object with morning and evening habit arrays
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Object} Object with filtered morning and evening arrays
 */
export function getUnscheduledHabitsForDate(allHabits, dateString) {
    return {
        morning: allHabits.morning.filter(h => !isHabitScheduledForDate(h, dateString)),
        evening: allHabits.evening.filter(h => !isHabitScheduledForDate(h, dateString))
    };
}

/**
 * Get human-readable label for a schedule
 * @param {Object} schedule - The schedule object
 * @returns {string} Human-readable schedule description
 */
export function getScheduleLabel(schedule) {
    if (!schedule) return 'Daily';

    switch (schedule.type) {
        case 'daily':
            return 'Daily';
        case 'specific_days':
            const days = schedule.days || [];
            if (days.length === 7) return 'Daily';
            if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
                return 'Weekdays';
            }
            if (days.length === 2 && days.includes(0) && days.includes(6)) {
                return 'Weekends';
            }
            return days.map(d => DAY_NAMES[d].substring(0, 3)).join(', ');
        case 'weekly_goal':
            const startLabel = schedule.weeklyGoalStartDate ? ` from ${schedule.weeklyGoalStartDate}` : '';
            return `${schedule.timesPerWeek}x/week${startLabel}`;
        case 'interval':
            const intervalDays = schedule.intervalDays || 1;
            const intervalStart = schedule.intervalStartDate;
            const skip = schedule.intervalSkipDays || [];
            const skipLabel = skip.length
                ? `, skip ${skip.map(d => DAY_NAMES[d].substring(0, 3)).join('/')}`
                : '';
            return `Every ${intervalDays} days${intervalStart ? ` from ${intervalStart}` : ''}${skipLabel}`;
        default:
            return 'Daily';
    }
}

/**
 * Calculate expected completions for a habit in a given month
 * @param {Object} habit - The habit object
 * @param {number} year - The year
 * @param {number} month - The month (0-11)
 * @returns {number} Expected number of completions
 */
export function getExpectedCompletionsForMonth(habit, year, month) {
    const schedule = habit.schedule || { type: 'daily' };
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    let expected = 0;

    for (let day = 1; day <= lastDay; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (isHabitScheduledForDate(habit, dateString)) {
            expected++;
        }
    }

    // For weekly goal, cap at target per week
    if (schedule.type === 'weekly_goal') {
        const weeksInPeriod = Math.ceil(lastDay / 7);
        expected = Math.min(expected, weeksInPeriod * (schedule.timesPerWeek || 3));
    }

    return expected;
}
