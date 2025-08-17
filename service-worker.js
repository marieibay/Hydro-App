const CACHE_NAME = 'hydropet-v1.1';
// This list should be updated with all the files your app needs to run offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // NOTE: In a real build system, you'd add JS/CSS bundles here.
  // For this environment, we'll keep it simple. The offline capability might be partial.
];

self.addEventListener('install', (event) => {
  // Perform install steps: open a cache and add all URLs to it.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately.
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => clients.claim()) // Take control of uncontrolled clients.
  );
});

self.addEventListener('fetch', (event) => {
  // Use a "cache-first" strategy for navigation requests.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for the app is already open, focus it.
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Otherwise, open a new window.
      return clients.openWindow('/');
    })
  );
});
