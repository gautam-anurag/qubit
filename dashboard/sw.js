const CACHE_NAME = 'qubit-dashboard-v1.0.0';
const OFFLINE_URL = './offline.html'; 

const ASSETS_TO_CACHE = [
    './',
    './app.html',
    OFFLINE_URL,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/@phosphor-icons/web',
    'https://gautam-anurag.github.io/assets/brand/qubit/qubit-icon.png'
];

// Install Event: Pre-cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[QUBIT SW] Caching core assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up legacy caches to free up storage
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[QUBIT SW] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Fetch Event: Dynamic caching with offline fallback
self.addEventListener('fetch', event => {
    // Only intercept standard GET requests (ignores Firebase API calls, etc.)
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests that might fail CORS if strictly cached, 
    // unless they are our known CDNs (Google Fonts, Phosphor)
    const url = new URL(event.request.url);
    if (!url.origin.includes(self.location.origin) && 
        !url.origin.includes('fonts.googleapis.com') && 
        !url.origin.includes('fonts.gstatic.com') && 
        !url.origin.includes('unpkg.com') &&
        !url.origin.includes('gautam-anurag.github.io')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // 1. Return the cached version instantly if available for speed
            if (cachedResponse) {
                return cachedResponse; 
            }
            
            // 2. Fetch from the network if not in cache
            return fetch(event.request).then(networkResponse => {
                // Ensure the response is valid before caching
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
                    return networkResponse;
                }

                // 3. Clone the response and save it to the cache dynamically for future use
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(error => {
                console.warn('[QUBIT SW] Fetch failed, checking offline fallback:', event.request.url, error);
                
                // 4. Offline Fallback Logic: Show offline.html for page navigation
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});