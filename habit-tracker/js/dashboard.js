// ========== DASHBOARD ==========
// Functions for rendering the analytics dashboard

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser, dashboardMonth, setDashboardMonth } from './state.js';
import { formatDate } from './utils.js';
import { renderHabitStrength, renderWeekdayPattern } from './ui/insights-ui.js';
import { getScheduledHabitsForDate, isHabitScheduledForDate } from './schedule.js';

// Global chart instance
let completionChartInstance = null;

/**
 * Render the dashboard with stats and charts
 */
export async function renderDashboard() {
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    const year = dashboardMonth.year;
    const month = dashboardMonth.month;

    // Populate month selector
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.innerHTML = '';
        let selectedFound = false;
        for (let i = 0; i < 12; i++) {
            const d = new Date(baseYear, baseMonth - i, 1);
            const option = document.createElement('option');
            option.value = `${d.getFullYear()}-${d.getMonth()}`;
            option.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (d.getFullYear() === year && d.getMonth() === month) {
                option.selected = true;
                selectedFound = true;
            }
            monthSelector.appendChild(option);
        }
        if (!selectedFound) {
            monthSelector.value = `${baseYear}-${baseMonth}`;
            setDashboardMonth(baseYear, baseMonth);
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
    renderCompletionChart(year, month, lastDay, entriesMap, currentType);

    // Calculate overall completion rate (active type only)
    let totalCompleted = 0;
    let totalPossible = 0;
    const typeHabitsCount = typeHabits.length;

    if (typeHabitsCount > 0) {
        for (let day = 1; day <= lastDay; day++) {
            const dateString = formatDate(new Date(year, month, day));
            const entry = entriesMap[dateString];
            const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType];
            if (scheduled.length === 0) {
                continue;
            }

            scheduled.forEach(habit => {
                totalPossible++;
                if (entry && entry[currentType] && entry[currentType].includes(habit.id)) {
                    totalCompleted++;
                }
            });
        }
    }

    const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const overallRateEl = document.getElementById('overall-rate');
    if (overallRateEl) overallRateEl.textContent = `${overallRate}%`;

    // Calculate streaks (active type only, within selected month)
    let currentStreak = 0;
    let bestStreak = 0;

    if (typeHabitsCount > 0) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month, lastDay);

        const isTypeComplete = (dateObj) => {
            const dateString = formatDate(dateObj);
            const entry = entriesMap[dateString];
            if (!entry) return false;
            return typeHabits.every(h => entry[currentType]?.includes(h.id));
        };

        // Current streak: count backward from end of selected month
        const cursor = new Date(endDate);
        while (cursor >= startDate) {
            if (isTypeComplete(cursor)) {
                currentStreak++;
            } else {
                break;
            }
            cursor.setDate(cursor.getDate() - 1);
        }

        // Best streak: longest run within selected month
        let tempStreak = 0;
        const dayIter = new Date(startDate);
        while (dayIter <= endDate) {
            if (isTypeComplete(dayIter)) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
            dayIter.setDate(dayIter.getDate() + 1);
        }
    }

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
        const completions = [];

        for (let day = 1; day <= lastDay; day++) {
            const dateString = formatDate(new Date(year, month, day));
            if (!isHabitScheduledForDate(habit, dateString)) {
                continue;
            }
            const entry = entriesMap[dateString];
            completions.push(entry && entry[habit.type]?.includes(habit.id) ? 1 : 0);
        }

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
    if (!completions || completions.length === 0) {
        return { strength: 0, status: 'fragile' };
    }

    const completedCount = completions.reduce((sum, value) => sum + (value === 1 ? 1 : 0), 0);
    const strength = Math.round((completedCount / completions.length) * 100);

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

function renderCompletionChart(year, month, lastDay, entriesMap, currentType) {
    const canvas = document.getElementById('completion-chart');
    if (!canvas) return;

    const labels = [];
    const data = [];
    const morningHabitsCount = habits.morning.length;
    const eveningHabitsCount = habits.evening.length;
    const isMorning = currentType === 'morning';
    const habitsList = isMorning ? habits.morning : habits.evening;
    const entryKey = isMorning ? 'morning' : 'evening';
    const selectedCount = isMorning ? morningHabitsCount : eveningHabitsCount;
    const chartLabel = isMorning ? 'Morning' : 'Evening';
    const chartColor = isMorning ? '#ccff00' : '#6a00ff';

    if (selectedCount === 0) {
        // No habits for selected type, hide chart
        if (completionChartInstance) {
            completionChartInstance.destroy();
            completionChartInstance = null;
        }
        return;
    }

    // Calculate completion percentage for each day (selected type only)
    for (let day = 1; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];
        const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType];
        const scheduledCount = scheduled.length;

        labels.push(day);

        let completed = 0;
        if (entry && scheduledCount > 0) {
            scheduled.forEach(habit => {
                if (entry[entryKey] && entry[entryKey].includes(habit.id)) {
                    completed++;
                }
            });
        }
        if (scheduledCount === 0) {
            data.push(null);
        } else {
            const percentage = Math.round((completed / scheduledCount) * 100);
            data.push(percentage);
        }
    }

    // Destroy existing chart if it exists
    if (completionChartInstance) {
        completionChartInstance.destroy();
    }

    // Create new chart with selected dataset
    const ctx = canvas.getContext('2d');
    const datasets = [{
        label: chartLabel,
        data,
        borderColor: chartColor,
        backgroundColor: chartColor,
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: chartColor,
        pointBorderColor: '#000000',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: chartColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
    }];

    const noScheduleOverlayColor = 'rgba(160, 160, 160, 0.2)';
    const noScheduleOverlay = {
        id: 'noScheduleOverlay',
        beforeDatasetsDraw(chart, args, options) {
            const dataset = chart.data.datasets?.[0];
            if (!dataset || !Array.isArray(dataset.data)) return;
            const values = dataset.data;
            if (!values.length) return;

            const { ctx, chartArea, scales } = chart;
            const xScale = scales.x;
            if (!chartArea || !xScale) return;

            const getPixelForIndex = (index) => xScale.getPixelForValue(index);
            const step = values.length > 1
                ? Math.abs(getPixelForIndex(1) - getPixelForIndex(0))
                : chartArea.right - chartArea.left;

            const drawRun = (startIndex, endIndex) => {
                if (startIndex > endIndex) return;
                const prevIndex = startIndex - 1;
                const nextIndex = endIndex + 1;
                const leftBoundary = prevIndex >= 0
                    ? getPixelForIndex(prevIndex)
                    : getPixelForIndex(startIndex) - step / 2;
                const rightBoundary = nextIndex < values.length
                    ? getPixelForIndex(nextIndex)
                    : getPixelForIndex(endIndex) + step / 2;
                const left = Math.max(leftBoundary, chartArea.left);
                const right = Math.min(rightBoundary, chartArea.right);
                if (right <= left) return;

                ctx.save();
                ctx.fillStyle = options.color || noScheduleOverlayColor;
                ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
                ctx.restore();
            };

            let runStart = null;
            for (let i = 0; i <= values.length; i++) {
                const value = values[i];
                const isEmpty = value === null || value === undefined;
                if (isEmpty && runStart === null) {
                    runStart = i;
                }
                if (!isEmpty && runStart !== null) {
                    drawRun(runStart, i - 1);
                    runStart = null;
                }
            }
            if (runStart !== null) {
                drawRun(runStart, values.length - 1);
            }
        }
    };

    completionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        plugins: [noScheduleOverlay],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                noScheduleOverlay: {
                    color: noScheduleOverlayColor
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    onClick: (event, legendItem, legend) => {
                        if (legendItem.datasetIndex === undefined || legendItem.datasetIndex < 0) {
                            return;
                        }
                        const chart = legend.chart;
                        chart.toggleDataVisibility(legendItem.datasetIndex);
                        chart.update();
                    },
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
                        boxHeight: 12,
                        generateLabels: (chart) => {
                            const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            labels.push({
                                text: 'No scheduled habits',
                                fillStyle: noScheduleOverlayColor,
                                strokeStyle: 'rgba(160, 160, 160, 0.6)',
                                lineWidth: 1,
                                hidden: false,
                                datasetIndex: -1,
                                pointStyle: 'rect'
                            });
                            return labels;
                        }
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
                            if (context.parsed.y === null) {
                                return `${context.dataset.label}: No scheduled habits`;
                            }
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
                    grace: '5%',
                    afterBuildTicks: (scale) => {
                        scale.ticks = [0, 20, 40, 60, 80, 100].map(value => ({ value }));
                    },
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
                        stepSize: 20,
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
