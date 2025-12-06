// Dashboard Module
import { getHabits, getHabitsByType } from './habits.js';
import {
    getEntriesForMonth,
    calculateHabitRate,
    calculateStreak,
    calculateHabitStreak,
    calculateHabitBestStreak,
    formatDate,
    getTodayString
} from './entries.js';
import { getExpectedCompletionsForMonth } from './schedule.js';

// Current dashboard state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentType = 'morning';
let dashboardData = null;
let completionChart = null;

// Initialize dashboard
async function initDashboard() {
    await loadDashboardData();
    return true;
}

// Load dashboard data for current month
async function loadDashboardData() {
    const entries = await getEntriesForMonth(currentYear, currentMonth);
    const habits = getHabits();

    // Calculate days in month up to today
    const today = new Date();
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
    const lastDay = isCurrentMonth ? today.getDate() : new Date(currentYear, currentMonth + 1, 0).getDate();

    dashboardData = {
        entries,
        habits,
        month: currentMonth,
        year: currentYear,
        daysInMonth: lastDay,
        type: currentType
    };

    return dashboardData;
}

// Set current month/year
async function setMonth(year, month) {
    currentYear = year;
    currentMonth = month;
    return await loadDashboardData();
}

// Set current type (morning/evening)
function setType(type) {
    currentType = type;
    if (dashboardData) {
        dashboardData.type = type;
    }
    return dashboardData;
}

// Get available months (from first entry to now)
function getAvailableMonths() {
    const months = [];
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Go back 12 months
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentMonthDate);
        date.setMonth(date.getMonth() - i);
        months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        });
    }

    return months;
}

// Calculate overall completion rate for the month
function getOverallRate() {
    if (!dashboardData) return 0;

    const { entries, habits, daysInMonth } = dashboardData;
    const totalHabits = habits.morning.length + habits.evening.length;

    if (totalHabits === 0 || daysInMonth === 0) return 0;

    let totalCompleted = 0;
    let totalPossible = totalHabits * daysInMonth;

    Object.values(entries).forEach(entry => {
        totalCompleted += (entry.morning?.length || 0) + (entry.evening?.length || 0);
    });

    return Math.round((totalCompleted / totalPossible) * 100);
}

// Calculate current streak
function getCurrentStreak() {
    if (!dashboardData) return 0;
    const { entries, habits } = dashboardData;
    return calculateStreak(entries, habits);
}

// Calculate best streak (simplified - checks current month only)
function getBestStreak() {
    if (!dashboardData) return 0;
    const { entries, habits } = dashboardData;

    const dates = Object.keys(entries).sort();
    let bestStreak = 0;
    let currentStreak = 0;

    dates.forEach(dateString => {
        const entry = entries[dateString];
        const morningComplete = entry.morning?.length === habits.morning.length;
        const eveningComplete = entry.evening?.length === habits.evening.length;

        if (morningComplete && eveningComplete) {
            currentStreak++;
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        } else {
            currentStreak = 0;
        }
    });

    return bestStreak;
}

// Helper: Calculate actual completions for a habit in a month
function calculateActualCompletions(entries, habitId, type) {
    let count = 0;
    Object.values(entries).forEach(entry => {
        if (entry[type] && entry[type].includes(habitId)) {
            count++;
        }
    });
    return count;
}

// Get habit completion rates for current type (with streaks)
function getHabitRates() {
    if (!dashboardData) return [];

    const { entries, habits, year, month, type } = dashboardData;
    const typeHabits = habits[type] || [];

    return typeHabits.map(habit => {
        // Calculate schedule-aware expected completions
        const expected = getExpectedCompletionsForMonth(habit, year, month);
        const actual = calculateActualCompletions(entries, habit.id, type);
        const rate = expected > 0 ? Math.round((actual / expected) * 100) : 0;

        return {
            id: habit.id,
            name: habit.name,
            rate: rate,
            currentStreak: calculateHabitStreak(entries, habit.id, type),
            bestStreak: calculateHabitBestStreak(entries, habit.id, type)
        };
    });
}

// Get daily completion percentages for chart
function getDailyCompletionData() {
    if (!dashboardData) return { labels: [], data: [] };

    const { entries, habits, year, month, daysInMonth } = dashboardData;
    const labels = [];
    const data = [];
    const totalHabits = habits.morning.length + habits.evening.length;

    if (totalHabits === 0) return { labels: [], data: [] };

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entries[dateString];

        // Label with day number
        labels.push(day);

        // Calculate completion percentage
        let completed = 0;
        if (entry) {
            completed = (entry.morning?.length || 0) + (entry.evening?.length || 0);
        }

        const percentage = Math.round((completed / totalHabits) * 100);
        data.push(percentage);
    }

    return { labels, data };
}

// Generate calendar data
function getCalendarData() {
    if (!dashboardData) return [];

    const { entries, habits, year, month } = dashboardData;
    const today = getTodayString();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const calendarDays = [];
    const totalHabits = habits.morning.length + habits.evening.length;

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push({ empty: true });
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entries[dateString];

        let completed = 0;
        if (entry) {
            completed = (entry.morning?.length || 0) + (entry.evening?.length || 0);
        }

        // Calculate level (0-5) based on completion percentage
        let level = 0;
        if (totalHabits > 0) {
            const percentage = (completed / totalHabits) * 100;
            if (percentage > 0) level = 1;
            if (percentage >= 25) level = 2;
            if (percentage >= 50) level = 3;
            if (percentage >= 75) level = 4;
            if (percentage === 100) level = 5;
        }

        calendarDays.push({
            day,
            date: dateString,
            completed,
            total: totalHabits,
            level,
            isToday: dateString === today
        });
    }

    return calendarDays;
}

// Render habit rates bars
function renderHabitRates(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rates = getHabitRates();

    if (rates.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No habits to display</p></div>';
        return;
    }

    container.innerHTML = rates.map(habit => `
        <div class="rate-item">
            <div class="rate-header">
                <span class="rate-label">${escapeHtml(habit.name)}</span>
                <div class="rate-streaks">
                    <span class="streak-badge" title="Current streak">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                        </svg>
                        ${habit.currentStreak} days
                    </span>
                    <span class="streak-badge best" title="Best streak">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        ${habit.bestStreak} days
                    </span>
                </div>
            </div>
            <div class="rate-bar-container">
                <div class="rate-bar">
                    <div class="rate-fill" style="width: ${habit.rate}%"></div>
                </div>
                <span class="rate-value">${habit.rate}%</span>
            </div>
        </div>
    `).join('');
}

// Render calendar heatmap
function renderCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const calendarDays = getCalendarData();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Weekday headers
    const weekdayHeaders = `
        <div class="calendar-weekdays">
            ${weekdays.map(day => `<span class="weekday-label">${day}</span>`).join('')}
        </div>
    `;

    // Calendar grid
    const calendarGrid = `
        <div class="calendar-heatmap">
            ${calendarDays.map(day => {
                if (day.empty) {
                    return '<div class="calendar-day empty"></div>';
                }
                return `
                    <div class="calendar-day level-${day.level} ${day.isToday ? 'today' : ''}"
                         title="${day.date}: ${day.completed}/${day.total}">
                        ${day.day}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = weekdayHeaders + calendarGrid;
}

// Render month selector
function renderMonthSelector(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const months = getAvailableMonths();

    select.innerHTML = months.map((m, index) => `
        <option value="${m.year}-${m.month}" ${index === 0 ? 'selected' : ''}>
            ${m.label}
        </option>
    `).join('');
}

// Render completion chart
async function renderCompletionChart() {
    const canvas = document.getElementById('completion-chart');
    if (!canvas) return;

    const { labels, data } = getDailyCompletionData();

    // Destroy existing chart if it exists
    if (completionChart) {
        completionChart.destroy();
    }

    // Get Chart.js
    if (!window.Chart) {
        console.error('Chart.js not loaded');
        return;
    }

    const ctx = canvas.getContext('2d');

    completionChart = new window.Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Completion %',
                data,
                borderColor: 'rgb(255, 107, 157)',
                backgroundColor: 'rgba(255, 107, 157, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgb(255, 107, 157)',
                pointBorderColor: '#0f0f14',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: 'rgb(100, 255, 218)',
                pointHoverBorderColor: 'rgb(255, 107, 157)',
                pointHoverBorderWidth: 3
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
                    backgroundColor: 'rgba(15, 15, 20, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#b4b4c0',
                    borderColor: 'rgba(255, 107, 157, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (context) => {
                            const day = context[0].label;
                            const monthName = new Date(dashboardData.year, dashboardData.month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return monthName;
                        },
                        label: (context) => {
                            return `${context.parsed.y}% completed`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6c6c7a',
                        font: {
                            size: 11,
                            weight: '500'
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
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6c6c7a',
                        font: {
                            size: 11,
                            weight: '500'
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

// Render summary cards
function renderSummary() {
    const overallEl = document.getElementById('overall-rate');
    const streakEl = document.getElementById('current-streak');
    const bestEl = document.getElementById('best-streak');

    if (overallEl) overallEl.textContent = `${getOverallRate()}%`;
    if (streakEl) streakEl.textContent = getCurrentStreak();
    if (bestEl) bestEl.textContent = getBestStreak();
}

// Render full dashboard
async function renderDashboard() {
    await loadDashboardData();

    renderSummary();
    renderMonthSelector('month-selector');
    await renderCompletionChart();
    renderHabitRates('habit-rates');
    renderCalendar('calendar-heatmap');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions
export {
    initDashboard,
    loadDashboardData,
    setMonth,
    setType,
    getAvailableMonths,
    getOverallRate,
    getCurrentStreak,
    getBestStreak,
    getHabitRates,
    getCalendarData,
    getDailyCompletionData,
    renderHabitRates,
    renderCalendar,
    renderMonthSelector,
    renderSummary,
    renderCompletionChart,
    renderDashboard
};
