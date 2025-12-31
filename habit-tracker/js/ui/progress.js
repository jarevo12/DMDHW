// ========== PROGRESS & DATE DISPLAY ==========
// Functions for updating progress bar and date display

import { habits, currentTab, currentEntry, currentDate } from '../state.js';
import { formatDate } from '../utils.js';

/**
 * Update the progress bar based on completed habits
 */
export function updateProgress() {
    const habitList = habits[currentTab] || [];
    const completed = currentEntry?.[currentTab] || [];
    const total = habitList.length;
    const done = habitList.filter(h => completed.includes(h.id)).length;
    const percentage = total > 0 ? (done / total) * 100 : 0;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${done}/${total} completed`;
}

/**
 * Update the date display in the header
 */
export function updateDateDisplay() {
    const today = new Date();
    const isToday = formatDate(currentDate) === formatDate(today);
    const dateText = document.querySelector('#current-date .date-text');
    const dateFull = document.querySelector('#current-date .date-full');

    if (dateText) {
        if (isToday) {
            dateText.textContent = 'Today';
        } else {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            dateText.textContent = formatDate(currentDate) === formatDate(yesterday)
                ? 'Yesterday'
                : currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        }
    }

    if (dateFull) {
        dateFull.textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    const nextDateBtn = document.getElementById('next-date');
    if (nextDateBtn) {
        nextDateBtn.disabled = isToday;
        nextDateBtn.style.opacity = isToday ? '0.3' : '1';
    }
}
