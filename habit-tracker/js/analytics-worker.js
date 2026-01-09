// ========== ANALYTICS WEB WORKER ==========
// Handles all statistical computations off the main thread
// Part of the Smart Insights feature

// Message handler
self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch(type) {
        case 'ANALYZE':
            const results = runFullAnalysis(payload);
            self.postMessage({ type: 'RESULTS', payload: results });
            break;
        default:
            console.warn('Unknown message type:', type);
    }
};

// ========== MAIN ANALYSIS ORCHESTRATOR ==========

/**
 * Run all statistical analyses on the provided data
 * @param {object} data - Prepared data from main thread
 * @returns {object} Complete analysis results
 */
function runFullAnalysis(data) {
    const { habitMap, habitIds, dates, matrix, metadata, type, entries, periodStart, periodEnd, requestKey, period } = data;

    // Check minimum data requirements - need full period of data
    if (metadata.totalDays < period) {
        return {
            insufficientData: true,
            daysCollected: metadata.totalDays,
            daysNeeded: period,
            message: `Need ${period} days of data for insights`,
            requestKey
        };
    }

    // Filter by type if specified (morning/evening)
    let filteredHabitIds = habitIds;
    let filteredMatrix = matrix;

    if (type && type !== 'all') {
        const typeIndices = habitIds
            .map((id, idx) => ({ id, idx }))
            .filter(item => habitMap[item.id]?.type === type)
            .map(item => item.idx);

        filteredHabitIds = typeIndices.map(idx => habitIds[idx]);
        filteredMatrix = matrix.map(row => typeIndices.map(idx => row[idx]));
    }

    // Calculate daily completion rates
    const dailyRates = calculateDailyRates(filteredMatrix);

    // Calculate morning/evening rates separately
    const morningIndices = habitIds
        .map((id, idx) => ({ id, idx }))
        .filter(item => habitMap[item.id]?.type === 'morning')
        .map(item => item.idx);
    const eveningIndices = habitIds
        .map((id, idx) => ({ id, idx }))
        .filter(item => habitMap[item.id]?.type === 'evening')
        .map(item => item.idx);

    const morningMatrix = matrix.map(row => morningIndices.map(idx => row[idx]));
    const eveningMatrix = matrix.map(row => eveningIndices.map(idx => row[idx]));

    const morningRates = calculateDailyRates(morningMatrix);
    const eveningRates = calculateDailyRates(eveningMatrix);

    // Run all analyses
    const strengthDebugSample = (calculateAllHabitStrengths(
        entries || {},
        filteredHabitIds,
        habitMap,
        periodStart,
        periodEnd
    ) || []).slice(0, 4).map(item => {
        const typeLabel = habitMap[item.habitId]?.type || 'unknown';
        return `${item.name}(${typeLabel})`;
    });

    const results = {
        requestKey,
        metadata: {
            ...metadata,
            analyzedHabits: filteredHabitIds.length,
            type: type || 'all'
        },
        debug: {
            strengthSample: strengthDebugSample,
            filteredHabitsSample: filteredHabitIds.slice(0, 4).map(id => {
                const habit = habitMap[id];
                return `${habit?.name || id}(${habit?.type || 'unknown'})`;
            })
        },

        // Overall metrics
        metrics: calculateMetrics(dailyRates, dates),

        // Correlation analysis (need 21+ days)
        correlations: metadata.totalDays >= 21
            ? buildCorrelationMatrix(filteredMatrix, filteredHabitIds)
            : { insufficientData: true, daysNeeded: 21 },

        // Weekday patterns (need 14+ days)
        weekday: metadata.totalDays >= 14
            ? analyzeWeekdayPatterns(dates, filteredMatrix, filteredHabitIds, habitMap)
            : null,

        // Trend analysis
        trend: analyzeTrend(dailyRates),

        // Trend data for chart
        trendData: {
            labels: dates.slice(-28), // Last 28 days
            morning: calculateMovingAverage(morningRates.slice(-28), 3),
            evening: calculateMovingAverage(eveningRates.slice(-28), 3)
        },

    // Anomaly detection
    anomalies: detectAnomalies(dailyRates, dates, filteredHabitIds, habitMap, entries || {}),

        // Habit strength for each habit
        habitStrength: calculateAllHabitStrengths(
            entries || {},
            filteredHabitIds,
            habitMap,
            periodStart,
            periodEnd
        ),

        // Sequence analysis (need 21+ days) - use filtered data
        sequences: metadata.totalDays >= 21
            ? analyzeSequences(filteredMatrix, filteredHabitIds, habitMap)
            : [],

        // Pass through for UI
        habitMap,
        habitIds: filteredHabitIds
    };

    // Generate natural language insights
    results.insights = generateInsights(results, habitMap);

    return results;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Calculate daily completion rates from binary matrix
 */
function calculateDailyRates(matrix) {
    return matrix.map(row => {
        if (row.length === 0) return 0;
        const completed = row.filter(v => v === 1).length;
        return Math.round((completed / row.length) * 100);
    });
}

/**
 * Calculate overall metrics
 */
function calculateMetrics(dailyRates, dates) {
    if (dailyRates.length === 0) {
        return { trend: 0, bestDay: null, mostConsistent: null, daysAnalyzed: 0 };
    }

    const avgRate = Math.round(dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length);

    // Calculate trend vs previous period
    const halfLength = Math.floor(dailyRates.length / 2);
    const firstHalf = dailyRates.slice(0, halfLength);
    const secondHalf = dailyRates.slice(halfLength);

    const firstAvg = firstHalf.length > 0
        ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        : 0;
    const secondAvg = secondHalf.length > 0
        ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        : 0;

    const trendChange = Math.round(secondAvg - firstAvg);

    // Find best day
    let bestDayIdx = 0;
    let bestRate = dailyRates[0] || 0;
    dailyRates.forEach((rate, idx) => {
        if (rate > bestRate) {
            bestRate = rate;
            bestDayIdx = idx;
        }
    });

    const bestDate = dates[bestDayIdx];
    const bestDayName = bestDate ? getDayName(bestDate) : 'N/A';

    return {
        trend: trendChange,
        avgRate,
        bestDay: { name: bestDayName, rate: bestRate },
        daysAnalyzed: dailyRates.length
    };
}

/**
 * Get day name from date string
 */
function getDayName(dateStr) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const date = new Date(dateStr + 'T12:00:00');
    return days[date.getDay()];
}

// ========== STATISTICAL ALGORITHMS ==========

/**
 * Calculate Phi coefficient between two binary variables
 * Range: -1 (perfect negative) to +1 (perfect positive)
 */
function calculatePhi(habitA, habitB) {
    let n11 = 0, n10 = 0, n01 = 0, n00 = 0;

    for (let i = 0; i < habitA.length; i++) {
        if (habitA[i] === 1 && habitB[i] === 1) n11++;
        else if (habitA[i] === 1 && habitB[i] === 0) n10++;
        else if (habitA[i] === 0 && habitB[i] === 1) n01++;
        else n00++;
    }

    const numerator = (n11 * n00) - (n10 * n01);
    const denominator = Math.sqrt(
        (n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00)
    );

    if (denominator === 0) return 0;

    return numerator / denominator;
}

/**
 * Test statistical significance of Phi coefficient using Chi-square
 */
function testPhiSignificance(phi, n) {
    const chiSquare = phi * phi * n;

    // Chi-square critical values (df=1)
    const pValue = chiSquare >= 10.83 ? 0.001 :
                   chiSquare >= 6.63 ? 0.01 :
                   chiSquare >= 3.84 ? 0.05 : 1;

    return {
        significant: pValue <= 0.05,
        pValue
    };
}

/**
 * Build full correlation matrix for all habits
 */
function buildCorrelationMatrix(matrix, habitIds) {
    const n = habitIds.length;

    if (n < 2) {
        return { correlations: [], significantPairs: [], insufficientHabits: true };
    }

    const correlations = Array(n).fill(null).map(() => Array(n).fill(0));
    const significantPairs = [];
    const numDays = matrix.length;

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            if (i === j) {
                correlations[i][j] = 1;
                continue;
            }

            // Extract columns for these two habits
            const habitA = matrix.map(row => row[i]);
            const habitB = matrix.map(row => row[j]);

            const phi = calculatePhi(habitA, habitB);
            const { significant, pValue } = testPhiSignificance(phi, numDays);

            correlations[i][j] = phi;
            correlations[j][i] = phi; // Symmetric

            if (significant && Math.abs(phi) >= 0.3) {
                significantPairs.push({
                    habit1: habitIds[i],
                    habit2: habitIds[j],
                    phi: Math.round(phi * 100) / 100,
                    pValue,
                    direction: phi > 0 ? 'positive' : 'negative',
                    strength: Math.abs(phi) >= 0.7 ? 'strong' :
                              Math.abs(phi) >= 0.5 ? 'moderate' : 'weak'
                });
            }
        }
    }

    return { correlations, significantPairs, habitIds };
}

/**
 * Calculate completion rates by day of week
 */
function analyzeWeekdayPatterns(dates, matrix, habitIds, _habitMap) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday',
                      'thursday', 'friday', 'saturday'];

    const stats = weekdays.map(() => ({ completed: 0, possible: 0 }));

    dates.forEach((dateStr, dayIdx) => {
        const date = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = date.getDay();
        const row = matrix[dayIdx];

        row.forEach((completed, _habitIdx) => {
            stats[dayOfWeek].possible++;
            if (completed === 1) {
                stats[dayOfWeek].completed++;
            }
        });
    });

    const rates = weekdays.map((day, i) => ({
        day,
        rate: stats[i].possible > 0
            ? Math.round((stats[i].completed / stats[i].possible) * 100)
            : 0,
        samples: Math.floor(stats[i].possible / Math.max(habitIds.length, 1))
    }));

    // Find best and worst days
    const sortedRates = [...rates].sort((a, b) => b.rate - a.rate);

    // Check for weekend drop
    const weekdayRates = rates.filter((_, i) => i >= 1 && i <= 5);
    const weekendRates = rates.filter((_, i) => i === 0 || i === 6);

    const weekdayAvg = weekdayRates.length > 0
        ? Math.round(weekdayRates.reduce((a, b) => a + b.rate, 0) / weekdayRates.length)
        : 0;
    const weekendAvg = weekendRates.length > 0
        ? Math.round(weekendRates.reduce((a, b) => a + b.rate, 0) / weekendRates.length)
        : 0;

    return {
        rates,
        bestDay: sortedRates[0],
        worstDay: sortedRates[sortedRates.length - 1],
        variance: calculateVariance(rates.map(r => r.rate)),
        weekdayAvg,
        weekendAvg,
        hasWeekendDrop: weekdayAvg - weekendAvg >= 15
    };
}

/**
 * Calculate variance of values
 */
function calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.round(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate trend using linear regression
 */
function analyzeTrend(values) {
    const n = values.length;
    if (n < 7) return { trend: 0, direction: 'insufficient_data', reliable: false };

    // Simple linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Project values
    const startValue = intercept;
    const endValue = slope * (n - 1) + intercept;
    const percentChange = startValue > 0
        ? Math.round(((endValue - startValue) / startValue) * 100)
        : 0;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssTotal += Math.pow(values[i] - yMean, 2);
        ssResidual += Math.pow(values[i] - predicted, 2);
    }

    const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

    return {
        slope: Math.round(slope * 100) / 100,
        percentChange,
        direction: slope > 0.1 ? 'improving' :
                   slope < -0.1 ? 'declining' : 'stable',
        confidence: rSquared,
        reliable: rSquared >= 0.3 && n >= 14,
        avgRate: Math.round(sumY / n)
    };
}

/**
 * Calculate moving average for smooth visualization
 */
function calculateMovingAverage(values, window = 7) {
    if (values.length === 0) return [];

    const result = [];

    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - window + 1);
        const subset = values.slice(start, i + 1);
        const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
        result.push(Math.round(avg));
    }

    return result;
}

/**
 * Detect anomalous days using Z-score
 */
function detectAnomalies(values, dates, habitIds, habitMap, entries) {
    const anomalies = [];

    dates.forEach((date, i) => {
        let scheduledCount = 0;
        let completedCount = 0;

        habitIds.forEach(habitId => {
            const habit = habitMap[habitId];
            if (!habit || habit.schedule?.type === 'weekly_goal') return;
            if (!isHabitScheduledForDate(habit, date)) return;
            scheduledCount++;
            const entry = entries[date];
            if (entry && entry[habit.type]?.includes(habitId)) {
                completedCount++;
            }
        });

        if (scheduledCount > 0 && completedCount === scheduledCount) {
            anomalies.push({
                date,
                value: 100,
                zScore: null,
                type: 'super_day',
                deviation: null
            });
        }
    });

    if (values.length < 14) return anomalies;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return anomalies;

    values.forEach((value, i) => {
        const zScore = (value - mean) / stdDev;

        if (zScore <= -2) {
            anomalies.push({
                date: dates[i],
                value,
                zScore: Math.round(zScore * 100) / 100,
                type: 'rough_day',
                deviation: Math.round(Math.abs(value - mean))
            });
        }
    });

    return anomalies;
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateRange(startDateString, endDateString) {
    if (!startDateString || !endDateString) return [];
    const start = new Date(startDateString + 'T00:00:00');
    const end = new Date(endDateString + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dates.push(formatDateISO(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

function isHabitScheduledForDate(habit, dateString) {
    const schedule = habit.schedule || { type: 'daily' };
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();

    switch (schedule.type) {
        case 'daily':
            return true;

        case 'specific_days':
            return (schedule.days || [0, 1, 2, 3, 4, 5, 6]).includes(dayOfWeek);

        case 'weekly_goal':
            return true;

        case 'interval': {
            const interval = schedule.intervalDays || 1;
            const skipDays = schedule.intervalSkipDays || [];
            if (skipDays.length >= 7) return false;

            const startDateValue = schedule.intervalStartDate || dateString;
            const startDate = new Date(startDateValue + 'T00:00:00');
            if (Number.isNaN(startDate.getTime())) return false;

            const effectiveStart = new Date(startDate);
            while (skipDays.includes(effectiveStart.getDay())) {
                effectiveStart.setDate(effectiveStart.getDate() + 1);
            }

            if (date < effectiveStart) return false;
            if (skipDays.includes(dayOfWeek)) return false;

            let eligibleDays = 0;
            const cursor = new Date(effectiveStart);
            while (cursor <= date) {
                if (!skipDays.includes(cursor.getDay())) {
                    eligibleDays++;
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            if (eligibleDays === 0) return false;
            return (eligibleDays - 1) % interval === 0;
        }

        default:
            return true;
    }
}

function getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
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

function countHabitCompletions(entries, habit, startDate, endDate) {
    let doneCount = 0;
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        const entry = entries[formatDateISO(cursor)];
        if (entry && entry[habit.type]?.includes(habit.id)) {
            doneCount++;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return doneCount;
}

function isSameDay(a, b) {
    return formatDateISO(a) === formatDateISO(b);
}

/**
 * Calculate habit strength using percent-complete model
 */
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

/**
 * Calculate strength for all habits
 */
function calculateAllHabitStrengths(entries, habitIds, habitMap, periodStart, periodEnd) {
    const dateRange = getDateRange(periodStart, periodEnd);
    const today = new Date();
    const periodEndDate = periodEnd ? new Date(periodEnd + 'T00:00:00') : today;
    const includePartialWeek = isSameDay(periodEndDate, today);

    return habitIds.map((habitId) => {
        const habit = habitMap[habitId];
        if (!habit) {
            return { habitId, name: habitId, strength: 0, status: 'fragile' };
        }

        let completions = [];

        if (habit.schedule?.type === 'weekly_goal') {
            const periodStartDate = periodStart
                ? new Date(periodStart + 'T00:00:00')
                : new Date(periodEndDate);
            const periodEndBound = new Date(periodEndDate);
            periodEndBound.setHours(23, 59, 59, 999);

            const weekRanges = getWeekRangesForPeriod(periodStartDate, periodEndBound, {
                includePartialWeek
            });
            const goalValue = habit.schedule?.timesPerWeek;
            const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 3;

            completions = weekRanges.map(weekRange => {
                const doneCount = countHabitCompletions(entries, habit, weekRange.start, weekRange.end);
                return doneCount >= goal ? 1 : 0;
            });
        } else {
            dateRange.forEach(dateString => {
                if (!isHabitScheduledForDate(habit, dateString)) {
                    return;
                }
                const entry = entries[dateString];
                completions.push(entry && entry[habit.type]?.includes(habit.id) ? 1 : 0);
            });
        }

        const { strength, status } = calculateHabitStrength(completions);

        return {
            habitId,
            name: habit.name || habitId,
            strength,
            status
        };
    });
}

/**
 * Analyze optimal habit sequences
 */
function analyzeSequences(matrix, habitIds, habitMap) {
    const sequences = [];

    // Only analyze habits of the same type (morning or evening)
    const morningHabits = habitIds.filter(id => habitMap[id]?.type === 'morning');
    const eveningHabits = habitIds.filter(id => habitMap[id]?.type === 'evening');

    [morningHabits, eveningHabits].forEach(typeHabits => {
        for (let i = 0; i < typeHabits.length; i++) {
            for (let j = 0; j < typeHabits.length; j++) {
                if (i === j) continue;

                const idxA = habitIds.indexOf(typeHabits[i]);
                const idxB = habitIds.indexOf(typeHabits[j]);

                // When A is done, what's B's completion rate?
                let bWhenA = 0, bWhenNotA = 0;
                let daysWithA = 0, daysWithoutA = 0;

                matrix.forEach(row => {
                    if (row[idxA] === 1) {
                        daysWithA++;
                        if (row[idxB] === 1) bWhenA++;
                    } else {
                        daysWithoutA++;
                        if (row[idxB] === 1) bWhenNotA++;
                    }
                });

                if (daysWithA >= 5 && daysWithoutA >= 5) {
                    const rateWithA = bWhenA / daysWithA;
                    const rateWithoutA = bWhenNotA / daysWithoutA;
                    const lift = rateWithoutA > 0
                        ? Math.round((rateWithA / rateWithoutA - 1) * 100)
                        : 0;

                    if (lift >= 30) {
                        sequences.push({
                            trigger: typeHabits[i],
                            dependent: typeHabits[j],
                            lift,
                            rateWith: Math.round(rateWithA * 100),
                            rateWithout: Math.round(rateWithoutA * 100)
                        });
                    }
                }
            }
        }
    });

    return sequences.sort((a, b) => b.lift - a.lift).slice(0, 5);
}

// ========== NATURAL LANGUAGE GENERATION ==========

/**
 * Generate natural language insights from statistical results
 */
function generateInsights(stats, habitMap) {
    const insights = [];

    // Correlation insights
    if (stats.correlations?.significantPairs) {
        stats.correlations.significantPairs.forEach(pair => {
            const h1 = habitMap[pair.habit1]?.name || pair.habit1;
            const h2 = habitMap[pair.habit2]?.name || pair.habit2;

            if (pair.direction === 'positive' && pair.strength === 'strong') {
                insights.push({
                    type: 'correlation',
                    icon: 'correlation',
                    title: 'HABIT LINK DETECTED',
                    text: `When you skip <strong>${h1}</strong>, you're ${Math.round(1/(1-Math.abs(pair.phi)))}x more likely to skip <strong>${h2}</strong>.`,
                    tip: 'Stack these habits together to create a stronger chain',
                    priority: Math.abs(pair.phi) * 100
                });
            } else if (pair.direction === 'positive') {
                insights.push({
                    type: 'correlation',
                    icon: 'correlation',
                    title: 'CONNECTED HABITS',
                    text: `<strong>${h1}</strong> and <strong>${h2}</strong> tend to succeed or fail together.`,
                    tip: 'Consider doing these back-to-back',
                    priority: Math.abs(pair.phi) * 80
                });
            } else if (pair.direction === 'negative') {
                insights.push({
                    type: 'correlation',
                    icon: 'correlation',
                    title: 'COMPETING HABITS',
                    text: `When you do <strong>${h1}</strong>, you're less likely to complete <strong>${h2}</strong>.`,
                    tip: 'Consider spacing these habits apart or reducing one temporarily',
                    priority: Math.abs(pair.phi) * 70
                });
            }
        });
    }

    // Weekday insights
    if (stats.weekday) {
        insights.push({
            type: 'pattern',
            icon: 'pattern',
            title: 'POWER DAY IDENTIFIED',
            text: `<strong>${stats.weekday.bestDay.day.toUpperCase()}</strong> is your strongest day with ${stats.weekday.bestDay.rate}% completion.`,
            tip: 'Schedule important or challenging habits on this day',
            priority: 60
        });

        if (stats.weekday.bestDay.rate - stats.weekday.worstDay.rate >= 15) {
            insights.push({
                type: 'pattern',
                icon: 'pattern',
                title: `${stats.weekday.worstDay.day.toUpperCase()} CHALLENGE`,
                text: `<strong>${stats.weekday.worstDay.day}</strong> is your hardest day with only ${stats.weekday.worstDay.rate}% completion (vs ${stats.weekday.bestDay.rate}% on your best day).`,
                tip: 'Plan lighter habits for this day or prep the night before',
                priority: 70 + (stats.weekday.bestDay.rate - stats.weekday.worstDay.rate) / 2
            });
        }

        if (stats.weekday.hasWeekendDrop) {
            insights.push({
                type: 'pattern',
                icon: 'pattern',
                title: 'WEEKEND PATTERN',
                text: `Your weekend completion (${stats.weekday.weekendAvg}%) is ${stats.weekday.weekdayAvg - stats.weekday.weekendAvg}% lower than weekdays.`,
                tip: 'Create a separate weekend routine or set reminders',
                priority: 50
            });
        }
    }

    // Trend insights
    if (stats.trend?.reliable) {
        if (stats.trend.direction === 'improving') {
            insights.push({
                type: 'trend',
                icon: 'trend',
                title: 'MOMENTUM BUILDING',
                text: `Your completion rate has improved <strong>${stats.trend.percentChange}%</strong> over the last ${stats.metadata.totalDays} days!`,
                tip: 'Maintain your current routine to lock in these gains',
                priority: 65 + stats.trend.percentChange / 2
            });
        } else if (stats.trend.direction === 'declining') {
            insights.push({
                type: 'trend',
                icon: 'trend',
                title: 'ATTENTION NEEDED',
                text: `Your completion rate has dropped <strong>${Math.abs(stats.trend.percentChange)}%</strong> over the last ${stats.metadata.totalDays} days.`,
                tip: 'Consider reducing habits temporarily or identifying blockers',
                priority: 80 + Math.abs(stats.trend.percentChange) / 2
            });
        }
    } else if (stats.trend?.direction === 'stable') {
        insights.push({
            type: 'trend',
            icon: 'trend',
            title: 'CONSISTENT PERFORMANCE',
            text: `You're maintaining a steady <strong>${stats.trend.avgRate}%</strong> completion rate.`,
            tip: 'Great consistency! Consider adding a new habit if ready',
            priority: 40
        });
    }

    // Anomaly insights
    if (stats.anomalies?.length > 0) {
        const superDays = stats.anomalies
            .filter(item => item.type === 'super_day')
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const roughDays = stats.anomalies
            .filter(item => item.type === 'rough_day')
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        superDays.forEach((item) => {
            insights.push({
                type: 'anomaly',
                icon: 'anomaly',
                title: 'SUPER DAY!',
                text: `On <strong>${formatDateForDisplayLong(item.date)}</strong>, you hit <strong>100% completion</strong> - significantly above your average!`,
                tip: 'Celebrate this win and note what made this day different',
                priority: 90,
                date: item.date
            });
        });

        const recentRoughDay = roughDays[roughDays.length - 1];
        if (recentRoughDay) {
            insights.push({
                type: 'anomaly',
                icon: 'anomaly',
                title: 'ROUGH DAY DETECTED',
                text: `${formatDateForDisplay(recentRoughDay.date)} was an unusually difficult day (${recentRoughDay.value}% completion).`,
                tip: 'Everyone has off days. Focus on bouncing back tomorrow.',
                priority: 55,
                date: recentRoughDay.date
            });
        }
    }

    // Sequence insights
    if (stats.sequences?.length > 0) {
        stats.sequences.slice(0, 2).forEach(seq => {
            const trigger = habitMap[seq.trigger]?.name || seq.trigger;
            const dependent = habitMap[seq.dependent]?.name || seq.dependent;
            insights.push({
                type: 'sequence',
                icon: 'sequence',
                title: 'OPTIMAL SEQUENCE FOUND',
                text: `<strong>${dependent}</strong> works ${seq.lift}% better when it follows <strong>${trigger}</strong>.`,
                tip: `Lock in this sequence: ${trigger} -> ${dependent}`,
                priority: 65 + seq.lift / 5
            });
        });
    }

    // Strength alerts
    if (stats.habitStrength) {
        const strengthList = stats.metadata?.type && stats.metadata.type !== 'all'
            ? stats.habitStrength.filter(hs => habitMap[hs.habitId]?.type === stats.metadata.type)
            : stats.habitStrength;

        strengthList.forEach(hs => {
            const habitName = habitMap[hs.habitId]?.name || hs.name || hs.habitId;
            if (hs.status === 'fragile') {
                insights.push({
                    type: 'strength',
                    icon: 'anomaly',
                    title: 'HABIT AT RISK',
                    text: `<strong>${habitName}</strong> is losing strength. It needs attention!`,
                    tip: 'Focus on just this habit for the next week',
                    priority: 85
                });
            } else if (hs.status === 'mastered' && hs.strength >= 90) {
                insights.push({
                    type: 'strength',
                    icon: 'trend',
                    title: 'HABIT MASTERED',
                    text: `<strong>${habitName}</strong> is now automatic with ${hs.strength}% strength!`,
                    tip: 'This habit is locked in. Consider it a foundation.',
                    priority: 40
                });
            }
        });
    }

    // Sort by priority and return top insights
    return insights
        .filter(i => i !== null)
        .sort((a, b) => b.priority - a.priority);
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateForDisplayLong(dateStr) {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
