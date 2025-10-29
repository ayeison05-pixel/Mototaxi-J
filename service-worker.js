// service-worker.js - Corregido para GitHub Pages

const CACHE_NAME = 'mototaxi-j-cache-v2';
const urlsToCache = [
  '/mototaxi-j/',
  '/mototaxi-j/index.html',
  '/mototaxi-j/main.css',
  '/mototaxi-j/utils.js',
  '/mototaxi-j/db.js',
  '/mototaxi-j/app.js',
  '/mototaxi-j/manifest.json',
  '/mototaxi-j/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(console.warn)
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!(event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
    return;
  }
  if (event.request.method !== 'GET') {
    return;
  }

  // Solo cachear recursos del mismo origen
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});