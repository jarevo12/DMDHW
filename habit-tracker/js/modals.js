// ========== MODALS ==========
// Functions for managing modal dialogs

import { currentScheduleHabit, currentScheduleCallback, setCurrentScheduleHabit, setCurrentScheduleCallback } from './state.js';
import { getScheduleLabel } from './schedule.js';
import { formatDate } from './utils.js';
import { DAY_NAMES } from './constants.js';

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Module-level state for modals
let habitToEdit = null;
let habitToDelete = null;

// Callback for delete confirmation (set by main.js)
let confirmDeleteCallback = null;

/**
 * Set the callback for delete confirmation
 * @param {Function} callback - Function to call when delete is confirmed
 */
export function setConfirmDeleteCallback(callback) {
    confirmDeleteCallback = callback;
}

/**
 * Get the habit being edited
 * @returns {Object|null} Habit object or null
 */
export function getHabitToEdit() {
    return habitToEdit;
}

/**
 * Get the habit ID being deleted
 * @returns {string|null} Habit ID or null
 */
export function getHabitToDelete() {
    return habitToDelete;
}

/**
 * Open the habit edit/add modal
 * @param {Object|null} habit - Habit to edit, or null for new habit
 * @param {string} type - 'morning' or 'evening'
 */
export function openHabitModal(habit, type) {
    habitToEdit = habit;
    document.getElementById('habit-id').value = habit?.id || '';
    document.getElementById('habit-type').value = type || 'morning';
    document.getElementById('habit-name').value = habit?.name || '';
    document.getElementById('modal-title').textContent = habit ? 'Edit Habit' : 'Add Habit';

    // Set schedule
    const schedule = habit?.schedule || { type: 'daily' };
    document.getElementById('habit-schedule').value = JSON.stringify(schedule);
    document.getElementById('habit-schedule-btn').textContent = getScheduleLabel(schedule);

    document.getElementById('habit-modal').classList.remove('hidden');
    document.getElementById('habit-name').focus();
}

/**
 * Close the habit modal
 */
export function closeHabitModal() {
    habitToEdit = null;
    document.getElementById('habit-modal').classList.add('hidden');
    document.getElementById('habit-form').reset();
}

/**
 * Open the delete confirmation modal
 * @param {string} habitId - ID of habit to delete
 */
export function openDeleteModal(habitId) {
    habitToDelete = habitId;
    document.getElementById('delete-modal').classList.remove('hidden');
}

/**
 * Close the delete modal
 */
export function closeDeleteModal() {
    habitToDelete = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

/**
 * Confirm and execute the delete
 */
export async function confirmDelete() {
    if (habitToDelete && confirmDeleteCallback) {
        await confirmDeleteCallback(habitToDelete);
    }
    closeDeleteModal();
}

// ========== SCHEDULE MODAL ==========

/**
 * Open the schedule selection modal
 * @param {Object} habit - Habit with current schedule
 * @param {Function} callback - Function to call with new schedule
 */
export function openScheduleModal(habit, callback) {
    setCurrentScheduleHabit(habit);
    setCurrentScheduleCallback(callback);

    const modal = document.getElementById('schedule-modal');
    modal.classList.remove('hidden');

    // Set active type
    const schedule = habit.schedule || { type: 'daily' };
    document.querySelectorAll('.schedule-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === schedule.type);
    });

    renderScheduleOptions(schedule);
}

/**
 * Close the schedule modal
 */
export function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.add('hidden');
    setCurrentScheduleHabit(null);
    setCurrentScheduleCallback(null);
}

/**
 * Render schedule options based on selected type
 * @param {Object} schedule - Current schedule configuration
 */
export function renderScheduleOptions(schedule) {
    const container = document.getElementById('schedule-options');
    const type = schedule.type || 'daily';

    switch (type) {
        case 'daily':
            container.innerHTML = `
                <p>This habit will be tracked every day</p>
            `;
            break;

        case 'specific_days':
            const days = schedule.days || [1, 2, 3, 4, 5]; // Default to weekdays
            container.innerHTML = `
                <p>Select which days to track this habit</p>
                <div class="day-selector">
                    ${WEEKDAY_ORDER.map((dayIndex) => `
                        <button class="day-chip ${days.includes(dayIndex) ? 'selected' : ''}" data-day="${dayIndex}">
                            ${DAY_NAMES[dayIndex].substring(0, 3)}
                        </button>
                    `).join('')}
                </div>
            `;
            // Add click listeners
            container.querySelectorAll('.day-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chip.classList.toggle('selected');
                });
            });
            break;

        case 'weekly_goal':
            const times = schedule.timesPerWeek || 3;
            const weeklyGoalStart = resolveWeeklyGoalStartDate(schedule);
            container.innerHTML = `
                <p>How many times per week?</p>
                <div class="weekly-goal-input">
                    <span>Complete</span>
                    <select id="times-per-week">
                        ${[1,2,3,4,5,6,7].map(n => `
                            <option value="${n}" ${n === times ? 'selected' : ''}>${n}</option>
                        `).join('')}
                    </select>
                    <span>times per week</span>
                </div>
                <div class="interval-row">
                    <span>Start date</span>
                    <button type="button" class="btn btn-secondary interval-date-btn" id="weekly-goal-start-date-btn">Pick date</button>
                    <span class="interval-date-value" id="weekly-goal-start-date-label">${weeklyGoalStart}</span>
                    <input type="hidden" id="weekly-goal-start-date" value="${weeklyGoalStart}">
                </div>
                <div id="weekly-goal-calendar" class="interval-calendar hidden">
                    <div class="interval-calendar-header">
                        <button type="button" class="btn-icon weekly-goal-cal-prev" aria-label="Previous month">
                            <span>&#8249;</span>
                        </button>
                        <span class="interval-calendar-label" id="weekly-goal-calendar-label"></span>
                        <button type="button" class="btn-icon weekly-goal-cal-next" aria-label="Next month">
                            <span>&#8250;</span>
                        </button>
                    </div>
                    <div class="interval-calendar-weekdays">
                        ${WEEKDAY_ORDER.map((dayIndex) => `<span>${DAY_NAMES[dayIndex].substring(0, 2)}</span>`).join('')}
                    </div>
                    <div class="interval-calendar-grid" id="weekly-goal-calendar-grid"></div>
                </div>
            `;
            setupWeeklyGoalCalendar(weeklyGoalStart);
            break;

        case 'interval':
            const intervalDays = schedule.intervalDays || 2;
            const intervalStartDate = schedule.intervalStartDate || formatDate(new Date());
            const skipDays = schedule.intervalSkipDays || [];
            container.innerHTML = `
                <div class="interval-input">
                    <div class="interval-row">
                        <span>Every</span>
                        <input type="number" id="interval-days" min="2" max="30" value="${intervalDays}">
                        <span>days</span>
                    </div>
                    <div class="interval-row">
                        <span>Start date</span>
                        <button type="button" class="btn btn-secondary interval-date-btn" id="interval-start-date-btn">Pick date</button>
                        <span class="interval-date-value" id="interval-start-date-label">${intervalStartDate}</span>
                        <input type="hidden" id="interval-start-date" value="${intervalStartDate}">
                    </div>
                    <div id="interval-calendar" class="interval-calendar hidden">
                        <div class="interval-calendar-header">
                            <button type="button" class="btn-icon interval-cal-prev" aria-label="Previous month">
                                <span>&#8249;</span>
                            </button>
                            <span class="interval-calendar-label" id="interval-calendar-label"></span>
                            <button type="button" class="btn-icon interval-cal-next" aria-label="Next month">
                                <span>&#8250;</span>
                            </button>
                        </div>
                        <div class="interval-calendar-weekdays">
                            ${WEEKDAY_ORDER.map((dayIndex) => `<span>${DAY_NAMES[dayIndex].substring(0, 2)}</span>`).join('')}
                        </div>
                        <div class="interval-calendar-grid" id="interval-calendar-grid"></div>
                    </div>
                    <div class="interval-row">
                        <span>Skip days</span>
                        <div class="day-selector interval-skip-days">
                            ${WEEKDAY_ORDER.map((dayIndex) => `
                                <button class="day-chip ${skipDays.includes(dayIndex) ? 'selected' : ''}" data-day="${dayIndex}">
                                    ${DAY_NAMES[dayIndex].substring(0, 3)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            container.querySelectorAll('.interval-skip-days .day-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chip.classList.toggle('selected');
                });
            });
            setupIntervalCalendar(intervalStartDate);
            break;
    }
}

/**
 * Get the schedule configuration from the modal
 * @returns {Object} Schedule configuration
 */
export function getScheduleFromModal() {
    const activeType = document.querySelector('.schedule-type-btn.active').dataset.type;
    const schedule = { type: activeType };

    switch (activeType) {
        case 'specific_days':
            schedule.days = Array.from(document.querySelectorAll('.day-chip.selected'))
                .map(chip => parseInt(chip.dataset.day));
            if (schedule.days.length === 0) {
                schedule.days = [0,1,2,3,4,5,6]; // Default to all days if none selected
            }
            break;

        case 'weekly_goal':
            schedule.timesPerWeek = parseInt(document.getElementById('times-per-week').value) || 3;
            schedule.weeklyGoalStartDate = document.getElementById('weekly-goal-start-date')?.value || formatDate(new Date());
            break;

        case 'interval':
            schedule.intervalDays = parseInt(document.getElementById('interval-days').value) || 2;
            schedule.intervalStartDate = document.getElementById('interval-start-date')?.value || formatDate(new Date());
            schedule.intervalSkipDays = Array.from(document.querySelectorAll('.interval-skip-days .day-chip.selected'))
                .map(chip => parseInt(chip.dataset.day));
            break;
    }

    return schedule;
}

/**
 * Save the schedule from modal and call the callback
 */
export function saveScheduleFromModal() {
    const schedule = getScheduleFromModal();
    const callback = currentScheduleCallback;

    closeScheduleModal();

    if (callback) {
        callback(schedule);
    }
}

function setupIntervalCalendar(initialDate) {
    const calendarEl = document.getElementById('interval-calendar');
    const gridEl = document.getElementById('interval-calendar-grid');
    const labelEl = document.getElementById('interval-calendar-label');
    const prevBtn = document.querySelector('.interval-cal-prev');
    const nextBtn = document.querySelector('.interval-cal-next');
    const toggleBtn = document.getElementById('interval-start-date-btn');
    const valueInput = document.getElementById('interval-start-date');
    const valueLabel = document.getElementById('interval-start-date-label');
    if (!calendarEl || !gridEl || !labelEl || !prevBtn || !nextBtn || !toggleBtn || !valueInput || !valueLabel) {
        return;
    }

    let selectedDate = initialDate || formatDate(new Date());
    let current = new Date(selectedDate + 'T00:00:00');
    if (Number.isNaN(current.getTime())) {
        current = new Date();
        selectedDate = formatDate(current);
    }

    const renderCalendar = () => {
        const year = current.getFullYear();
        const month = current.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDay = (monthStart.getDay() + 6) % 7;
        labelEl.textContent = monthStart.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const cells = [];
        for (let i = 0; i < startDay; i++) {
            cells.push('<span class="interval-calendar-cell empty"></span>');
        }
        for (let day = 1; day <= monthEnd.getDate(); day++) {
            const dateString = formatDate(new Date(year, month, day));
            const isSelected = dateString === selectedDate;
            cells.push(`
                <button type="button" class="interval-calendar-day${isSelected ? ' selected' : ''}" data-date="${dateString}">
                    ${day}
                </button>
            `);
        }
        gridEl.innerHTML = cells.join('');

        gridEl.querySelectorAll('.interval-calendar-day').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedDate = btn.dataset.date;
                valueInput.value = selectedDate;
                valueLabel.textContent = selectedDate;
                calendarEl.classList.add('hidden');
                renderCalendar();
            });
        });
    };

    toggleBtn.addEventListener('click', () => {
        calendarEl.classList.toggle('hidden');
        renderCalendar();
    });

    prevBtn.addEventListener('click', () => {
        current.setMonth(current.getMonth() - 1);
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        current.setMonth(current.getMonth() + 1);
        renderCalendar();
    });

    valueInput.value = selectedDate;
    valueLabel.textContent = selectedDate;
    renderCalendar();
}

function resolveWeeklyGoalStartDate(schedule) {
    if (schedule.weeklyGoalStartDate) return schedule.weeklyGoalStartDate;
    if (currentScheduleHabit?.schedule?.weeklyGoalStartDate) {
        return currentScheduleHabit.schedule.weeklyGoalStartDate;
    }
    const createdAt = currentScheduleHabit?.createdAt;
    const createdDate = parseDateValue(createdAt);
    return createdDate ? formatDate(createdDate) : formatDate(new Date());
}

function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
    }
    if (typeof value.seconds === 'number') {
        const date = new Date(value.seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function setupWeeklyGoalCalendar(initialDate) {
    const calendarEl = document.getElementById('weekly-goal-calendar');
    const gridEl = document.getElementById('weekly-goal-calendar-grid');
    const labelEl = document.getElementById('weekly-goal-calendar-label');
    const prevBtn = document.querySelector('.weekly-goal-cal-prev');
    const nextBtn = document.querySelector('.weekly-goal-cal-next');
    const toggleBtn = document.getElementById('weekly-goal-start-date-btn');
    const valueInput = document.getElementById('weekly-goal-start-date');
    const valueLabel = document.getElementById('weekly-goal-start-date-label');
    if (!calendarEl || !gridEl || !labelEl || !prevBtn || !nextBtn || !toggleBtn || !valueInput || !valueLabel) {
        return;
    }

    let selectedDate = initialDate || formatDate(new Date());
    let current = new Date(selectedDate + 'T00:00:00');
    if (Number.isNaN(current.getTime())) {
        current = new Date();
        selectedDate = formatDate(current);
    }

    const renderCalendar = () => {
        const year = current.getFullYear();
        const month = current.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDay = (monthStart.getDay() + 6) % 7;
        labelEl.textContent = monthStart.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const cells = [];
        for (let i = 0; i < startDay; i++) {
            cells.push('<span class="interval-calendar-cell empty"></span>');
        }
        for (let day = 1; day <= monthEnd.getDate(); day++) {
            const dateString = formatDate(new Date(year, month, day));
            const isSelected = dateString === selectedDate;
            cells.push(`
                <button type="button" class="interval-calendar-day${isSelected ? ' selected' : ''}" data-date="${dateString}">
                    ${day}
                </button>
            `);
        }
        gridEl.innerHTML = cells.join('');

        gridEl.querySelectorAll('.interval-calendar-day').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedDate = btn.dataset.date;
                valueInput.value = selectedDate;
                valueLabel.textContent = selectedDate;
                calendarEl.classList.add('hidden');
                renderCalendar();
            });
        });
    };

    toggleBtn.addEventListener('click', () => {
        calendarEl.classList.toggle('hidden');
        renderCalendar();
    });

    prevBtn.addEventListener('click', () => {
        current.setMonth(current.getMonth() - 1);
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        current.setMonth(current.getMonth() + 1);
        renderCalendar();
    });

    valueInput.value = selectedDate;
    valueLabel.textContent = selectedDate;
    renderCalendar();
}
