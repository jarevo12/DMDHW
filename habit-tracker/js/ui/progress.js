// ========== PROGRESS & DATE DISPLAY ==========
// Functions for updating progress bar and date display

import { habits, currentTab, currentEntry, currentDate, accountCreatedAt } from '../state.js';
import { formatDate } from '../utils.js';
import { getScheduledHabitsForDate } from '../schedule.js';

let lastProgressKey = '';
let lastProgressComplete = false;
let rewardTimeout = null;

/**
 * Update the progress bar based on completed habits
 */
export function updateProgress() {
    const dateString = formatDate(currentDate);
    const scheduled = getScheduledHabitsForDate(habits, dateString);
    const habitList = (scheduled[currentTab] || []).filter(h => h.schedule?.type !== 'weekly_goal');
    const completed = currentEntry?.[currentTab] || [];
    const total = habitList.length;
    const done = habitList.filter(h => completed.includes(h.id)).length;
    const percentage = total > 0 ? (done / total) * 100 : 0;
    const isEmpty = total === 0;
    const isComplete = total > 0 && done === total;
    const isPartial = total > 0 && done < total;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.querySelector('.progress-bar');
    const progressSection = document.querySelector('.progress-section');

    if (progressFill) {
        progressFill.style.width = `${isEmpty ? 100 : percentage}%`;
    }
    if (progressText) progressText.textContent = `${done}/${total} completed`;
    if (progressBar) {
        progressBar.setAttribute('aria-valuenow', String(Math.round(percentage)));
    }

    if (progressSection) {
        progressSection.classList.toggle('progress-morning', currentTab === 'morning');
        progressSection.classList.toggle('progress-evening', currentTab === 'evening');
        progressSection.classList.toggle('progress-empty', isEmpty);
        progressSection.classList.toggle('progress-complete', isComplete);
        progressSection.classList.toggle('progress-partial', isPartial);
    }

    const progressKey = `${dateString}-${currentTab}`;
    if (progressKey !== lastProgressKey) {
        lastProgressKey = progressKey;
        lastProgressComplete = isComplete;
    } else if (isComplete && !lastProgressComplete && progressSection) {
        progressSection.classList.remove('progress-reward');
        void progressSection.offsetWidth;
        progressSection.classList.add('progress-reward');
        if (rewardTimeout) {
            clearTimeout(rewardTimeout);
        }
        rewardTimeout = setTimeout(() => {
            progressSection.classList.remove('progress-reward');
        }, 700);
        lastProgressComplete = true;
    } else {
        lastProgressComplete = isComplete;
    }
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
        nextDateBtn.disabled = false;
        nextDateBtn.style.opacity = '1';
    }

    const prevDateBtn = document.getElementById('prev-date');
    if (prevDateBtn) {
        const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
        const creationString = creationDate ? formatDate(creationDate) : null;
        const disablePrev = creationString && formatDate(currentDate) <= creationString;
        prevDateBtn.disabled = disablePrev;
        prevDateBtn.style.opacity = disablePrev ? '0.3' : '1';
    }
}
