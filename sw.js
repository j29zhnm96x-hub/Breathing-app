const CACHE_NAME = 'breathe-v1.0.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './IMG/favicon.png'
];

const AUDIO_ASSETS = [
    './Audio/last-breathe_now-hold.mp3',
    './Audio/three_two_one.mp3',
    './Audio/hold_for_10_seconds.mp3'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache static assets first (required)
            return cache.addAll(STATIC_ASSETS).then(() => {
                // Cache audio files (optional - don't fail if missing)
                return Promise.allSettled(
                    AUDIO_ASSETS.map(url => cache.add(url).catch(() => {}))
                );
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // For navigation requests, try network first (app shell)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // For other requests: cache first, then network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                // Cache audio/image responses dynamically
                if (response.ok && (
                    request.url.endsWith('.mp3') ||
                    request.url.endsWith('.ogg') ||
                    request.url.endsWith('.png') ||
                    request.url.endsWith('.jpg')
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => {
                // Return offline fallback for missing resources
                return new Response('', { status: 404 });
            });
        })
    );
});
