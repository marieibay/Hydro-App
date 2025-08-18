
const CACHE_NAME = 'hydropet-v1.3'; // Incremented cache version
// This list should be updated with all the files your app needs to run offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
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
  // More robust cache-first, falling back to network strategy.
  // This makes the app work offline much more reliably.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchedResponse = fetch(event.request).then((networkResponse) => {
        // We only cache successful responses, and not from third-party scripts like esm.sh
        if (networkResponse.status === 200 && !event.request.url.includes('esm.sh')) {
           cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // If the network fails and we don't have a cached response,
        // we can't do much. In a more complex app, we might return a fallback page.
        if (cachedResponse) {
          return cachedResponse;
        }
      });
      
      return cachedResponse || fetchedResponse;
    })
  );
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

// Listen for messages from the main app to show a notification (for in-app triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'show-notification') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Listen for 'push' events from the browser's push service
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  let data = { title: 'HydroPet Reminder', body: 'Time for some water!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Push event data parse error:', e);
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: 'hydropet-reminder',
    actions: [{ action: 'open', title: 'Open App' }]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
