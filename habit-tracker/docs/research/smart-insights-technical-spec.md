# Smart Insights: Technical Implementation Specification

*Technical architecture for scalable behavioral insights | January 2025*

---

## Executive Summary

This document provides a complete technical specification for implementing the Smart Insights feature in a scalable manner that can serve thousands of concurrent users while maintaining low costs and fast performance.

**Key Architecture Decision**: **Client-Side First**

All statistical computations run in the user's browser using Web Workers. This approach:
- Eliminates server costs for computation
- Ensures instant insights (no network latency)
- Maintains privacy (data never leaves device for analysis)
- Scales infinitely (each user's device is the "server")

Server-side components are only used for optional AI-powered narrative generation (premium tier).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Requirements](#2-data-requirements)
3. [Statistical Algorithms](#3-statistical-algorithms)
4. [Natural Language Generation](#4-natural-language-generation)
5. [Caching Strategy](#5-caching-strategy)
6. [Implementation Plan](#6-implementation-plan)
7. [File Structure](#7-file-structure)
8. [Cost Analysis](#8-cost-analysis)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                 │
│                                                                          │
│  ┌─────────────┐     ┌─────────────────┐     ┌────────────────────────┐ │
│  │             │     │                 │     │                        │ │
│  │  Firestore  │────▶│  Main Thread    │────▶│     Insights UI        │ │
│  │  (entries)  │     │  (app.js)       │     │  (insights-ui.js)      │ │
│  │             │     │                 │     │                        │ │
│  └─────────────┘     └────────┬────────┘     └────────────────────────┘ │
│                               │                                          │
│                               │ postMessage                              │
│                               ▼                                          │
│                      ┌─────────────────┐                                 │
│                      │                 │                                 │
│                      │   Web Worker    │                                 │
│                      │  (analytics-    │                                 │
│                      │   worker.js)    │                                 │
│                      │                 │                                 │
│                      │  ┌───────────┐  │                                 │
│                      │  │Statistics │  │                                 │
│                      │  │ Module    │  │                                 │
│                      │  └───────────┘  │                                 │
│                      │  ┌───────────┐  │                                 │
│                      │  │   NLG     │  │                                 │
│                      │  │ Templates │  │                                 │
│                      │  └───────────┘  │                                 │
│                      │  ┌───────────┐  │                                 │
│                      │  │  Insight  │  │                                 │
│                      │  │ Generator │  │                                 │
│                      │  └───────────┘  │                                 │
│                      └────────┬────────┘                                 │
│                               │                                          │
│                               ▼                                          │
│                      ┌─────────────────┐                                 │
│                      │  IndexedDB      │                                 │
│                      │  (cached        │                                 │
│                      │   insights)     │                                 │
│                      └─────────────────┘                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER SIDE (OPTIONAL)                          │
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────────┐  │
│  │ Firebase Cloud  │     │                 │     │                   │  │
│  │ Functions       │────▶│  Gemini API     │────▶│  AI Narrative     │  │
│  │ (aiCoach)       │     │  (1.5-flash)    │     │  Response         │  │
│  │                 │     │                 │     │                   │  │
│  └─────────────────┘     └─────────────────┘     └───────────────────┘  │
│                                                                          │
│           Only for Premium "AI Coach" tier - optional                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Why Client-Side Computation?

| Approach | Cost per 1000 users/month | Latency | Privacy | Scalability |
|----------|---------------------------|---------|---------|-------------|
| **Client-Side (Recommended)** | $0 | <100ms | Full | Infinite |
| Cloud Functions | $5-15 | 200-500ms | Moderate | Linear cost |
| Dedicated Server | $50-100 | 100-300ms | Moderate | Complex |

**Client-side wins because:**
1. Habit data is small (365 days × 10 habits = ~4KB per user)
2. Algorithms are simple (O(n²) at worst for correlations)
3. Modern browsers handle this easily (even mobile)
4. Each user pays for their own compute (their device)

### 1.3 Component Responsibilities

| Component | Responsibility | Thread |
|-----------|---------------|--------|
| `insights.js` | Orchestration, UI updates | Main |
| `analytics-worker.js` | All statistical computation | Worker |
| `insights-ui.js` | DOM rendering, interactions | Main |
| `nlg-templates.js` | Natural language generation | Worker |
| `insights-cache.js` | IndexedDB caching layer | Main |

---

## 2. Data Requirements

### 2.1 Current Data Model (Firestore)

```
/users/{userId}/
├── habits/{habitId}
│   ├── name: string
│   ├── type: 'morning' | 'evening'
│   ├── order: number
│   ├── schedule: { type, days?, timesPerWeek?, intervalDays? }
│   ├── createdAt: timestamp
│   └── archived: boolean
│
└── entries/{YYYY-MM-DD}
    ├── date: string
    ├── morning: habitId[]
    └── evening: habitId[]
```

### 2.2 Data Fetching Strategy

```javascript
// insights.js

/**
 * Fetch entries for insights analysis
 * Uses batched reads to minimize Firestore costs
 */
async function fetchEntriesForInsights(userId, periodDays = 90) {
    const db = getDb();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Single query to get all entries in range
    const entriesRef = collection(db, `users/${userId}/entries`);
    const snapshot = await getDocs(entriesRef);

    // Filter client-side (cheaper than server-side query)
    const entries = {};
    snapshot.forEach(doc => {
        const date = doc.id; // YYYY-MM-DD
        if (date >= formatDate(startDate) && date <= formatDate(endDate)) {
            entries[date] = doc.data();
        }
    });

    return entries;
}
```

**Firestore Reads Cost:**
- Initial load: 1 read per entry (max 365 reads = $0.0002)
- Real-time updates: onSnapshot (included in pricing)
- **Total: ~$0.06/year per user** for unlimited insights

### 2.3 Minimum Data Requirements

| Insight Type | Minimum Days | Recommended Days | Statistical Reason |
|--------------|--------------|------------------|-------------------|
| Day-of-week patterns | 14 | 28 | Need 2-4 samples per weekday |
| Correlations | 21 | 45 | Fisher's Exact Test needs n≥20 |
| Trends | 7 | 30 | Moving average stability |
| Anomaly detection | 14 | 30 | Z-score needs baseline |
| Habit strength | 7 | 30 | Decay algorithm convergence |

### 2.4 Data Preparation for Worker

```javascript
// insights.js

/**
 * Prepare data package for Web Worker
 * Converts Firestore format to optimized analysis format
 */
function prepareDataForWorker(habits, entries) {
    // Create habit lookup map
    const habitMap = {};
    [...habits.morning, ...habits.evening].forEach(h => {
        habitMap[h.id] = {
            id: h.id,
            name: h.name,
            type: h.type,
            schedule: h.schedule
        };
    });

    // Convert entries to binary matrix for fast analysis
    // Rows = days, Columns = habits
    const dates = Object.keys(entries).sort();
    const habitIds = Object.keys(habitMap);

    const matrix = dates.map(date => {
        const entry = entries[date];
        return habitIds.map(habitId => {
            const habit = habitMap[habitId];
            const completed = entry[habit.type]?.includes(habitId);
            return completed ? 1 : 0;
        });
    });

    return {
        habitMap,
        habitIds,
        dates,
        matrix,
        metadata: {
            totalDays: dates.length,
            totalHabits: habitIds.length,
            dateRange: { start: dates[0], end: dates[dates.length - 1] }
        }
    };
}
```

---

## 3. Statistical Algorithms

### 3.1 Phi Coefficient (Correlation)

The Phi coefficient measures correlation between two binary variables (habits). Perfect for habit completion data.

```javascript
// analytics-worker.js

/**
 * Calculate Phi coefficient between two habits
 *
 * Contingency table:
 *           Habit B
 *           Yes    No
 * Habit A
 *    Yes    n11    n10
 *    No     n01    n00
 *
 * Phi = (n11*n00 - n10*n01) / sqrt((n11+n10)(n01+n00)(n11+n01)(n10+n00))
 *
 * Range: -1 (perfect negative) to +1 (perfect positive)
 *
 * @param {number[]} habitA - Binary array for habit A (0 or 1)
 * @param {number[]} habitB - Binary array for habit B (0 or 1)
 * @returns {number} Phi coefficient
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
 * Calculate statistical significance of Phi coefficient
 * Uses Chi-square test
 *
 * @param {number} phi - Phi coefficient
 * @param {number} n - Sample size (number of days)
 * @returns {object} { significant: boolean, pValue: number }
 */
function testPhiSignificance(phi, n) {
    const chiSquare = phi * phi * n;

    // Chi-square critical values (df=1)
    // p=0.05: 3.84, p=0.01: 6.63, p=0.001: 10.83
    const pValue = chiSquare >= 10.83 ? 0.001 :
                   chiSquare >= 6.63 ? 0.01 :
                   chiSquare >= 3.84 ? 0.05 : 1;

    return {
        significant: pValue <= 0.05,
        pValue
    };
}
```

### 3.2 Correlation Matrix

```javascript
// analytics-worker.js

/**
 * Build full correlation matrix for all habits
 *
 * @param {number[][]} matrix - Binary matrix (days × habits)
 * @param {string[]} habitIds - Array of habit IDs
 * @returns {object} Correlation matrix and significant pairs
 */
function buildCorrelationMatrix(matrix, habitIds) {
    const n = habitIds.length;
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

    return { correlations, significantPairs };
}
```

**Time Complexity:** O(n² × d) where n = habits, d = days
**For 10 habits × 90 days:** ~9,000 operations = <1ms

### 3.3 Day-of-Week Analysis

```javascript
// analytics-worker.js

/**
 * Calculate completion rates by day of week
 *
 * @param {object} entries - Entries keyed by date
 * @param {object} habitMap - Habit definitions
 * @returns {object} Weekday statistics
 */
function analyzeWeekdayPatterns(entries, habitMap) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday',
                      'thursday', 'friday', 'saturday'];

    const stats = weekdays.map(() => ({ completed: 0, possible: 0 }));
    const habitIds = Object.keys(habitMap);

    Object.entries(entries).forEach(([dateStr, entry]) => {
        const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid TZ issues
        const dayOfWeek = date.getDay();

        habitIds.forEach(habitId => {
            const habit = habitMap[habitId];
            stats[dayOfWeek].possible++;

            if (entry[habit.type]?.includes(habitId)) {
                stats[dayOfWeek].completed++;
            }
        });
    });

    const rates = weekdays.map((day, i) => ({
        day,
        rate: stats[i].possible > 0
            ? Math.round((stats[i].completed / stats[i].possible) * 100)
            : 0,
        samples: Math.floor(stats[i].possible / habitIds.length)
    }));

    // Find best and worst days
    const sortedRates = [...rates].sort((a, b) => b.rate - a.rate);

    return {
        rates,
        bestDay: sortedRates[0],
        worstDay: sortedRates[sortedRates.length - 1],
        variance: calculateVariance(rates.map(r => r.rate))
    };
}

function calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.round(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}
```

### 3.4 Trend Analysis

```javascript
// analytics-worker.js

/**
 * Calculate trend using linear regression
 *
 * @param {number[]} values - Daily completion rates
 * @returns {object} Trend analysis results
 */
function analyzeTrend(values) {
    const n = values.length;
    if (n < 7) return { trend: 0, direction: 'insufficient_data' };

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

    // Calculate R² for confidence
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssTotal += Math.pow(values[i] - yMean, 2);
        ssResidual += Math.pow(values[i] - predicted, 2);
    }

    const rSquared = 1 - (ssResidual / ssTotal);

    return {
        slope: Math.round(slope * 100) / 100,
        percentChange,
        direction: slope > 0.1 ? 'improving' :
                   slope < -0.1 ? 'declining' : 'stable',
        confidence: rSquared,
        reliable: rSquared >= 0.3 && n >= 14
    };
}

/**
 * Calculate moving averages for smooth trend visualization
 */
function calculateMovingAverage(values, window = 7) {
    const result = [];

    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - window + 1);
        const subset = values.slice(start, i + 1);
        const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
        result.push(Math.round(avg));
    }

    return result;
}
```

### 3.5 Anomaly Detection (Z-Score)

```javascript
// analytics-worker.js

/**
 * Detect anomalous days using Z-score
 *
 * @param {number[]} values - Daily completion rates
 * @returns {object[]} Array of anomalies
 */
function detectAnomalies(values, dates) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    if (stdDev === 0) return []; // No variation

    const anomalies = [];

    values.forEach((value, i) => {
        const zScore = (value - mean) / stdDev;

        if (Math.abs(zScore) >= 2) {
            anomalies.push({
                date: dates[i],
                value,
                zScore: Math.round(zScore * 100) / 100,
                type: zScore > 0 ? 'super_day' : 'rough_day',
                deviation: Math.round(Math.abs(value - mean))
            });
        }
    });

    return anomalies;
}
```

### 3.6 Habit Strength (Decay Algorithm)

```javascript
// analytics-worker.js

/**
 * Calculate habit strength using decay model
 * Simulates how "strong" a habit is based on consistency
 *
 * @param {number[]} completions - Binary array of completions
 * @returns {object} Strength score and status
 */
function calculateHabitStrength(completions) {
    const DECAY_RATE = 0.1;    // Lose 10% per missed day
    const GROWTH_RATE = 0.05;  // Gain 5% per completed day
    const MAX_STRENGTH = 100;

    let strength = 0;

    completions.forEach(completed => {
        if (completed === 1) {
            // Growth: asymptotic approach to max
            strength = Math.min(MAX_STRENGTH, strength + (MAX_STRENGTH - strength) * GROWTH_RATE);
        } else {
            // Decay: percentage of current strength
            strength = Math.max(0, strength - strength * DECAY_RATE);
        }
    });

    // Round to whole number
    strength = Math.round(strength);

    // Determine status
    let status;
    if (strength >= 81) status = 'mastered';
    else if (strength >= 51) status = 'strong';
    else if (strength >= 21) status = 'building';
    else status = 'fragile';

    return { strength, status };
}
```

### 3.7 Sequence Analysis

```javascript
// analytics-worker.js

/**
 * Analyze optimal habit sequences
 * Find which habits work better when done after others
 *
 * @param {number[][]} matrix - Binary matrix (days × habits)
 * @param {string[]} habitIds - Array of habit IDs
 * @param {object} habitMap - Habit definitions
 * @returns {object[]} Sequence recommendations
 */
function analyzeSequences(matrix, habitIds, habitMap) {
    const sequences = [];

    // Only analyze habits of the same type (morning or evening)
    const morningHabits = habitIds.filter(id => habitMap[id].type === 'morning');
    const eveningHabits = habitIds.filter(id => habitMap[id].type === 'evening');

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
```

---

## 4. Natural Language Generation

### 4.1 Template-Based NLG (Free Tier)

```javascript
// nlg-templates.js

/**
 * Generate natural language insights from statistical results
 * Rule-based approach - zero API costs
 */
const insightTemplates = {

    correlation: {
        positive_strong: (h1, h2, phi) => ({
            type: 'correlation',
            icon: '&#128279;',
            title: 'HABIT LINK DETECTED',
            text: `When you skip <strong>${h1}</strong>, you're ${Math.round(1/(1-phi))}x more likely to skip <strong>${h2}</strong>.`,
            tip: 'Stack these habits together to create a stronger chain',
            priority: Math.abs(phi) * 100
        }),

        positive_moderate: (h1, h2, phi) => ({
            type: 'correlation',
            icon: '&#128279;',
            title: 'CONNECTED HABITS',
            text: `<strong>${h1}</strong> and <strong>${h2}</strong> tend to succeed or fail together.`,
            tip: 'Consider doing these back-to-back',
            priority: Math.abs(phi) * 80
        }),

        negative: (h1, h2, phi) => ({
            type: 'correlation',
            icon: '&#9888;',
            title: 'COMPETING HABITS',
            text: `When you do <strong>${h1}</strong>, you're less likely to complete <strong>${h2}</strong>.`,
            tip: 'Consider spacing these habits apart or reducing one temporarily',
            priority: Math.abs(phi) * 70
        })
    },

    weekday: {
        best_day: (day, rate) => ({
            type: 'pattern',
            icon: '&#128170;',
            title: 'POWER DAY IDENTIFIED',
            text: `<strong>${day.toUpperCase()}</strong> is your strongest day with ${rate}% completion.`,
            tip: 'Schedule important or challenging habits on this day',
            priority: 60
        }),

        worst_day: (day, rate, bestRate) => ({
            type: 'pattern',
            icon: '&#128197;',
            title: `${day.toUpperCase()} CHALLENGE`,
            text: `<strong>${day}</strong> is your hardest day with only ${rate}% completion (vs ${bestRate}% on your best day).`,
            tip: 'Plan lighter habits for this day or prep the night before',
            priority: 70 + (bestRate - rate) / 2
        }),

        weekend_drop: (weekdayAvg, weekendAvg) => ({
            type: 'pattern',
            icon: '&#127968;',
            title: 'WEEKEND PATTERN',
            text: `Your weekend completion (${weekendAvg}%) is ${weekdayAvg - weekendAvg}% lower than weekdays.`,
            tip: 'Create a separate weekend routine or set reminders',
            priority: 50
        })
    },

    trend: {
        improving: (percent, period) => ({
            type: 'trend',
            icon: '&#9650;',
            title: 'MOMENTUM BUILDING',
            text: `Your completion rate has improved <strong>${percent}%</strong> over the last ${period} days!`,
            tip: 'Maintain your current routine to lock in these gains',
            priority: 65 + percent / 2
        }),

        declining: (percent, period) => ({
            type: 'trend',
            icon: '&#9660;',
            title: 'ATTENTION NEEDED',
            text: `Your completion rate has dropped <strong>${Math.abs(percent)}%</strong> over the last ${period} days.`,
            tip: 'Consider reducing habits temporarily or identifying blockers',
            priority: 80 + Math.abs(percent) / 2
        }),

        stable: (rate) => ({
            type: 'trend',
            icon: '&#9644;',
            title: 'CONSISTENT PERFORMANCE',
            text: `You're maintaining a steady <strong>${rate}%</strong> completion rate.`,
            tip: 'Great consistency! Consider adding a new habit if ready',
            priority: 40
        }),

        morning_vs_evening: (morningRate, eveningRate) => {
            const diff = morningRate - eveningRate;
            if (Math.abs(diff) < 10) return null;

            return {
                type: 'trend',
                icon: diff > 0 ? '&#9728;' : '&#127769;',
                title: diff > 0 ? 'MORNING PERSON' : 'NIGHT OWL',
                text: `Your ${diff > 0 ? 'morning' : 'evening'} routine is ${Math.abs(diff)}% stronger.`,
                tip: `Schedule important habits in the ${diff > 0 ? 'morning' : 'evening'}`,
                priority: 45
            };
        }
    },

    anomaly: {
        super_day: (date, rate) => ({
            type: 'anomaly',
            icon: '&#11088;',
            title: 'SUPER DAY!',
            text: `You hit <strong>${rate}% completion</strong> - significantly above your average!`,
            tip: 'Celebrate this win and note what made this day different',
            priority: 90,
            date
        }),

        rough_day: (date, rate) => ({
            type: 'anomaly',
            icon: '&#128148;',
            title: 'ROUGH DAY DETECTED',
            text: `${date} was an unusually difficult day (${rate}% completion).`,
            tip: 'Everyone has off days. Focus on bouncing back tomorrow.',
            priority: 55,
            date
        })
    },

    sequence: {
        optimal: (trigger, dependent, lift) => ({
            type: 'sequence',
            icon: '&#9654;',
            title: 'OPTIMAL SEQUENCE FOUND',
            text: `<strong>${dependent}</strong> works ${lift}% better when it follows <strong>${trigger}</strong>.`,
            tip: `Lock in this sequence: ${trigger} → ${dependent}`,
            priority: 65 + lift / 5
        })
    },

    strength: {
        fragile_alert: (habitName) => ({
            type: 'strength',
            icon: '&#128680;',
            title: 'HABIT AT RISK',
            text: `<strong>${habitName}</strong> is losing strength. It needs attention!`,
            tip: 'Focus on just this habit for the next week',
            priority: 85
        }),

        mastered: (habitName, days) => ({
            type: 'strength',
            icon: '&#127942;',
            title: 'HABIT MASTERED',
            text: `<strong>${habitName}</strong> is now automatic after ${days}+ days of consistency!`,
            tip: 'This habit is locked in. Consider it a foundation.',
            priority: 40
        })
    }
};

/**
 * Generate all insights from statistical results
 */
function generateInsights(stats, habitMap) {
    const insights = [];

    // Correlation insights
    stats.correlations?.significantPairs?.forEach(pair => {
        const h1 = habitMap[pair.habit1]?.name || pair.habit1;
        const h2 = habitMap[pair.habit2]?.name || pair.habit2;

        if (pair.direction === 'positive' && pair.strength === 'strong') {
            insights.push(insightTemplates.correlation.positive_strong(h1, h2, pair.phi));
        } else if (pair.direction === 'positive') {
            insights.push(insightTemplates.correlation.positive_moderate(h1, h2, pair.phi));
        } else if (pair.direction === 'negative') {
            insights.push(insightTemplates.correlation.negative(h1, h2, pair.phi));
        }
    });

    // Weekday insights
    if (stats.weekday) {
        insights.push(insightTemplates.weekday.best_day(
            stats.weekday.bestDay.day,
            stats.weekday.bestDay.rate
        ));

        if (stats.weekday.bestDay.rate - stats.weekday.worstDay.rate >= 15) {
            insights.push(insightTemplates.weekday.worst_day(
                stats.weekday.worstDay.day,
                stats.weekday.worstDay.rate,
                stats.weekday.bestDay.rate
            ));
        }
    }

    // Trend insights
    if (stats.trend?.reliable) {
        if (stats.trend.direction === 'improving') {
            insights.push(insightTemplates.trend.improving(
                stats.trend.percentChange,
                stats.metadata.totalDays
            ));
        } else if (stats.trend.direction === 'declining') {
            insights.push(insightTemplates.trend.declining(
                stats.trend.percentChange,
                stats.metadata.totalDays
            ));
        }
    }

    // Anomaly insights (only most recent)
    if (stats.anomalies?.length > 0) {
        const recent = stats.anomalies[stats.anomalies.length - 1];
        if (recent.type === 'super_day') {
            insights.push(insightTemplates.anomaly.super_day(recent.date, recent.value));
        }
    }

    // Sequence insights
    stats.sequences?.slice(0, 2).forEach(seq => {
        const trigger = habitMap[seq.trigger]?.name || seq.trigger;
        const dependent = habitMap[seq.dependent]?.name || seq.dependent;
        insights.push(insightTemplates.sequence.optimal(trigger, dependent, seq.lift));
    });

    // Strength alerts
    stats.habitStrength?.forEach(hs => {
        if (hs.status === 'fragile') {
            insights.push(insightTemplates.strength.fragile_alert(
                habitMap[hs.habitId]?.name || hs.habitId
            ));
        }
    });

    // Sort by priority and return top insights
    return insights
        .filter(i => i !== null)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 8);
}
```

### 4.2 AI-Powered NLG (Premium Tier - Optional)

```javascript
// ai-coach.js (Firebase Cloud Function)

const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateAIInsight = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    // Rate limiting (10 requests per day per user)
    const rateLimitKey = `ai_insights_${context.auth.uid}_${new Date().toISOString().split('T')[0]}`;
    // ... rate limiting logic

    const { stats, habitMap, prompt } = data;

    // Build context for LLM
    const systemPrompt = `You are a concise habit coach. The user has ${Object.keys(habitMap).length} habits.

Stats summary:
- Overall completion: ${stats.overallRate}%
- Best day: ${stats.weekday?.bestDay?.day} (${stats.weekday?.bestDay?.rate}%)
- Worst day: ${stats.weekday?.worstDay?.day} (${stats.weekday?.worstDay?.rate}%)
- Trend: ${stats.trend?.direction} (${stats.trend?.percentChange}%)

Habit strengths:
${stats.habitStrength?.map(h => `- ${habitMap[h.habitId]?.name}: ${h.strength}% (${h.status})`).join('\n')}

Respond in 2-3 sentences. Be direct and actionable. No fluff.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: prompt || 'What should I focus on this week?' }] }
    ]);

    return {
        response: result.response.text(),
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
    };
});
```

**AI Costs (Gemini 1.5 Flash):**
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens
- Average request: ~500 tokens = $0.0002
- 1000 users × 10 requests/month = $2/month

---

## 5. Caching Strategy

### 5.1 Multi-Level Cache

```javascript
// insights-cache.js

/**
 * Three-level caching strategy:
 * 1. Memory cache (current session)
 * 2. IndexedDB (persistent, offline-capable)
 * 3. Firestore (only for AI responses, optional)
 */

class InsightsCache {
    constructor() {
        this.memoryCache = new Map();
        this.dbName = 'habit-tracker-insights';
        this.storeName = 'insights';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'cacheKey' });
                    store.createIndex('expiry', 'expiry', { unique: false });
                }
            };
        });
    }

    /**
     * Generate cache key based on parameters
     */
    getCacheKey(userId, period, type) {
        return `${userId}_${period}_${type}`;
    }

    /**
     * Get cached insights
     */
    async get(userId, period, type) {
        const cacheKey = this.getCacheKey(userId, period, type);

        // Check memory cache first
        if (this.memoryCache.has(cacheKey)) {
            const cached = this.memoryCache.get(cacheKey);
            if (cached.expiry > Date.now()) {
                return cached.data;
            }
            this.memoryCache.delete(cacheKey);
        }

        // Check IndexedDB
        try {
            const cached = await this.getFromDB(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                // Restore to memory cache
                this.memoryCache.set(cacheKey, cached);
                return cached.data;
            }
        } catch (e) {
            console.warn('IndexedDB read failed:', e);
        }

        return null;
    }

    /**
     * Store insights in cache
     */
    async set(userId, period, type, data, ttlMinutes = 60) {
        const cacheKey = this.getCacheKey(userId, period, type);
        const expiry = Date.now() + ttlMinutes * 60 * 1000;

        const cacheEntry = { cacheKey, data, expiry, createdAt: Date.now() };

        // Store in memory
        this.memoryCache.set(cacheKey, cacheEntry);

        // Store in IndexedDB
        try {
            await this.setInDB(cacheEntry);
        } catch (e) {
            console.warn('IndexedDB write failed:', e);
        }
    }

    async getFromDB(cacheKey) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(cacheKey);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async setInDB(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(entry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Invalidate cache when data changes
     */
    async invalidate(userId) {
        // Clear memory cache for this user
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(userId)) {
                this.memoryCache.delete(key);
            }
        }

        // Clear IndexedDB entries (optional, they'll expire naturally)
    }
}

export const insightsCache = new InsightsCache();
```

### 5.2 Cache Invalidation Strategy

```javascript
// insights.js

/**
 * Smart cache invalidation based on data changes
 */
function setupCacheInvalidation() {
    // Invalidate when habits change
    setHabitsChangeCallback(() => {
        insightsCache.invalidate(currentUser.uid);
    });

    // Invalidate when today's entry changes
    setEntryChangeCallback((entry) => {
        const today = formatDate(new Date());
        if (entry.date === today) {
            // Only invalidate if today's data changed (affects trends)
            insightsCache.invalidate(currentUser.uid);
        }
    });
}

/**
 * TTL by insight type
 */
const CACHE_TTL = {
    correlations: 24 * 60,  // 24 hours (stable metric)
    weekday: 24 * 60,       // 24 hours
    trends: 60,             // 1 hour (changes with new data)
    strength: 60,           // 1 hour
    anomalies: 60           // 1 hour
};
```

---

## 6. Implementation Plan

### Phase 1: Core Analytics Engine (3-4 days)

| Task | File | Effort |
|------|------|--------|
| Create Web Worker with statistics module | `js/analytics-worker.js` | 1 day |
| Implement all statistical algorithms | `js/analytics-worker.js` | 1 day |
| Create NLG templates | `js/nlg-templates.js` | 0.5 day |
| Build caching layer | `js/insights-cache.js` | 0.5 day |
| Worker-main thread communication | `js/insights.js` | 0.5 day |

### Phase 2: UI Integration (2-3 days)

| Task | File | Effort |
|------|------|--------|
| Insights screen HTML structure | `index.html` | 0.5 day |
| CSS styling (Swiss Brutalism) | `css/styles.css` | 0.5 day |
| Insights UI rendering | `js/ui/insights-ui.js` | 1 day |
| Interactive elements (toggles, expand) | `js/ui/insights-ui.js` | 0.5 day |
| Chart.js integration for trends | `js/ui/insights-ui.js` | 0.5 day |

### Phase 3: Integration & Testing (2 days)

| Task | File | Effort |
|------|------|--------|
| Navigation integration | `js/main.js` | 0.5 day |
| Data flow wiring | `js/insights.js` | 0.5 day |
| Edge case handling | All | 0.5 day |
| Performance testing | - | 0.5 day |

### Phase 4: AI Coach (Optional, 3-4 days)

| Task | File | Effort |
|------|------|--------|
| Firebase Functions setup | `functions/index.js` | 1 day |
| Gemini API integration | `functions/aiCoach.js` | 1 day |
| Premium tier UI | `js/ui/insights-ui.js` | 0.5 day |
| Rate limiting & error handling | `functions/aiCoach.js` | 0.5 day |

---

## 7. File Structure

```
habit-tracker/
├── js/
│   ├── analytics-worker.js     # NEW: Web Worker for stats
│   ├── insights.js             # NEW: Orchestration module
│   ├── insights-cache.js       # NEW: Caching layer
│   ├── nlg-templates.js        # NEW: NLG templates
│   ├── ui/
│   │   └── insights-ui.js      # NEW: UI rendering
│   ├── dashboard.js            # MODIFY: Add insights nav
│   └── main.js                 # MODIFY: Add insights screen
├── css/
│   └── styles.css              # MODIFY: Add insights styles
├── index.html                  # MODIFY: Add insights section
└── functions/                  # NEW: Firebase Functions (optional)
    ├── index.js
    └── aiCoach.js
```

---

## 8. Cost Analysis

### 8.1 Free Tier (Client-Side Only)

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Computation | $0 | Runs on user's device |
| Firestore reads | ~$0.01 | Existing data, no new reads |
| Firestore storage | $0 | No new data stored |
| **Total** | **~$0.01** | Essentially free |

### 8.2 Premium Tier (With AI Coach)

| Component | Per 1000 Users | Notes |
|-----------|---------------|-------|
| Firebase Functions | $0.40 | ~1000 invocations |
| Gemini API | $2.00 | ~10K requests @ $0.0002 |
| Firestore (cache) | $0.05 | AI responses cached |
| **Total** | **~$2.45/month** | Offset by subscriptions |

### 8.3 Revenue vs Cost

| Users | Free Tier Cost | Premium Revenue | Net |
|-------|---------------|-----------------|-----|
| 1,000 | $0.01 | $0 | -$0.01 |
| 1,000 | $2.45 | $150 (5% @ $3/mo) | +$147.55 |
| 10,000 | $24.50 | $1,500 (5% @ $3/mo) | +$1,475.50 |

---

## 9. Testing Strategy

### 9.1 Unit Tests

```javascript
// tests/analytics.test.js

describe('Statistical Algorithms', () => {
    describe('Phi Coefficient', () => {
        test('perfect positive correlation', () => {
            const a = [1, 1, 1, 0, 0, 0];
            const b = [1, 1, 1, 0, 0, 0];
            expect(calculatePhi(a, b)).toBe(1);
        });

        test('perfect negative correlation', () => {
            const a = [1, 1, 1, 0, 0, 0];
            const b = [0, 0, 0, 1, 1, 1];
            expect(calculatePhi(a, b)).toBe(-1);
        });

        test('no correlation', () => {
            const a = [1, 0, 1, 0, 1, 0];
            const b = [1, 1, 0, 0, 1, 0];
            const phi = calculatePhi(a, b);
            expect(Math.abs(phi)).toBeLessThan(0.3);
        });
    });

    describe('Trend Analysis', () => {
        test('detects improving trend', () => {
            const values = [50, 55, 60, 65, 70, 75, 80];
            const result = analyzeTrend(values);
            expect(result.direction).toBe('improving');
            expect(result.percentChange).toBeGreaterThan(0);
        });

        test('detects declining trend', () => {
            const values = [80, 75, 70, 65, 60, 55, 50];
            const result = analyzeTrend(values);
            expect(result.direction).toBe('declining');
        });
    });
});
```

### 9.2 Performance Benchmarks

| Operation | Target | Typical Result |
|-----------|--------|----------------|
| Full analysis (90 days, 10 habits) | <100ms | ~30ms |
| Correlation matrix (10×10) | <50ms | ~5ms |
| NLG generation (8 insights) | <10ms | ~2ms |
| Cache read (IndexedDB) | <20ms | ~5ms |

### 9.3 Edge Cases to Handle

1. **New user (no data)**: Show "Collecting data..." with progress
2. **Single habit**: Skip correlation analysis
3. **All zeros**: Handle division by zero in algorithms
4. **Missing days**: Treat as skipped (don't count against metrics)
5. **Archived habits**: Exclude from analysis
6. **Large datasets (365+ days)**: Limit to 365 days max

---

## Appendix: Quick Reference

### Algorithm Complexity

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| Phi coefficient | O(n) | O(1) | n = days |
| Correlation matrix | O(h² × n) | O(h²) | h = habits |
| Trend analysis | O(n) | O(1) | Linear regression |
| Anomaly detection | O(n) | O(1) | Single pass |
| Habit strength | O(n) | O(1) | Sequential |
| Sequence analysis | O(h² × n) | O(h²) | Same as correlation |

### Insight Priority Ranking

| Type | Base Priority | Modifier |
|------|--------------|----------|
| Fragile habit alert | 85 | - |
| Super day | 90 | - |
| Declining trend | 80 | +|percent|/2 |
| Strong correlation | 100×phi | - |
| Worst day pattern | 70 | +gap/2 |
| Improving trend | 65 | +percent/2 |

---

*Specification version 1.0 | January 2025*
*Ready for implementation*
