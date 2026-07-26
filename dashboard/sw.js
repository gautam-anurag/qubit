const CACHE_NAME = 'qubit-dashboard-v1.0.0';
const OFFLINE_URL = './offline.html'; 

const ASSETS_TO_CACHE = [
    './',
    './app.html',
    OFFLINE_URL,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/@phosphor-icons/web',
    'https://gautam-anurag.github.io/qubit/assets/brand/qubit/qubit-icon.png' // Fixed missing '/qubit/' subfolder
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

// Activate Event: Clean up legacy caches
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

// Fetch Event
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

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
            if (cachedResponse) {
                return cachedResponse; 
            }
            
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(error => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});