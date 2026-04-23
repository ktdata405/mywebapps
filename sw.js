const CACHE_NAME = 'kt-apps-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './auth.js',
  './localization.js',
  './config.js',
  './manifest.json',
  './root/logo.png',
  './cashew/cashew.html',
  './cashew/manifest.json',
  './milk/milk.html',
  './milk/manifest.json',
  './rent/tenet.html',
  './rent/manifest.json',
  './msi/msi.html',
  './msi/manifest.json',
  './debts/debts.html',
  './debts/manifest.json',
  './denomination/denominations.html',
  './denomination/manifest.json',
  './calculator/calculator.html',
  './calculator/manifest.json',
  './loan/loan.html',
  './loan/manifest.json',
  './temp.html',
  './scan/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
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
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For Google Script API calls, try network first, then fallback to cache
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for static assets
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
