// Auto-purge all caches and ensure fresh network fetch
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Always pass through directly to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

