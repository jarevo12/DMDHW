// ========== DASHBOARD ==========
// Functions for rendering the analytics dashboard

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser, dashboardMonth, setDashboardMonth, accountCreatedAt } from './state.js';
import { formatDate } from './utils.js';
import { renderHabitStrength, renderWeekdayPattern } from './ui/insights-ui.js';
import { selectCalendarDate } from './calendar-picker.js';
import { getScheduledHabitsForDate, isHabitScheduledForDate } from './schedule.js';

// Global chart instance
let completionChartInstance = null;
let weeklyGoalTrendChartInstance = null;
const weeklyGoalSelections = {
    morning: null,
    evening: null
};
const weeklyGoalPendingSelections = {
    morning: new Set(),
    evening: new Set()
};
let lastDashboardEntriesMap = null;
let lastDashboardLastDay = null;
let lastDashboardYear = null;
let lastDashboardMonth = null;

function getHabitStartDate(habit) {
    if (!habit) return null;
    const raw = habit.schedule?.intervalStartDate || habit.createdAt;
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

/**
 * Render the dashboard with stats and charts
 */
export async function renderDashboard() {
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    const year = dashboardMonth.year;
    const month = dashboardMonth.month;
    const baseMonthDate = new Date(baseYear, baseMonth, 1);
    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationMonthDate = creationDate && !Number.isNaN(creationDate.getTime())
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), 1)
        : null;
    const earliestMonthDate = creationMonthDate && creationMonthDate <= baseMonthDate
        ? creationMonthDate
        : null;

    // Populate month selector
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.innerHTML = '';
        let selectedFound = false;
        let monthsAdded = 0;
        let cursor = new Date(baseYear, baseMonth, 1);
        while (true) {
            const d = new Date(cursor);
            const option = document.createElement('option');
            option.value = `${d.getFullYear()}-${d.getMonth()}`;
            option.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (d.getFullYear() === year && d.getMonth() === month) {
                option.selected = true;
                selectedFound = true;
            }
            monthSelector.appendChild(option);
            monthsAdded++;
            if (earliestMonthDate) {
                if (d.getFullYear() === earliestMonthDate.getFullYear()
                    && d.getMonth() === earliestMonthDate.getMonth()) {
                    break;
                }
            } else if (monthsAdded >= 12) {
                break;
            }
            cursor.setMonth(cursor.getMonth() - 1);
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
    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const chartStartDay = creationDate
        && !Number.isNaN(creationDate.getTime())
        && creationDate.getFullYear() === year
        && creationDate.getMonth() === month
        ? creationDate.getDate()
        : 1;

    // Fetch all entries for the month
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);

    const entriesMap = {};
    entriesSnapshot.forEach(doc => {
        entriesMap[doc.id] = doc.data();
    });
    lastDashboardEntriesMap = entriesMap;
    lastDashboardLastDay = lastDay;
    lastDashboardYear = year;
    lastDashboardMonth = month;

    const todayDate = new Date();

    // Calculate habit streaks for current type
    const currentType = document.querySelector('.dash-tab.active')?.dataset.type || 'morning';
    const typeHabits = habits[currentType];
    const dailyHabits = typeHabits.filter(habit => habit.schedule?.type !== 'weekly_goal');
    const weeklyHabits = typeHabits.filter(habit => habit.schedule?.type === 'weekly_goal');

    const dailyHabitStreaks = buildDailyHabitStreaks(dailyHabits, entriesMap, currentType, todayDate);
    const weeklyHabitStreaks = buildWeeklyGoalStreaks(weeklyHabits, entriesMap, year, month, lastDay);

    renderDashboardHabitStrength(currentType, dailyHabitStreaks, weeklyHabitStreaks, entriesMap, year, month, lastDay);

    // Render completion chart
    renderCompletionChart(year, month, lastDay, chartStartDay, entriesMap, currentType);
    renderWeeklyGoalTrend(year, month, lastDay, entriesMap, currentType);

    // Calculate overall completion rate (active type only)
    let totalCompleted = 0;
    let totalPossible = 0;
    const typeHabitsCount = typeHabits.length;

    const overallStartDay = chartStartDay;
    if (typeHabitsCount > 0) {
        for (let day = overallStartDay; day <= lastDay; day++) {
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

        const getTypeCompletion = (dateObj) => {
            const dateString = formatDate(dateObj);
            const entry = entriesMap[dateString];
            const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType]
                .filter(habit => habit.schedule?.type !== 'weekly_goal');
            if (scheduled.length === 0) return null;
            if (!entry) return false;
            return scheduled.every(h => entry[currentType]?.includes(h.id));
        };

        // Current streak: count backward from end of selected month
        const cursor = new Date(endDate);
        while (cursor >= startDate) {
            const completion = getTypeCompletion(cursor);
            if (completion === null) {
                cursor.setDate(cursor.getDate() - 1);
                continue;
            }
            if (completion) {
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
            const completion = getTypeCompletion(dayIter);
            if (completion === null) {
                dayIter.setDate(dayIter.getDate() + 1);
                continue;
            }
            if (completion) {
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
    renderCalendar(year, month, entriesMap, currentType);

    // Render weekday patterns
    renderWeekdayPatterns(entriesMap, year, month, chartStartDay, lastDay, currentType);
}

function renderDashboardHabitStrength(currentType, dailyHabitStreaks, weeklyHabitStreaks, entriesMap, year, month, lastDay) {
    const dailyContainer = document.getElementById('strength-list-daily');
    const weeklyContainer = document.getElementById('strength-list-weekly');
    if (!dailyContainer && !weeklyContainer) return;

    const todayString = formatDate(new Date());
    const allHabits = [...habits.morning, ...habits.evening];
    const dailyHabits = allHabits.filter(habit => {
        if (habit.schedule?.type === 'weekly_goal') return false;
        if (habit.schedule?.type !== 'interval') return true;
        const startDate = habit.schedule?.intervalStartDate;
        return !startDate || startDate <= todayString;
    });
    const weeklyHabits = allHabits.filter(habit => habit.schedule?.type === 'weekly_goal');

    if (allHabits.length === 0) {
        if (dailyContainer) dailyContainer.innerHTML = '<div class="no-insights">No habits to display.</div>';
        if (weeklyContainer) weeklyContainer.innerHTML = '<div class="no-insights">No habits to display.</div>';
        return;
    }

    const habitMap = allHabits.reduce((map, habit) => {
        map[habit.id] = {
            id: habit.id,
            name: habit.name,
            type: habit.type,
            order: habit.order ?? 0
        };
        return map;
    }, {});

    const { strengthData: dailyStrengthData, entryCount } = buildMonthlyHabitStrength(entriesMap, dailyHabits, year, month, lastDay);
    const { strengthData: weeklyStrengthData, weekCount } = buildMonthlyWeeklyGoalStrength(entriesMap, weeklyHabits, year, month, lastDay);

    if (dailyContainer) {
        if (dailyHabits.length === 0) {
            dailyContainer.innerHTML = '<div class="no-insights">No daily habits to display.</div>';
        } else if (entryCount === 0) {
            dailyContainer.innerHTML = '<div class="no-insights">No habit data logged for this month yet.</div>';
        } else {
            renderHabitStrength(dailyStrengthData, habitMap, {
                containerId: 'strength-list-daily',
                filterType: currentType,
                streaksById: dailyHabitStreaks,
                streakUnit: 'days'
            });
        }
    }

    if (weeklyContainer) {
        if (weeklyHabits.length === 0) {
            weeklyContainer.innerHTML = '<div class="no-insights">No weekly goals habits to display.</div>';
        } else if (weekCount === 0) {
            weeklyContainer.innerHTML = '<div class="no-insights">No full weeks to analyze yet.</div>';
        } else {
            renderHabitStrength(weeklyStrengthData, habitMap, {
                containerId: 'strength-list-weekly',
                filterType: currentType,
                streaksById: weeklyHabitStreaks,
                streakUnit: 'weeks'
            });
        }
    }
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

function buildMonthlyWeeklyGoalStrength(entriesMap, weeklyHabits, year, month, lastDay) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, lastDay, 23, 59, 59, 999);
    const includePartialWeek = isSameDay(endDate, new Date());
    const weekRanges = getWeekRangesForPeriod(startDate, endDate, { includePartialWeek });

    const strengthData = weeklyHabits.map(habit => {
        const goalValue = habit.schedule?.timesPerWeek;
        const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 3;
        const completions = weekRanges.map(weekRange => {
            const doneCount = countHabitCompletions(entriesMap, habit, weekRange.start, weekRange.end);
            return doneCount >= goal ? 1 : 0;
        });

        const { strength, status } = calculateHabitStrength(completions);

        return {
            habitId: habit.id,
            name: habit.name,
            strength,
            status
        };
    });

    return { strengthData, weekCount: weekRanges.length };
}

function buildDailyHabitStreaks(habitsList, entriesMap, currentType, todayDate) {
    const streaks = {};
    habitsList.forEach(habit => {
        let currentHabitStreak = 0;
        for (let i = 0; i <= 365; i++) {
            const checkDate = new Date(todayDate);
            checkDate.setDate(checkDate.getDate() - i);
            const dateString = formatDate(checkDate);

            if (!isHabitScheduledForDate(habit, dateString)) {
                continue;
            }

            const entry = entriesMap[dateString];
            if (entry && entry[currentType]?.includes(habit.id)) {
                currentHabitStreak++;
            } else {
                if (i === 0) continue;
                break;
            }
        }

        let bestHabitStreak = 0;
        let tempHabitStreak = 0;
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(todayDate);
            checkDate.setDate(checkDate.getDate() - i);
            const dateString = formatDate(checkDate);

            if (!isHabitScheduledForDate(habit, dateString)) {
                continue;
            }

            const entry = entriesMap[dateString];
            if (entry && entry[currentType]?.includes(habit.id)) {
                tempHabitStreak++;
                bestHabitStreak = Math.max(bestHabitStreak, tempHabitStreak);
            } else {
                tempHabitStreak = 0;
            }
        }

        streaks[habit.id] = {
            currentStreak: currentHabitStreak,
            bestStreak: bestHabitStreak
        };
    });

    return streaks;
}

function buildWeeklyGoalStreaks(weeklyHabits, entriesMap, year, month, lastDay) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, lastDay, 23, 59, 59, 999);
    const includePartialWeek = isSameDay(endDate, new Date());
    const weekRanges = getWeekRangesForPeriod(startDate, endDate, { includePartialWeek });
    const streaks = {};

    weeklyHabits.forEach(habit => {
        const goalValue = habit.schedule?.timesPerWeek;
        const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 3;
        const completions = weekRanges.map(weekRange => {
            const doneCount = countHabitCompletions(entriesMap, habit, weekRange.start, weekRange.end);
            return doneCount >= goal;
        });

        let currentStreak = 0;
        for (let i = completions.length - 1; i >= 0; i--) {
            if (completions[i]) {
                currentStreak++;
            } else {
                break;
            }
        }

        let bestStreak = 0;
        let tempStreak = 0;
        completions.forEach(completed => {
            if (completed) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        streaks[habit.id] = { currentStreak, bestStreak };
    });

    return streaks;
}

function getWeekRangesForPeriod(startDate, endDate, options = {}) {
    const { includePartialWeek = false } = options;
    const ranges = [];
    const cursor = getWeekStart(startDate);

    while (cursor <= endDate) {
        const weekStart = new Date(cursor);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        if (weekEnd <= endDate || includePartialWeek) {
            ranges.push({ start: weekStart, end: weekEnd });
        }

        cursor.setDate(cursor.getDate() + 7);
    }

    return ranges;
}

function getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function countHabitCompletions(entriesMap, habit, startDate, endDate) {
    let doneCount = 0;
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        const entry = entriesMap[formatDate(cursor)];
        if (entry && entry[habit.type]?.includes(habit.id)) {
            doneCount++;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return doneCount;
}

function isSameDay(a, b) {
    return formatDate(a) === formatDate(b);
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

function renderCalendar(year, month, entriesMap, currentType) {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;
    container.dataset.type = currentType;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const today = formatDate(todayDate);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '<div class="calendar-layout">';
    html += '<div class="calendar-grid">';
    html += '<div class="calendar-weekdays">';
    weekdays.forEach(day => {
        html += `<span class="weekday-label">${day}</span>`;
    });
    html += '</div><div class="calendar-heatmap">';

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateString = formatDate(date);
        const isToday = dateString === today;
        const isFuture = date > todayDate;
        const entry = entriesMap[dateString];
        const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType]
            .filter(habit => habit.schedule?.type !== 'weekly_goal');
        const scheduledCount = scheduled.length;
        let completedCount = 0;
        if (entry && scheduledCount > 0 && !isFuture) {
            scheduled.forEach(habit => {
                if (entry[currentType] && entry[currentType].includes(habit.id)) {
                    completedCount++;
                }
            });
        }

        let level = 0;
        let isNoSchedule = false;
        let isFutureDay = false;
        if (isFuture) {
            isFutureDay = true;
            level = 0;
        } else if (scheduledCount === 0) {
            isNoSchedule = true;
            level = 0;
        } else if (scheduledCount > 0) {
            const completionRate = completedCount / scheduledCount;
            if (completionRate >= 1) level = 5;
            else if (completionRate >= 0.8) level = 4;
            else if (completionRate >= 0.6) level = 3;
            else if (completionRate >= 0.4) level = 2;
            else level = 1;
        }

        html += `<div class="calendar-day level-${level} ${isNoSchedule ? 'na' : ''} ${isFutureDay ? 'future' : ''} ${isToday ? 'today' : ''}" data-date="${dateString}">${day}</div>`;
    }

    html += '</div></div>';
    html += `
        <div class="calendar-legend">
            <div class="calendar-legend-item">
                <span class="legend-swatch na"></span>
                <span>No scheduled habits</span>
            </div>
            <div class="calendar-legend-item">
                <span class="legend-swatch level-1"></span>
                <span>0–39% complete</span>
            </div>
            <div class="calendar-legend-item">
                <span class="legend-swatch level-2"></span>
                <span>40–59% complete</span>
            </div>
            <div class="calendar-legend-item">
                <span class="legend-swatch level-3"></span>
                <span>60–79% complete</span>
            </div>
            <div class="calendar-legend-item">
                <span class="legend-swatch level-4"></span>
                <span>80–99% complete</span>
            </div>
            <div class="calendar-legend-item">
                <span class="legend-swatch level-5"></span>
                <span>100% complete</span>
            </div>
        </div>
    `;
    html += '</div>';
    container.innerHTML = html;

    if (!container.dataset.bound) {
        container.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const dayEl = target.closest('.calendar-day');
            if (!dayEl || dayEl.classList.contains('empty')) return;
            const dateString = dayEl.dataset.date;
            if (!dateString) return;
            const desiredTab = container.dataset.type || 'morning';
            const tabButton = document.querySelector(`.tab-btn[data-tab="${desiredTab}"]`);
            if (tabButton instanceof HTMLButtonElement) {
                tabButton.click();
            }
            selectCalendarDate(dateString);
            const todayNav = document.querySelector('.nav-btn[data-view="today"]');
            if (todayNav instanceof HTMLButtonElement) {
                todayNav.click();
            }
        });
        container.dataset.bound = 'true';
    }
}

/**
 * Calculate and render weekday patterns
 * @param {Object} entriesMap - Map of date strings to entry data
 */
function renderWeekdayPatterns(entriesMap, year, month, startDay, lastDay, currentType) {
    const typeHabits = habits[currentType] || [];
    const dailyHabits = typeHabits.filter(habit => habit.schedule?.type !== 'weekly_goal');

    if (dailyHabits.length === 0) {
        renderWeekdayPattern({ rates: [] });
        return;
    }

    // Calculate completion rate for each day of the week (0=Sun, 6=Sat)
    const weekdayStats = Array.from({ length: 7 }, () => ({ completed: 0, possible: 0 }));

    for (let day = startDay; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dateString = formatDate(date);
        const entry = entriesMap[dateString];
        const dayOfWeek = date.getDay();

        const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType]
            .filter(habit => habit.schedule?.type !== 'weekly_goal');
        if (scheduled.length === 0) {
            continue;
        }

        scheduled.forEach(habit => {
            weekdayStats[dayOfWeek].possible++;
            if (entry && entry[currentType] && entry[currentType].includes(habit.id)) {
                weekdayStats[dayOfWeek].completed++;
            }
        });
    }

    const rates = weekdayStats.map(stat => ({
        rate: stat.possible > 0 ? Math.round((stat.completed / stat.possible) * 100) : 0,
        possible: stat.possible
    }));

    renderWeekdayPattern({ rates, type: currentType });
}

function renderCompletionChart(year, month, lastDay, startDay, entriesMap, currentType) {
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

    const safeStartDay = Math.min(Math.max(startDay, 1), lastDay);
    if (safeStartDay > lastDay) {
        if (completionChartInstance) {
            completionChartInstance.destroy();
            completionChartInstance = null;
        }
        return;
    }

    // Calculate completion percentage for each day (selected type only)
    for (let day = safeStartDay; day <= lastDay; day++) {
        const dateString = formatDate(new Date(year, month, day));
        const entry = entriesMap[dateString];
        const scheduled = getScheduledHabitsForDate(habits, dateString)[currentType]
            .filter(habit => habit.schedule?.type !== 'weekly_goal');
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
    const buildNoSchedulePattern = () => {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 8;
        patternCanvas.height = 8;
        const pctx = patternCanvas.getContext('2d');
        if (!pctx) return null;
        pctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        pctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
        pctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        pctx.lineWidth = 2;
        pctx.beginPath();
        pctx.moveTo(-2, 6);
        pctx.lineTo(6, -2);
        pctx.moveTo(2, 10);
        pctx.lineTo(10, 2);
        pctx.stroke();
        return pctx.createPattern(patternCanvas, 'repeat');
    };
    const noSchedulePattern = buildNoSchedulePattern();
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
                ctx.fillStyle = options.pattern || options.color || noScheduleOverlayColor;
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
                    color: noScheduleOverlayColor,
                    pattern: noSchedulePattern
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
                                fillStyle: noSchedulePattern || noScheduleOverlayColor,
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
                    boxWidth: 12,
                    boxHeight: 12,
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

function renderWeeklyGoalTrend(year, month, lastDay, entriesMap, currentType) {
    const section = document.getElementById('weekly-goal-trend-section');
    const filterEl = document.getElementById('weekly-goal-filter');
    const canvas = document.getElementById('weekly-goal-trend-chart');
    const emptyEl = document.getElementById('weekly-goal-trend-empty');
    const chartContainer = document.getElementById('weekly-goal-chart-container');
    if (!section || !filterEl || !canvas || !emptyEl || !chartContainer) return;

    const monthEnd = new Date(year, month, lastDay, 23, 59, 59, 999);
    const weeklyHabits = habits[currentType]
        .filter(habit => habit.schedule?.type === 'weekly_goal')
        .filter(habit => {
            const startDate = getHabitStartDate(habit);
            return !startDate || startDate <= monthEnd;
        });
    if (weeklyHabits.length === 0) {
        if (weeklyGoalTrendChartInstance) {
            weeklyGoalTrendChartInstance.destroy();
            weeklyGoalTrendChartInstance = null;
        }
        filterEl.innerHTML = '';
        chartContainer.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
    }

    let selection = weeklyGoalSelections[currentType];
    if (!selection) {
        selection = new Set();
        weeklyHabits.forEach(habit => selection.add(habit.id));
    }
    const validIds = new Set(weeklyHabits.map(h => h.id));
    Array.from(selection).forEach(id => {
        if (!validIds.has(id)) selection.delete(id);
    });
    weeklyGoalSelections[currentType] = selection;
    weeklyGoalPendingSelections[currentType] = new Set(selection);

    renderWeeklyGoalFilter(filterEl, weeklyHabits, selection, currentType);

    const weekRanges = buildMonthlyWeekRanges(year, month, lastDay);
    const labels = weekRanges.map((range, index) => `WK ${index + 1}`);
    const palette = ['#6a00ff', '#ccff00', '#ffffff', '#ff3b3b', '#00e5ff', '#ffa600'];

    const datasets = weeklyHabits
        .filter(habit => selection.has(habit.id))
        .map((habit) => {
            const habitStartDate = getHabitStartDate(habit);
            const goalValue = habit.schedule?.timesPerWeek;
            const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 1;
            const data = weekRanges.map(range => {
                if (!range) return null;
                if (habitStartDate && range.end < habitStartDate) return null;
                const rangeStart = habitStartDate && habitStartDate > range.start ? habitStartDate : range.start;
                const doneCount = countHabitCompletions(entriesMap, habit, rangeStart, range.end);
                return Math.round((Math.min(doneCount, goal) / goal) * 100);
            });
            const habitIndex = weeklyHabits.findIndex(item => item.id === habit.id);
            const color = palette[Math.max(habitIndex, 0) % palette.length];
            return {
                label: `${habit.name} (${goal}x/wk)`,
                data,
                borderColor: color,
                backgroundColor: color,
                pointBackgroundColor: '#111',
                pointBorderColor: color,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                borderWidth: 2,
                tension: 0.1,
                spanGaps: true
            };
        });

    if (weeklyGoalTrendChartInstance) {
        weeklyGoalTrendChartInstance.destroy();
        weeklyGoalTrendChartInstance = null;
    }

    if (datasets.length === 0) {
        chartContainer.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
    }

    chartContainer.classList.remove('hidden');
    emptyEl.classList.add('hidden');

    const ctx = canvas.getContext('2d');
    weeklyGoalTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            maintainAspectRatio: false,
            scales: {
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
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 10,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: { family: "'Courier New', Courier, monospace", weight: 'bold' }
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
                        labelColor: (context) => {
                            const color = context.dataset?.borderColor || '#ffffff';
                            return {
                                borderColor: color,
                                backgroundColor: color,
                                borderWidth: 1,
                                borderDash: [],
                                borderDashOffset: 0,
                                borderRadius: 0
                            };
                        },
                        label: (context) => {
                            const value = context.parsed?.y;
                            const percent = Number.isFinite(value) ? Math.round(value) : 0;
                            return `${context.dataset.label}: ${percent}%`;
                        }
                    }
                }
            },
            elements: {
                line: { borderWidth: 2 },
                point: { radius: 3, borderWidth: 2 }
            }
        }
    });
}

function renderWeeklyGoalFilter(container, weeklyHabits, selection, currentType) {
    container.dataset.type = currentType;
    container.innerHTML = `
        <div class="weekly-goal-dropdown">
            <button type="button" class="dropdown-toggle" data-action="toggle">
                Filter weekly goals
            </button>
            <div class="dropdown-panel hidden" data-role="panel">
                <button type="button" class="dropdown-action" data-action="all">Select all</button>
                ${weeklyHabits.map(habit => {
                    const goalValue = habit.schedule?.timesPerWeek;
                    const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 1;
                    const checked = selection.has(habit.id) ? 'checked' : '';
                    return `
                        <label class="dropdown-item">
                            <input type="checkbox" data-id="${habit.id}" ${checked}>
                            <span>${habit.name} (${goal}x/wk)</span>
                        </label>
                    `;
                }).join('')}
                <button type="button" class="dropdown-save" data-action="save">Save</button>
            </div>
        </div>
    `;

    if (!container.dataset.bound) {
        container.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const panel = container.querySelector('[data-role="panel"]');
            if (target.dataset.action === 'toggle' && panel) {
                panel.classList.toggle('hidden');
                return;
            }
            if (target.dataset.action === 'all') {
                const type = container.dataset.type || 'morning';
                const selections = weeklyGoalPendingSelections[type] || new Set();
                const habitIds = Array.from(container.querySelectorAll('input[type="checkbox"]'))
                    .map(input => input.dataset.id)
                    .filter(Boolean);
                selections.clear();
                habitIds.forEach(id => selections.add(id));
                weeklyGoalPendingSelections[type] = selections;
                container.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    input.checked = true;
                });
                return;
            }
            if (target.dataset.action === 'save') {
                const type = container.dataset.type || 'morning';
                const selections = weeklyGoalPendingSelections[type] || new Set();
                weeklyGoalSelections[type] = new Set(selections);
                renderWeeklyGoalTrend(lastDashboardYear, lastDashboardMonth, lastDashboardLastDay, lastDashboardEntriesMap, type);
            }
        });
        container.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            const habitId = target.dataset.id;
            if (!habitId) return;
            const type = container.dataset.type || 'morning';
            const selections = weeklyGoalPendingSelections[type] || new Set();
            if (target.checked) {
                selections.add(habitId);
            } else {
                selections.delete(habitId);
            }
            weeklyGoalPendingSelections[type] = selections;
        });
        container.dataset.bound = 'true';
    }
}

function buildMonthlyWeekRanges(year, month, lastDay) {
    const ranges = [];
    for (let i = 0; i < 4; i++) {
        const startDay = i * 7 + 1;
        const endDay = Math.min(startDay + 6, lastDay);
        if (startDay > lastDay) {
            ranges.push(null);
        } else {
            ranges.push({
                start: new Date(year, month, startDay),
                end: new Date(year, month, endDay, 23, 59, 59, 999)
            });
        }
    }
    return ranges;
}
