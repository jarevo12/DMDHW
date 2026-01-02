// ========== INSIGHTS CACHE ==========
// IndexedDB caching layer for computed insights
// Part of the Smart Insights feature

/**
 * Three-level caching strategy:
 * 1. Memory cache (current session)
 * 2. IndexedDB (persistent, offline-capable)
 */
class InsightsCache {
    constructor() {
        this.memoryCache = new Map();
        this.dbName = 'habit-tracker-insights';
        this.storeName = 'insights';
        this.db = null;
    }

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => {
                console.warn('IndexedDB failed to open:', request.error);
                resolve(); // Don't reject, cache will just use memory
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB cache initialized');
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
     * @param {string} userId - User ID
     * @param {number} period - Time period (7, 30, 90)
     * @param {string} type - Filter type (all, morning, evening)
     * @returns {string} Cache key
     */
    getCacheKey(userId, period, type) {
        return `${userId}_${period}_${type}`;
    }

    /**
     * Get cached insights
     * @param {string} userId - User ID
     * @param {number} period - Time period
     * @param {string} type - Filter type
     * @returns {object|null} Cached data or null
     */
    async get(userId, period, type) {
        const cacheKey = this.getCacheKey(userId, period, type);

        // Check memory cache first
        if (this.memoryCache.has(cacheKey)) {
            const cached = this.memoryCache.get(cacheKey);
            if (cached.expiry > Date.now()) {
                console.log('Cache hit (memory):', cacheKey);
                return cached.data;
            }
            this.memoryCache.delete(cacheKey);
        }

        // Check IndexedDB
        if (this.db) {
            try {
                const cached = await this.getFromDB(cacheKey);
                if (cached && cached.expiry > Date.now()) {
                    // Restore to memory cache
                    this.memoryCache.set(cacheKey, cached);
                    console.log('Cache hit (IndexedDB):', cacheKey);
                    return cached.data;
                }
            } catch (e) {
                console.warn('IndexedDB read failed:', e);
            }
        }

        console.log('Cache miss:', cacheKey);
        return null;
    }

    /**
     * Store insights in cache
     * @param {string} userId - User ID
     * @param {number} period - Time period
     * @param {string} type - Filter type
     * @param {object} data - Data to cache
     * @param {number} ttlMinutes - Time to live in minutes
     */
    async set(userId, period, type, data, ttlMinutes = 60) {
        const cacheKey = this.getCacheKey(userId, period, type);
        const expiry = Date.now() + ttlMinutes * 60 * 1000;

        const cacheEntry = {
            cacheKey,
            data,
            expiry,
            createdAt: Date.now()
        };

        // Store in memory
        this.memoryCache.set(cacheKey, cacheEntry);

        // Store in IndexedDB
        if (this.db) {
            try {
                await this.setInDB(cacheEntry);
                console.log('Cached to IndexedDB:', cacheKey);
            } catch (e) {
                console.warn('IndexedDB write failed:', e);
            }
        }
    }

    /**
     * Read from IndexedDB
     */
    async getFromDB(cacheKey) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(cacheKey);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Write to IndexedDB
     */
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
     * @param {string} userId - User ID to invalidate cache for
     */
    async invalidate(userId) {
        console.log('Invalidating cache for user:', userId);

        // Clear memory cache for this user
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(userId)) {
                this.memoryCache.delete(key);
            }
        }

        // Clear IndexedDB entries for this user
        if (this.db) {
            try {
                await this.clearUserFromDB(userId);
            } catch (e) {
                console.warn('IndexedDB clear failed:', e);
            }
        }
    }

    /**
     * Clear user entries from IndexedDB
     */
    async clearUserFromDB(userId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            // Get all keys and delete matching ones
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key.startsWith(userId)) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clean up expired entries
     */
    async cleanup() {
        const now = Date.now();

        // Clean memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }

        // Clean IndexedDB
        if (this.db) {
            try {
                await this.cleanupDB(now);
            } catch (e) {
                console.warn('IndexedDB cleanup failed:', e);
            }
        }
    }

    /**
     * Clean expired entries from IndexedDB
     */
    async cleanupDB(now) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('expiry');

            // Get entries where expiry < now
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

// Cache TTL configuration by insight type
export const CACHE_TTL = {
    correlations: 24 * 60,  // 24 hours (stable metric)
    weekday: 24 * 60,       // 24 hours
    trends: 60,             // 1 hour (changes with new data)
    strength: 60,           // 1 hour
    anomalies: 60,          // 1 hour
    default: 60             // Default 1 hour
};

// Export singleton instance
export const insightsCache = new InsightsCache();
