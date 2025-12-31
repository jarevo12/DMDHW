// ========== HABITS UI ==========
// Functions for rendering the habits list in the main view

import { habits, currentDate, currentEntry } from '../state.js';
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
    renderNotTodaySection(unscheduled);
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

    container.innerHTML = habitList.map(habit => `
        <div class="habit-item" data-id="${habit.id}" data-type="${type}">
            <div class="habit-checkbox"></div>
            <span class="habit-name">${escapeHtml(habit.name)}</span>
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
function renderNotTodaySection(unscheduled) {
    const section = document.getElementById('not-today-section');
    const container = document.getElementById('not-today-habits');
    const countEl = document.querySelector('.not-today-count');

    if (!section || !container) return;

    const totalUnscheduled = unscheduled.morning.length + unscheduled.evening.length;

    if (totalUnscheduled === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    if (countEl) countEl.textContent = `(${totalUnscheduled})`;

    let html = '';

    if (unscheduled.morning.length > 0) {
        html += `
            <div class="not-today-type">
                <span class="type-label">&#9788; Morning</span>
                ${unscheduled.morning.map(habit => `
                    <div class="not-today-habit">
                        <span class="habit-name">${escapeHtml(habit.name)}</span>
                        <span class="schedule-badge">${getScheduleLabel(habit.schedule)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (unscheduled.evening.length > 0) {
        html += `
            <div class="not-today-type">
                <span class="type-label">&#9790; Evening</span>
                ${unscheduled.evening.map(habit => `
                    <div class="not-today-habit">
                        <span class="habit-name">${escapeHtml(habit.name)}</span>
                        <span class="schedule-badge">${getScheduleLabel(habit.schedule)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = html;
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
