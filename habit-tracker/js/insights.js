// ========== INSIGHTS ORCHESTRATION ==========
// Main module for Smart Insights feature
// Coordinates data fetching, Web Worker communication, and caching

import { getDb, collection, getDocs } from './firebase-init.js';
import { habits, currentUser, accountCreatedAt } from './state.js';
import { formatDate } from './utils.js';
import { insightsCache, CACHE_TTL } from './insights-cache.js';

// ========== STATE ==========

// Version for cache-busting worker and clearing stale IndexedDB data
const CACHE_VERSION = 'v3.2';

// One-time cache cleanup for corrupted data from previous versions
(function checkCacheVersion() {
    const storedVersion = localStorage.getItem('insights_cache_version');
    if (storedVersion !== CACHE_VERSION) {
        indexedDB.deleteDatabase('habit-tracker-insights');
        localStorage.setItem('insights_cache_version', CACHE_VERSION);
    }
})();

let insightsWorker = null;
let insightsUpdateCallbacks = new Set();

// Track pending one-time callbacks to clear on new requests
let pendingResolveCallbacks = new Set();

// Request counter for unique IDs
let requestCounter = 0;

// Current insights state
export let insightsState = {
    period: 30,           // 7, 30, or 90 days
    type: 'morning',      // 'morning' or 'evening'
    isLoading: false,
    lastResults: null,
    requestKey: null,
    pendingRequestId: null  // Track the ID of the in-flight request
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

    // Cache-busting: add version to URL to force browser to load fresh worker
    insightsWorker = new Worker(`./js/analytics-worker.js?v=${CACHE_VERSION}`);
    insightsWorker.onmessage = handleWorkerMessage;

    insightsWorker.onerror = (error) => {
        console.error('Analytics Worker error:', error);
        insightsState.isLoading = false;
        notifyInsightsUpdate({
            error: true,
            message: 'Failed to analyze data'
        });
    };
}

/**
 * Handle messages from the Web Worker
 */
function handleWorkerMessage(e) {
    const { type, payload } = e.data;

    switch(type) {
        case 'RESULTS':
            const resultType = payload.metadata?.type;

            // Validate request key - ignore stale results
            if (payload.requestKey && payload.requestKey !== insightsState.requestKey) {
                return;
            }

            // Additional validation: verify the result type matches current state
            if (resultType && resultType !== 'all' && resultType !== insightsState.type) {
                return;
            }

            insightsState.isLoading = false;
            insightsState.pendingRequestId = null;
            insightsState.lastResults = payload;

            // Cache the results - use the result's type to ensure correct cache key
            if (currentUser?.uid && !payload.error && resultType) {
                insightsCache.set(
                    currentUser.uid,
                    insightsState.period,
                    resultType,
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
function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

async function fetchEntriesForInsights(periodDays = 90) {
    const db = getDb();
    const endDate = normalizeDate(new Date());
    const startDate = normalizeDate(new Date(endDate));
    startDate.setDate(startDate.getDate() - (periodDays - 1));

    if (accountCreatedAt) {
        const createdAtDate = normalizeDate(accountCreatedAt);
        if (createdAtDate > startDate) {
            startDate.setTime(createdAtDate.getTime());
        }
    }

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

    return {
        entries,
        periodStart: startDateStr,
        periodEnd: endDateStr
    };
}

/**
 * Prepare data package for Web Worker
 * @param {object} habitsData - Habits object with morning/evening arrays
 * @param {object} entries - Entries keyed by date
 * @returns {object} Data package for worker
 */
function buildDateRange(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return [];
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dates.push(formatDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

function prepareDataForWorker(habitsData, entries, periodStart, periodEnd) {
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

    // Get sorted dates across the full period window
    const dates = buildDateRange(periodStart, periodEnd);
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
 * Clear all pending resolve callbacks from previous requests
 * This prevents stale results from being processed
 */
function clearPendingCallbacks() {
    for (const callback of pendingResolveCallbacks) {
        insightsUpdateCallbacks.delete(callback);
    }
    pendingResolveCallbacks.clear();
}

/**
 * Run insights analysis
 * @param {number} period - Time period (7, 30, or 90 days)
 * @param {string} type - Filter type ('all', 'morning', 'evening')
 */
export async function runInsightsAnalysis(period = 30, type = 'all', options = {}) {
    const { forceRefresh = false } = options;
    if (!currentUser?.uid) {
        return null;
    }

    // Generate unique request ID FIRST, before any async operations
    requestCounter++;
    const requestId = requestCounter;
    const normalizedType = type === 'evening' ? 'evening' : 'morning';
    const requestKey = `${period}_${normalizedType}_${requestId}_${Date.now()}`;

    // Clear any pending callbacks from previous requests to prevent race conditions
    clearPendingCallbacks();

    // Update state synchronously BEFORE any async operations
    insightsState.period = period;
    insightsState.type = normalizedType;
    insightsState.isLoading = true;
    insightsState.requestKey = requestKey;
    insightsState.pendingRequestId = requestId;

    // Check cache first (only if not forcing refresh)
    if (!forceRefresh) {
        const cached = await insightsCache.get(currentUser.uid, period, normalizedType);

        // Verify this request is still the current one after async cache check
        if (insightsState.pendingRequestId !== requestId) {
            return null;
        }

        if (cached) {
            insightsState.isLoading = false;
            insightsState.pendingRequestId = null;
            insightsState.lastResults = cached;
            notifyInsightsUpdate(cached);
            return cached;
        }
    }

    // Ensure worker is initialized
    if (!insightsWorker) {
        initInsightsWorker();
    }

    // Create a promise that resolves when results arrive
    const resultsPromise = new Promise((resolve) => {
        const resolveOnce = (payload) => {
            // Only resolve if this callback hasn't been cleared
            if (pendingResolveCallbacks.has(resolveOnce)) {
                resolve(payload);
                pendingResolveCallbacks.delete(resolveOnce);
                insightsUpdateCallbacks.delete(resolveOnce);
            }
        };
        // Track this callback so it can be cleared if a new request comes in
        pendingResolveCallbacks.add(resolveOnce);
        insightsUpdateCallbacks.add(resolveOnce);
    });

    try {
        // Fetch entries
        const { entries, periodStart, periodEnd } = await fetchEntriesForInsights(period);

        // Verify this request is still the current one after async fetch
        if (insightsState.pendingRequestId !== requestId) {
            return null;
        }

        // Prepare data for worker
        const workerData = prepareDataForWorker(habits, entries, periodStart, periodEnd);
        workerData.type = normalizedType;
        workerData.entries = entries;
        workerData.periodStart = periodStart;
        workerData.periodEnd = periodEnd;
        workerData.requestKey = requestKey;

        // Send to worker
        insightsWorker.postMessage({
            type: 'ANALYZE',
            payload: workerData
        });
    } catch (error) {
        console.error('Error running insights analysis:', error);
        insightsState.isLoading = false;
        insightsState.pendingRequestId = null;
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
    // Clear the insights container immediately to prevent showing stale data
    const container = document.getElementById('insights-container');
    if (container) {
        container.innerHTML = '<div class="insights-loading-inline">Loading...</div>';
    }

    // Invalidate cache in background, but start analysis immediately
    invalidateInsightsCache();
    runInsightsAnalysis(period, insightsState.type, { forceRefresh: true });
}

/**
 * Update type filter and re-analyze
 * @param {string} type - New type ('all', 'morning', 'evening')
 */
export function setInsightsType(type) {
    const normalizedType = type === 'evening' ? 'evening' : 'morning';

    // Clear the insights container immediately to prevent showing stale data
    const container = document.getElementById('insights-container');
    if (container) {
        container.innerHTML = '<div class="insights-loading-inline">Loading...</div>';
    }

    // Invalidate cache in background, but start analysis immediately
    invalidateInsightsCache();
    runInsightsAnalysis(insightsState.period, normalizedType, { forceRefresh: true });
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
    }
}
