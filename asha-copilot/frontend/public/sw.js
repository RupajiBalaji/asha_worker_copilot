const CACHE_NAME = 'asha-copilot-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Fail gracefully if offline during install
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache for offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Always try network first for API calls
  if (event.request.url.includes('/api') || event.request.url.includes('localhost:8000')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503 }))
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        // Don't cache if response is not ok
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
