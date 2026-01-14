const CACHE_NAME = 'habit-tracker-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    // Main entry point
    '/js/main.js',
    // Core modules
    '/js/firebase-init.js',
    '/js/state.js',
    '/js/constants.js',
    '/js/utils.js',
    '/js/routines-config.js',
    // Feature modules
    '/js/auth.js',
    '/js/profile.js',
    '/js/habits.js',
    '/js/entries.js',
    '/js/schedule.js',
    '/js/modals.js',
    '/js/onboarding.js',
    '/js/dashboard.js',
    '/js/calendar-picker.js',
    // UI modules
    '/js/ui/screens.js',
    '/js/ui/progress.js',
    '/js/ui/habits-ui.js',
    '/js/ui/settings-ui.js',
    // Assets
    '/assets/logo-white-back.svg',
    '/assets/icons/icon-180.png',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                // Cache static assets
                return cache.addAll(STATIC_ASSETS)
                    .catch(err => {
                        console.log('Error caching static assets:', err);
                        // Continue even if some assets fail to cache
                        return Promise.resolve();
                    });
            })
            .then(() => {
                // Try to cache external assets separately
                return caches.open(CACHE_NAME)
                    .then(cache => {
                        return Promise.all(
                            EXTERNAL_ASSETS.map(url =>
                                cache.add(url).catch(err => {
                                    console.log('Failed to cache external:', url);
                                })
                            )
                        );
                    });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Firebase and other API requests
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('firebase')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached version and update cache in background
                    event.waitUntil(
                        fetch(request)
                            .then(networkResponse => {
                                if (networkResponse && networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then(cache => cache.put(request, networkResponse));
                                }
                            })
                            .catch(() => {})
                    );
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(request)
                    .then(networkResponse => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, responseToCache));
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline fallback for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'sync-habits') {
        event.waitUntil(
            // Sync logic handled by Firebase's offline persistence
            Promise.resolve()
        );
    }
});

// Listen for messages from the main app
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
