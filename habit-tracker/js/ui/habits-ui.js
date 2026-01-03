// ========== HABITS UI ==========
// Functions for rendering the habits list in the main view

import { habits, currentDate, currentEntry, currentTab } from '../state.js';
import { formatDate, escapeHtml } from '../utils.js';
import { getScheduledHabitsForDate, getUnscheduledHabitsForDate, getScheduleLabel } from '../schedule.js';
import { toggleHabit } from '../entries.js';

/**
 * Render all habits for the current date
 */
export function renderHabits() {
    const dateString = formatDate(currentDate);
    const scheduled = getScheduledHabitsForDate(habits, dateString);
    const unscheduled = getUnscheduledHabitsForDate(habits, dateString);

    // Render scheduled habits
    renderHabitList('morning-habits', scheduled.morning, 'morning');
    renderHabitList('evening-habits', scheduled.evening, 'evening');

    // Render Not Today section
    renderNotTodaySection(unscheduled, currentTab);
}

/**
 * Render a list of habits in a container
 * @param {string} containerId - DOM element ID
 * @param {Array} habitList - Array of habits to render
 * @param {string} type - 'morning' or 'evening'
 */
function renderHabitList(containerId, habitList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (habitList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${type === 'morning' ? '&#9788;' : '&#9790;'}</div>
                <p>No ${type} habits scheduled</p>
            </div>
        `;
        return;
    }

    container.innerHTML = habitList.map((habit, index) => `
        <div class="habit-item opt-d ${type === 'morning' ? 'opt-d-morning' : 'opt-d-evening'}" data-id="${habit.id}" data-type="${type}">
            <div class="fill-layer"></div>
            <div class="habit-icon"></div>
            <div class="habit-text">
                <span class="habit-number">${index + 1}.</span>
                <span class="habit-label">${escapeHtml(habit.name)}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.habit-item').forEach(item => {
        item.addEventListener('click', async () => {
            const habitId = item.dataset.id;
            const habitType = item.dataset.type;
            item.classList.add('completing');
            await toggleHabit(habitId, habitType);
            setTimeout(() => item.classList.remove('completing'), 300);
        });
    });

    updateHabitCheckmarks();
}

/**
 * Render the "Not Today" section for unscheduled habits
 * @param {Object} unscheduled - Object with morning and evening arrays
 */
function renderNotTodaySection(unscheduled, activeTab) {
    const section = document.getElementById('not-today-section');
    const container = document.getElementById('not-today-habits');
    const countEl = document.querySelector('.not-today-count');

    if (!section || !container) return;

    const isEvening = activeTab === 'evening';
    const list = isEvening ? unscheduled.evening : unscheduled.morning;
    const label = isEvening ? 'Evening' : 'Morning';
    const icon = isEvening ? '&#9790;' : '&#9788;';

    if (list.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    if (countEl) countEl.textContent = `(${list.length})`;

    container.innerHTML = `
        <div class="not-today-type">
            <span class="type-label">${icon} ${label}</span>
            ${list.map(habit => `
                <div class="not-today-habit">
                    <span class="habit-name">${escapeHtml(habit.name)}</span>
                    <span class="schedule-badge">${getScheduleLabel(habit.schedule)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Update checkmarks on habit items based on completion status
 */
export function updateHabitCheckmarks() {
    if (!currentEntry) return;

    document.querySelectorAll('.habit-item').forEach(item => {
        const habitId = item.dataset.id;
        const type = item.dataset.type;
        const completed = currentEntry[type] || [];
        item.classList.toggle('completed', completed.includes(habitId));
    });
}
