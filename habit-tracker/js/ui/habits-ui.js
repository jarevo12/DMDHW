// ========== HABITS UI ==========
// Functions for rendering the habits list in the main view

import { habits, currentDate, currentEntry, currentTab, currentUser } from '../state.js';
import { formatDate, escapeHtml } from '../utils.js';
import { getScheduledHabitsForDate, getUnscheduledHabitsForDate, getScheduleLabel } from '../schedule.js';
import { toggleHabit } from '../entries.js';
import { getDb, collection, getDocs, query, where } from '../firebase-init.js';

const weeklyRewardState = new Map();

function getWeekRange(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function getWeeklyGoalStartDate(habit) {
    const raw = habit?.schedule?.weeklyGoalStartDate || habit?.createdAt;
    if (!raw) return null;
    if (raw instanceof Date) {
        const date = new Date(raw);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }
    if (typeof raw.toDate === 'function') {
        const date = raw.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
            date.setHours(0, 0, 0, 0);
            return date;
        }
    }
    if (typeof raw.seconds === 'number') {
        const date = new Date(raw.seconds * 1000);
        if (!Number.isNaN(date.getTime())) {
            date.setHours(0, 0, 0, 0);
            return date;
        }
    }
    return null;
}

function isWeeklyGoalActive(habit) {
    const startDate = getWeeklyGoalStartDate(habit);
    if (!startDate) return true;
    return formatDate(currentDate) >= formatDate(startDate);
}

async function fetchWeekEntriesMap(startDate, endDate) {
    const db = getDb();
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const startString = formatDate(startDate);
    const endString = formatDate(endDate);
    const entriesQuery = query(
        entriesRef,
        where('date', '>=', startString),
        where('date', '<=', endString)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    const entriesMap = {};
    entriesSnapshot.forEach(doc => {
        entriesMap[doc.id] = doc.data();
    });
    return entriesMap;
}

/**
 * Render all habits for the current date
 */
export function renderHabits() {
    const dateString = formatDate(currentDate);
    const scheduled = getScheduledHabitsForDate(habits, dateString);
    const unscheduled = getUnscheduledHabitsForDate(habits, dateString);
    const dailyScheduled = {
        morning: scheduled.morning.filter(h => h.schedule?.type !== 'weekly_goal'),
        evening: scheduled.evening.filter(h => h.schedule?.type !== 'weekly_goal')
    };
    const dailyUnscheduled = {
        morning: unscheduled.morning.filter(h => h.schedule?.type !== 'weekly_goal'),
        evening: unscheduled.evening.filter(h => h.schedule?.type !== 'weekly_goal')
    };
    // Render scheduled habits
    renderHabitList('morning-habits', dailyScheduled.morning, 'morning');
    renderHabitList('evening-habits', dailyScheduled.evening, 'evening');
    renderWeeklyGoalsSection();

    // Render Not Today section
    renderNotTodaySection(dailyUnscheduled, currentTab);
}

export function renderWeeklyGoalsSection() {
    const weeklyGoals = {
        morning: habits.morning.filter(h => h.schedule?.type === 'weekly_goal' && isWeeklyGoalActive(h)),
        evening: habits.evening.filter(h => h.schedule?.type === 'weekly_goal' && isWeeklyGoalActive(h))
    };

    renderWeeklyGoals('morning-weekly-habits', weeklyGoals.morning, 'morning');
    renderWeeklyGoals('evening-weekly-habits', weeklyGoals.evening, 'evening');
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
    const isFutureDate = formatDate(currentDate) > formatDate(new Date());

    if (habitList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${type === 'morning' ? '&#9788;' : '&#9790;'}</div>
                <p>No ${type} habits scheduled</p>
            </div>
        `;
        return;
    }

    const futureClass = isFutureDate ? ' future-locked' : '';
    container.innerHTML = habitList.map((habit, index) => `
        <div class="habit-item opt-d ${type === 'morning' ? 'opt-d-morning' : 'opt-d-evening'}${futureClass}" data-id="${habit.id}" data-type="${type}">
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
            if (isFutureDate) {
                item.classList.remove('future-denied');
                void item.offsetWidth;
                item.classList.add('future-denied');
                return;
            }
            const habitId = item.dataset.id;
            const habitType = item.dataset.type;
            item.classList.add('completing');
            await toggleHabit(habitId, habitType);
            setTimeout(() => item.classList.remove('completing'), 300);
        });
    });

    updateHabitCheckmarks();
}

async function renderWeeklyGoals(containerId, habitList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const isFutureDate = formatDate(currentDate) > formatDate(new Date());

    if (habitList.length === 0) {
        container.innerHTML = '<div class="weekly-goal-empty">No weekly goals</div>';
        return;
    }

    const weekRange = getWeekRange(currentDate);
    let entriesMap = {};
    try {
        entriesMap = await fetchWeekEntriesMap(weekRange.start, weekRange.end);
    } catch (error) {
        console.error('Error fetching weekly entries:', error);
    }

    const weekKey = `${formatDate(weekRange.start)}-${formatDate(weekRange.end)}`;
    container.innerHTML = habitList.map((habit, index) => {
        const goalValue = habit.schedule?.timesPerWeek;
        const goal = Number.isFinite(goalValue) ? goalValue : 3;
        let doneCount = 0;
        if (goal > 0) {
            const startDate = getWeeklyGoalStartDate(habit);
            const rangeStart = startDate && startDate > weekRange.start ? startDate : weekRange.start;
            const cursor = new Date(rangeStart);
            while (cursor <= weekRange.end) {
                const entry = entriesMap[formatDate(cursor)];
                if (entry && entry[type]?.includes(habit.id)) {
                    doneCount++;
                }
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        const cappedDone = goal > 0 ? Math.min(doneCount, goal) : 0;
        const percentage = goal > 0 ? Math.round((cappedDone / goal) * 100) : 0;
        const progressState = goal === 0 ? 'progress-empty' : (cappedDone >= goal ? 'progress-complete' : 'progress-partial');
        const progressClasses = `weekly-progress progress-${type} ${progressState}`;

        return `
            <div class="weekly-goal-item" data-id="${habit.id}" data-week="${weekKey}">
                <div class="habit-item opt-d ${type === 'morning' ? 'opt-d-morning' : 'opt-d-evening'}${isFutureDate ? ' future-locked' : ''}" data-id="${habit.id}" data-type="${type}">
                    <div class="fill-layer"></div>
                    <div class="habit-icon"></div>
                    <div class="habit-text">
                        <span class="habit-number">${index + 1}.</span>
                        <span class="habit-label">${escapeHtml(habit.name)}</span>
                    </div>
                </div>
                <div class="${progressClasses}">
                    <div class="progress-bar" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="progress-text">${cappedDone}/${goal} this week</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.habit-item').forEach(item => {
        item.addEventListener('click', async () => {
            if (isFutureDate) {
                item.classList.remove('future-denied');
                void item.offsetWidth;
                item.classList.add('future-denied');
                return;
            }
            const habitId = item.dataset.id;
            const habitType = item.dataset.type;
            item.classList.add('completing');
            await toggleHabit(habitId, habitType);
            setTimeout(() => item.classList.remove('completing'), 300);
        });
    });

    container.querySelectorAll('.weekly-goal-item').forEach(goalEl => {
        const habitId = goalEl.dataset.id;
        const key = `${habitId}-${weekKey}`;
        const progressEl = goalEl.querySelector('.weekly-progress');
        if (!progressEl) return;
        const isComplete = progressEl.classList.contains('progress-complete');
        const wasComplete = weeklyRewardState.get(key) || false;
        if (isComplete && !wasComplete) {
            progressEl.classList.remove('progress-reward');
            void progressEl.offsetWidth;
            progressEl.classList.add('progress-reward');
            setTimeout(() => {
                progressEl.classList.remove('progress-reward');
            }, 700);
        }
        weeklyRewardState.set(key, isComplete);
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
