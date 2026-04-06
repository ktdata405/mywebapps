const CACHE_NAME = 'kt-apps-v3';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './auth.js',
  './localization.js',
  './config.js',
  './manifest.json',
  './root/logo.png',
  './cashew/cashew.html',
  './cashew/cashewreport.html',
  './cashew/cashew_google_apps_script.js',
  './rent/tenet.html',
  './rent/tenetreport.html',
  './rent/script.js',
  './msi/msi.html',
  './msi/msireport.html',
  './debts/debts.html',
  './debts/debtsreport.html',
  './denomination/denominations.html',
  './denomination/denominationsreport.html',
  './calculator/calculator.html',
  './calculator/village_interest.html',
  './calculator/interest_float_flat.html',
  './calculator/gold_loan.html',
  './calculator/land.html',
  './calculator/lamf.html',
  './calculator/govt_schemes.html',
  './calculator/vehicle_info.html',
  './loan/loan.html',
  './loan/loanreport.html',
  './loan/script.js',
  './loan/style.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
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
