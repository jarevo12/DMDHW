// ========== MODAL MANAGEMENT ==========
// Centralized modal management for habit editor, delete confirmation, and schedule picker

import { DAY_ABBREV } from './constants.js';
import { getScheduleLabel } from './schedule.js';

// Modal state
let habitToEdit = null;
let habitToDelete = null;
let currentScheduleHabit = null;
let currentScheduleCallback = null;

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========== HABIT MODAL ==========

/**
 * Open habit modal for creating or editing a habit
 * @param {Object|null} habit - Habit to edit, or null for new habit
 * @param {string} type - 'morning' or 'evening'
 */
export function openHabitModal(habit, type) {
    habitToEdit = habit;
    document.getElementById('habit-id').value = habit?.id || '';
    document.getElementById('habit-type').value = type;
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
 * Close habit modal and reset form
 */
export function closeHabitModal() {
    habitToEdit = null;
    document.getElementById('habit-modal').classList.add('hidden');
    document.getElementById('habit-form').reset();
}

/**
 * Get current habit being edited
 */
export function getHabitToEdit() {
    return habitToEdit;
}

// ========== DELETE MODAL ==========

/**
 * Open delete confirmation modal
 * @param {string} habitId - ID of habit to delete
 */
export function openDeleteModal(habitId) {
    habitToDelete = habitId;
    document.getElementById('delete-modal').classList.remove('hidden');
}

/**
 * Close delete confirmation modal
 */
export function closeDeleteModal() {
    habitToDelete = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

/**
 * Get current habit ID to delete
 */
export function getHabitToDelete() {
    return habitToDelete;
}

// ========== SCHEDULE MODAL ==========

/**
 * Open schedule picker modal
 * @param {Object} habit - Habit with schedule property
 * @param {Function} callback - Callback to call with new schedule
 */
export function openScheduleModal(habit, callback) {
    currentScheduleHabit = habit;
    currentScheduleCallback = callback;

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
 * Close schedule picker modal
 */
export function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.add('hidden');
    currentScheduleHabit = null;
    currentScheduleCallback = null;
}

/**
 * Get current schedule callback
 */
export function getScheduleCallback() {
    return currentScheduleCallback;
}

/**
 * Render schedule options based on selected type
 * @param {Object} schedule - Current schedule object
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
                    ${DAY_ABBREV.map((name, i) => `
                        <button type="button" class="day-chip ${days.includes(i) ? 'selected' : ''}" data-day="${i}">
                            ${name}
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
            `;
            break;

        case 'interval':
            const intervalDays = schedule.intervalDays || 2;
            container.innerHTML = `
                <div class="interval-input">
                    <div class="interval-row">
                        <span>Every</span>
                        <input type="number" id="interval-days" min="2" max="30" value="${intervalDays}">
                        <span>days</span>
                    </div>
                </div>
            `;
            break;
    }
}

/**
 * Get schedule data from modal form
 * @returns {Object} Schedule object
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
            break;

        case 'interval':
            schedule.intervalDays = parseInt(document.getElementById('interval-days').value) || 2;
            schedule.intervalStartDate = formatDate(new Date());
            break;
    }

    return schedule;
}
