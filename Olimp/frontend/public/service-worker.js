// Service Worker for Alif24 Olimp PWA
const CACHE_NAME = 'alif24-olimp-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first with cache fallback for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
        return;
    }

    // For navigation requests (HTML pages) — Network first
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => caches.match(event.request) || caches.match('/index.html'))
        );
        return;
    }

    // For static assets (JS, CSS, images) — Cache first
    if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|eot)$/)
    ) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    return response;
                });
            })
        );
        return;
    }
});
