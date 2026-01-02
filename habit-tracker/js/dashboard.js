// ========== DASHBOARD ==========
// Functions for rendering the analytics dashboard

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser } from './state.js';
import { formatDate } from './utils.js';
import { renderHabitStrength, renderWeekdayPattern } from './ui/insights-ui.js';

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

    const todayDate = new Date();

    // Calculate habit streaks for current type
    const currentType = document.querySelector('.dash-tab.active')?.dataset.type || 'morning';
    const typeHabits = habits[currentType];

    const habitStreaks = {};
    typeHabits.forEach(habit => {
        // Calculate current streak for this habit
        let currentHabitStreak = 0;
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

        habitStreaks[habit.id] = {
            currentStreak: currentHabitStreak,
            bestStreak: bestHabitStreak
        };
    });

    renderDashboardHabitStrength(currentType, habitStreaks, entriesMap, year, month, lastDay);

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

    // Render weekday patterns
    renderWeekdayPatterns(entriesMap);
}

function renderDashboardHabitStrength(currentType, habitStreaks, entriesMap, year, month, lastDay) {
    const container = document.getElementById('strength-list');
    if (!container) return;

    const allHabits = [...habits.morning, ...habits.evening];
    if (allHabits.length === 0) {
        container.innerHTML = '<div class="no-insights">No habits to display.</div>';
        return;
    }

    const habitMap = allHabits.reduce((map, habit) => {
        map[habit.id] = {
            id: habit.id,
            name: habit.name,
            type: habit.type
        };
        return map;
    }, {});

    const { strengthData, entryCount } = buildMonthlyHabitStrength(entriesMap, allHabits, year, month, lastDay);
    if (entryCount === 0) {
        container.innerHTML = '<div class="no-insights">No habit data logged for this month yet.</div>';
        return;
    }
    renderHabitStrength(strengthData, habitMap, {
        containerId: 'strength-list',
        filterType: currentType,
        streaksById: habitStreaks
    });
}

function buildMonthlyHabitStrength(entriesMap, allHabits, year, month, lastDay) {
    const monthEntries = [];

    for (let day = 1; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];
        if (entry) {
            monthEntries.push(entry);
        }
    }

    const strengthData = allHabits.map(habit => {
        const completions = monthEntries.map(entry => (
            entry[habit.type]?.includes(habit.id) ? 1 : 0
        ));

        const { strength, status } = calculateHabitStrength(completions);

        return {
            habitId: habit.id,
            name: habit.name,
            strength,
            status
        };
    });

    return { strengthData, entryCount: monthEntries.length };
}

function calculateHabitStrength(completions) {
    const decayRate = 0.1;
    const growthRate = 0.05;
    const maxStrength = 100;

    let strength = 0;

    completions.forEach(completed => {
        if (completed === 1) {
            strength = Math.min(maxStrength, strength + (maxStrength - strength) * growthRate);
        } else {
            strength = Math.max(0, strength - strength * decayRate);
        }
    });

    strength = Math.round(strength);

    if (strength >= 81) return { strength, status: 'mastered' };
    if (strength >= 51) return { strength, status: 'strong' };
    if (strength >= 21) return { strength, status: 'building' };
    return { strength, status: 'fragile' };
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

/**
 * Calculate and render weekday patterns
 * @param {Object} entriesMap - Map of date strings to entry data
 */
function renderWeekdayPatterns(entriesMap) {
    const allHabits = [...habits.morning, ...habits.evening];
    const totalHabitsCount = allHabits.length;

    if (totalHabitsCount === 0) {
        renderWeekdayPattern({ rates: [] });
        return;
    }

    // Calculate completion rate for each day of the week (0=Sun, 6=Sat)
    const weekdayStats = Array.from({ length: 7 }, () => ({ completed: 0, possible: 0 }));

    Object.entries(entriesMap).forEach(([dateString, entry]) => {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();

        allHabits.forEach(habit => {
            weekdayStats[dayOfWeek].possible++;
            const type = habit.type;
            if (entry && entry[type] && entry[type].includes(habit.id)) {
                weekdayStats[dayOfWeek].completed++;
            }
        });
    });

    const rates = weekdayStats.map(stat => ({
        rate: stat.possible > 0 ? Math.round((stat.completed / stat.possible) * 100) : 0
    }));

    renderWeekdayPattern({ rates });
}

function renderCompletionChart(year, month, lastDay, entriesMap) {
    const canvas = document.getElementById('completion-chart');
    if (!canvas) return;

    const labels = [];
    const amData = [];
    const pmData = [];
    const morningHabitsCount = habits.morning.length;
    const eveningHabitsCount = habits.evening.length;

    if (morningHabitsCount === 0 && eveningHabitsCount === 0) {
        // No habits, hide chart
        if (completionChartInstance) {
            completionChartInstance.destroy();
            completionChartInstance = null;
        }
        return;
    }

    // Calculate completion percentage for each day (separate AM and PM)
    for (let day = 1; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];

        labels.push(day);

        // Calculate AM (morning) completion
        let amCompleted = 0;
        if (entry && morningHabitsCount > 0) {
            habits.morning.forEach(habit => {
                if (entry.morning && entry.morning.includes(habit.id)) {
                    amCompleted++;
                }
            });
        }
        const amPercentage = morningHabitsCount > 0 ? Math.round((amCompleted / morningHabitsCount) * 100) : 0;
        amData.push(amPercentage);

        // Calculate PM (evening) completion
        let pmCompleted = 0;
        if (entry && eveningHabitsCount > 0) {
            habits.evening.forEach(habit => {
                if (entry.evening && entry.evening.includes(habit.id)) {
                    pmCompleted++;
                }
            });
        }
        const pmPercentage = eveningHabitsCount > 0 ? Math.round((pmCompleted / eveningHabitsCount) * 100) : 0;
        pmData.push(pmPercentage);
    }

    // Destroy existing chart if it exists
    if (completionChartInstance) {
        completionChartInstance.destroy();
    }

    // Create new chart with two datasets
    const ctx = canvas.getContext('2d');
    const datasets = [];

    // AM dataset (acid green color)
    if (morningHabitsCount > 0) {
        datasets.push({
            label: 'AM',
            data: amData,
            borderColor: '#ccff00',
            backgroundColor: '#ccff00',
            borderWidth: 2,
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ccff00',
            pointBorderColor: '#000000',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#ccff00',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
        });
    }

    // PM dataset (purple color)
    if (eveningHabitsCount > 0) {
        datasets.push({
            label: 'PM',
            data: pmData,
            borderColor: '#6a00ff',
            backgroundColor: '#6a00ff',
            borderWidth: 2,
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6a00ff',
            pointBorderColor: '#000000',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#6a00ff',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
        });
    }

    completionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'rect',
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#000000',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    padding: 12,
                    cornerRadius: 0,
                    displayColors: true,
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
                            return `${context.dataset.label}: ${context.parsed.y}%`;
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
