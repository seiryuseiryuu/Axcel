/// <reference lib="webworker" />

const CACHE_NAME = 'skillplus-v1';
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, cache fallback for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API routes
    if (url.pathname.startsWith('/api/')) return;

    // Skip Supabase requests
    if (url.hostname.includes('supabase')) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses for static assets
                if (response.ok && (
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname.endsWith('.png') ||
                    url.pathname.endsWith('.svg') ||
                    url.pathname.endsWith('.ico')
                )) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Return cached version or offline page
                return caches.match(request).then((cached) => {
                    if (cached) return cached;

                    // For navigation requests, show offline page
                    if (request.mode === 'navigate') {
                        return caches.match('/offline');
                    }

                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
