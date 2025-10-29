// service-worker.js - Para hacer la PWA funcional offline

const CACHE_NAME = 'mototaxi-j-cache-v1';
const urlsToCache = [
  './index.html',
  './main.css',
  './utils.js',
  './db.js',
  './app.js',
  './manifest.json',
  './icon-192.png'
];

// Instalación: cachear los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(console.warn)
  );
});

// Activación: limpiar cachés antiguos (opcional)
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

// Fetch: servir desde caché primero, red como respaldo
self.addEventListener('fetch', (event) => {
  // Solo cachear solicitudes HTTP/HTTPS
  if (!(event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
    return;
  }

  // No cachear solicitudes POST o con credenciales (aunque no las uses)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }
        // Si no, ir a la red
        return fetch(event.request).catch(() => {
          // Opcional: servir una página offline (no incluida aquí)
        });
      })
  );
});