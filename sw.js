const CACHE_NAME = 'kt-apps-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './auth.js',
  './localization.js',
  './config.js',
  './ktui.js',
  './ktcache.js',
  './manifest.json',
  './root/logo.png',
  './cashew/cashew.html',
  './cashew/cashewreport.html',
  './cashew/manifest.json',
  './milk/milk.html',
  './milk/milkreport.html',
  './milk/manifest.json',
  './rent/tenet.html',
  './rent/tenetreport.html',
  './rent/script.js',
  './rent/manifest.json',
  './msi/msi.html',
  './msi/msireport.html',
  './msi/manifest.json',
  './debts/debts.html',
  './debts/debtsreport.html',
  './debts/manifest.json',
  './denomination/denominations.html',
  './denomination/denominationsreport.html',
  './denomination/manifest.json',
  './calculator/calculator.html',
  './calculator/manifest.json',
  './loan/loan.html',
  './loan/loanreport.html',
  './loan/script.js',
  './loan/manifest.json',
  './scan/scan.html',
  './scan/scanreport.html',
  './scan/scan.js',
  './scan/scan.css',
  './scan/manifest.json',
  './temp.html',
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

  // For Google Script API GET calls — stale-while-revalidate
  // POST calls always go to network (never cache writes)
  if (url.hostname === 'script.google.com') {
    if (event.request.method === 'POST') {
      // Always network for POSTs — no caching
      event.respondWith(fetch(event.request));
      return;
    }
    // GET: serve from cache immediately, update cache in background
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
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
