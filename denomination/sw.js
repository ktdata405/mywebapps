const CACHE_NAME = 'denominations-app-v5';
const STATIC_ASSETS = [
  './denominations.html',
  './denominations.html?from=standalone',
  './denominationsreport.html',
  './install.html',
  './manifest.json',
  '../root/logo.png',
  '../root/icon-192.png',
  '../root/icon-512.png',
  '../root/icon-192-maskable.png',
  '../root/icon-512-maskable.png',
  '../config.js',
  '../ktui.js',
  '../theme.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Prefer fresh API responses and fallback to cached data when offline.
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
