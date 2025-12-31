// ========== DASHBOARD ==========
// Functions for rendering the analytics dashboard

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser } from './state.js';
import { formatDate, escapeHtml } from './utils.js';

// Global chart instance
let completionChartInstance = null;

/**
 * Render the dashboard with stats and charts
 */
export async function renderDashboard() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Populate month selector
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const d = new Date(year, month - i, 1);
            const option = document.createElement('option');
            option.value = `${d.getFullYear()}-${d.getMonth()}`;
            option.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (i === 0) option.selected = true;
            monthSelector.appendChild(option);
        }
    }

    await updateDashboardData(year, month);
}

/**
 * Update dashboard data for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 */
export async function updateDashboardData(year, month) {
    const db = getDb();
    const today = new Date();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const lastDay = (year === today.getFullYear() && month === today.getMonth())
        ? today.getDate()
        : endDate.getDate();

    // Fetch all entries for the month
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);

    const entriesMap = {};
    entriesSnapshot.forEach(doc => {
        entriesMap[doc.id] = doc.data();
    });

    // Calculate habit completion rates for current type
    const currentType = document.querySelector('.dash-tab.active')?.dataset.type || 'morning';
    const typeHabits = habits[currentType];

    const habitStats = typeHabits.map(habit => {
        let completed = 0;
        let possible = lastDay;

        for (let day = 1; day <= lastDay; day++) {
            const dateString = formatDate(new Date(year, month, day));
            const entry = entriesMap[dateString];
            if (entry && entry[currentType] && entry[currentType].includes(habit.id)) {
                completed++;
            }
        }

        // Calculate current streak for this habit
        let currentHabitStreak = 0;
        const todayDate = new Date();
        for (let i = 0; i <= 365; i++) {
            const checkDate = new Date(todayDate);
            checkDate.setDate(checkDate.getDate() - i);
            const dateString = formatDate(checkDate);
            const entry = entriesMap[dateString];

            if (entry && entry[currentType]?.includes(habit.id)) {
                currentHabitStreak++;
            } else {
                if (i === 0) continue; // Today not logged yet
                break;
            }
        }

        // Calculate best streak for this habit
        let bestHabitStreak = 0;
        let tempHabitStreak = 0;
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(todayDate);
            checkDate.setDate(checkDate.getDate() - i);
            const dateString = formatDate(checkDate);
            const entry = entriesMap[dateString];

            if (entry && entry[currentType]?.includes(habit.id)) {
                tempHabitStreak++;
                bestHabitStreak = Math.max(bestHabitStreak, tempHabitStreak);
            } else {
                tempHabitStreak = 0;
            }
        }

        return {
            habit,
            completed,
            possible,
            rate: possible > 0 ? Math.round((completed / possible) * 100) : 0,
            currentStreak: currentHabitStreak,
            bestStreak: bestHabitStreak
        };
    });

    // Render habit rates
    const ratesContainer = document.getElementById('habit-rates');
    if (ratesContainer) {
        if (typeHabits.length === 0) {
            ratesContainer.innerHTML = '<p style="color: var(--text-muted);">No habits to display</p>';
        } else {
            ratesContainer.innerHTML = habitStats.map(stat => `
                <div class="rate-item">
                    <div class="rate-header">
                        <span class="rate-label">${escapeHtml(stat.habit.name)}</span>
                        <div class="rate-streaks">
                            <span class="streak-badge" title="Current streak">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                                </svg>
                                ${stat.currentStreak} days
                            </span>
                            <span class="streak-badge best" title="Best streak">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                ${stat.bestStreak} days
                            </span>
                        </div>
                    </div>
                    <div class="rate-bar-container">
                        <div class="rate-bar">
                            <div class="rate-fill" style="width: ${stat.rate}%"></div>
                        </div>
                        <span class="rate-value">${stat.rate}%</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // Render completion chart
    renderCompletionChart(year, month, lastDay, entriesMap);

    // Calculate overall completion rate
    let totalCompleted = 0;
    let totalPossible = 0;
    const allHabits = [...habits.morning, ...habits.evening];

    for (let day = 1; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];

        allHabits.forEach(habit => {
            totalPossible++;
            const type = habit.type;
            if (entry && entry[type] && entry[type].includes(habit.id)) {
                totalCompleted++;
            }
        });
    }

    const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const overallRateEl = document.getElementById('overall-rate');
    if (overallRateEl) overallRateEl.textContent = `${overallRate}%`;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const todayDate = new Date();
    for (let i = 0; i <= 365; i++) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(checkDate.getDate() - i);
        const dateString = formatDate(checkDate);
        const entry = entriesMap[dateString];

        if (!entry) {
            if (i === 0) continue; // Today not logged yet
            if (currentStreak === 0) currentStreak = tempStreak;
            tempStreak = 0;
            continue;
        }

        const morningComplete = habits.morning.length > 0
            ? habits.morning.every(h => entry.morning?.includes(h.id))
            : true;
        const eveningComplete = habits.evening.length > 0
            ? habits.evening.every(h => entry.evening?.includes(h.id))
            : true;

        if (morningComplete && eveningComplete) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
        } else {
            if (currentStreak === 0) currentStreak = tempStreak;
            tempStreak = 0;
        }
    }

    if (currentStreak === 0) currentStreak = tempStreak;

    const currentStreakEl = document.getElementById('current-streak');
    const bestStreakEl = document.getElementById('best-streak');
    if (currentStreakEl) currentStreakEl.textContent = currentStreak;
    if (bestStreakEl) bestStreakEl.textContent = bestStreak;

    // Render calendar with real data
    renderCalendar(year, month, entriesMap);
}

function renderCalendar(year, month, entriesMap) {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const today = formatDate(new Date());

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '<div class="calendar-weekdays">';
    weekdays.forEach(day => {
        html += `<span class="weekday-label">${day}</span>`;
    });
    html += '</div><div class="calendar-heatmap">';

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    const allHabits = [...habits.morning, ...habits.evening];
    const totalHabitsCount = allHabits.length;

    // Days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateString = formatDate(new Date(year, month, day));
        const isToday = dateString === today;
        const entry = entriesMap[dateString];

        let completedCount = 0;
        if (entry) {
            allHabits.forEach(habit => {
                const type = habit.type;
                if (entry[type] && entry[type].includes(habit.id)) {
                    completedCount++;
                }
            });
        }

        const completionRate = totalHabitsCount > 0 ? completedCount / totalHabitsCount : 0;
        let level = 0;
        if (completionRate >= 1) level = 5;
        else if (completionRate >= 0.8) level = 4;
        else if (completionRate >= 0.6) level = 3;
        else if (completionRate >= 0.4) level = 2;
        else if (completionRate > 0) level = 1;

        html += `<div class="calendar-day level-${level} ${isToday ? 'today' : ''}">${day}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderCompletionChart(year, month, lastDay, entriesMap) {
    const canvas = document.getElementById('completion-chart');
    if (!canvas) return;

    const labels = [];
    const data = [];
    const allHabits = [...habits.morning, ...habits.evening];
    const totalHabitsCount = allHabits.length;

    if (totalHabitsCount === 0) {
        // No habits, hide chart
        if (completionChartInstance) {
            completionChartInstance.destroy();
            completionChartInstance = null;
        }
        return;
    }

    // Calculate completion percentage for each day
    for (let day = 1; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];

        labels.push(day);

        let completedCount = 0;
        if (entry) {
            allHabits.forEach(habit => {
                const type = habit.type;
                if (entry[type] && entry[type].includes(habit.id)) {
                    completedCount++;
                }
            });
        }

        const percentage = Math.round((completedCount / totalHabitsCount) * 100);
        data.push(percentage);
    }

    // Destroy existing chart if it exists
    if (completionChartInstance) {
        completionChartInstance.destroy();
    }

    // Create new chart
    const ctx = canvas.getContext('2d');
    completionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Completion %',
                data,
                borderColor: '#ffffff',
                backgroundColor: 'transparent',
                borderWidth: 2,
                fill: false,
                tension: 0, // Brutalist: sharp lines
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#000000',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#6a00ff', // Electric Purple
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#000000',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    padding: 12,
                    cornerRadius: 0, // Brutalist: no rounded corners
                    displayColors: false,
                    titleFont: {
                        family: 'Courier New'
                    },
                    bodyFont: {
                        family: 'Courier New'
                    },
                    callbacks: {
                        title: (context) => {
                            const day = context[0].label;
                            const monthName = new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return monthName.toUpperCase();
                        },
                        label: (context) => {
                            return `${context.parsed.y}% COMPLETED`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#333333',
                        drawBorder: false,
                        tickColor: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 10,
                            weight: 'bold'
                        },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#333333',
                        drawBorder: false,
                        tickColor: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 10,
                            weight: 'bold'
                        },
                        callback: (value) => value + '%'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}
