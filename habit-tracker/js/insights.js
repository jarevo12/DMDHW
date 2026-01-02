// ========== INSIGHTS ORCHESTRATION ==========
// Main module for Smart Insights feature
// Coordinates data fetching, Web Worker communication, and caching

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser } from './state.js';
import { formatDate } from './utils.js';
import { insightsCache, CACHE_TTL } from './insights-cache.js';

// ========== STATE ==========

let insightsWorker = null;
let insightsUpdateCallbacks = new Set();

// Current insights state
export let insightsState = {
    period: 30,           // 7, 30, or 90 days
    type: 'all',          // 'all', 'morning', 'evening'
    isLoading: false,
    lastResults: null
};

// ========== CALLBACKS ==========

/**
 * Set callback for when insights are updated
 * @param {function} callback - Callback function
 */
export function setInsightsUpdateCallback(callback) {
    if (typeof callback === 'function') {
        insightsUpdateCallbacks.add(callback);
    }
}

function notifyInsightsUpdate(payload) {
    insightsUpdateCallbacks.forEach(callback => {
        try {
            callback(payload);
        } catch (error) {
            console.error('Insights update callback error:', error);
        }
    });
}

// ========== WORKER MANAGEMENT ==========

/**
 * Initialize the Web Worker for analytics
 */
export function initInsightsWorker() {
    if (insightsWorker) {
        insightsWorker.terminate();
    }

    insightsWorker = new Worker('./js/analytics-worker.js');

    insightsWorker.onmessage = handleWorkerMessage;

    insightsWorker.onerror = (error) => {
        console.error('Analytics Worker error:', error);
        insightsState.isLoading = false;
        notifyInsightsUpdate({
            error: true,
            message: 'Failed to analyze data'
        });
    };

    console.log('Insights Worker initialized');
}

/**
 * Handle messages from the Web Worker
 */
function handleWorkerMessage(e) {
    const { type, payload } = e.data;

    switch(type) {
        case 'RESULTS':
            insightsState.isLoading = false;
            insightsState.lastResults = payload;

            // Cache the results
            if (currentUser?.uid && !payload.error) {
                insightsCache.set(
                    currentUser.uid,
                    insightsState.period,
                    insightsState.type,
                    payload,
                    CACHE_TTL.default
                );
            }

            // Notify UI
            notifyInsightsUpdate(payload);
            break;

        default:
            console.warn('Unknown worker message type:', type);
    }
}

// ========== DATA FETCHING ==========

/**
 * Fetch entries for insights analysis
 * @param {number} periodDays - Number of days to fetch
 * @returns {object} Entries keyed by date
 */
async function fetchEntriesForInsights(periodDays = 90) {
    const db = getDb();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Fetch all entries
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const snapshot = await getDocs(entriesRef);

    // Filter to date range
    const entries = {};
    snapshot.forEach(doc => {
        const date = doc.id; // YYYY-MM-DD
        if (date >= startDateStr && date <= endDateStr) {
            entries[date] = doc.data();
        }
    });

    return entries;
}

/**
 * Prepare data package for Web Worker
 * @param {object} habitsData - Habits object with morning/evening arrays
 * @param {object} entries - Entries keyed by date
 * @returns {object} Data package for worker
 */
function prepareDataForWorker(habitsData, entries) {
    // Create habit lookup map
    const habitMap = {};
    const allHabits = [...(habitsData.morning || []), ...(habitsData.evening || [])];

    allHabits.forEach(h => {
        if (!h.archived) {
            habitMap[h.id] = {
                id: h.id,
                name: h.name,
                type: h.type,
                schedule: h.schedule
            };
        }
    });

    // Get sorted dates
    const dates = Object.keys(entries).sort();
    const habitIds = Object.keys(habitMap);

    // Convert entries to binary matrix (days x habits)
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
            dateRange: {
                start: dates[0] || null,
                end: dates[dates.length - 1] || null
            }
        }
    };
}

// ========== MAIN API ==========

/**
 * Run insights analysis
 * @param {number} period - Time period (7, 30, or 90 days)
 * @param {string} type - Filter type ('all', 'morning', 'evening')
 */
export async function runInsightsAnalysis(period = 30, type = 'all') {
    if (!currentUser?.uid) {
        console.warn('No user logged in');
        return null;
    }

    // Update state
    insightsState.period = period;
    insightsState.type = type;
    insightsState.isLoading = true;

    // Check cache first
    const cached = await insightsCache.get(currentUser.uid, period, type);
    if (cached) {
        insightsState.isLoading = false;
        insightsState.lastResults = cached;
        notifyInsightsUpdate(cached);
        return cached;
    }

    // Ensure worker is initialized
    if (!insightsWorker) {
        initInsightsWorker();
    }

    const resultsPromise = new Promise((resolve) => {
        const resolveOnce = (payload) => {
            resolve(payload);
            insightsUpdateCallbacks.delete(resolveOnce);
        };
        insightsUpdateCallbacks.add(resolveOnce);
    });

    try {
        // Fetch entries
        const entries = await fetchEntriesForInsights(period);

        // Prepare data for worker
        const workerData = prepareDataForWorker(habits, entries);
        workerData.type = type;

        // Send to worker
        insightsWorker.postMessage({
            type: 'ANALYZE',
            payload: workerData
        });
    } catch (error) {
        console.error('Error running insights analysis:', error);
        insightsState.isLoading = false;
        const errorPayload = {
            error: true,
            message: 'Failed to load data'
        };
        notifyInsightsUpdate(errorPayload);
        return errorPayload;
    }

    return resultsPromise;
}

/**
 * Update period and re-analyze
 * @param {number} period - New period (7, 30, 90)
 */
export function setInsightsPeriod(period) {
    runInsightsAnalysis(period, insightsState.type);
}

/**
 * Update type filter and re-analyze
 * @param {string} type - New type ('all', 'morning', 'evening')
 */
export function setInsightsType(type) {
    runInsightsAnalysis(insightsState.period, type);
}

/**
 * Force refresh insights (bypass cache)
 */
export async function refreshInsights() {
    if (currentUser?.uid) {
        await insightsCache.invalidate(currentUser.uid);
    }
    runInsightsAnalysis(insightsState.period, insightsState.type);
}

/**
 * Get current insights state
 * @returns {object} Current state
 */
export function getInsightsState() {
    return { ...insightsState };
}

// ========== CACHE INVALIDATION ==========

/**
 * Invalidate cache for current user
 * Should be called when habits or entries change
 */
export async function invalidateInsightsCache() {
    if (currentUser?.uid) {
        await insightsCache.invalidate(currentUser.uid);
        console.log('Insights cache invalidated');
    }
}
