const CACHE_NAME = 'kt-apps-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/auth.js',
  '/localization.js',
  '/config.js',
  '/root/logo.png',
  '/cashew/cashew.html',
  '/cashew/cashewreport.html',
  '/cashew/cashew_google_apps_script.js',
  '/rent/tenet.html',
  '/msi/msi.html',
  '/debts/debts.html',
  '/denomination/denominations.html',
  '/calculator/calculator.html',
  '/loan/loan.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
