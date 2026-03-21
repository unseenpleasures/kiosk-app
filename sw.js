// sw.js — Service Worker for ID Card Factory Kiosk PWA
// Cache-first strategy with immediate activation (skipWaiting + clients.claim)
// Cache version: bump CACHE_NAME to force cache refresh on next update

var CACHE_NAME = 'kiosk-v8';

var APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/src/app.js',
  '/src/config.js',
  '/src/db.js',
  '/src/sync.js',
  '/src/catalogue.js',
  '/src/admin.js',
  '/src/email.js',
  '/src/router.js',
  '/src/idle.js',
  '/styles/main.css',
  '/styles/animations.css',
  '/assets/logo.svg',
  '/assets/qr-code.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-1024.png',
  '/assets/fonts/bebas-neue.woff2',
  '/assets/fonts/inter-400.woff2',
  '/assets/fonts/inter-700.woff2'
];
// Note: splash images are NOT included — Safari loads them via apple-touch-startup-image
// mechanism, not via fetch requests intercepted by the SW.

// Install event — precache all app shell files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// Activate event — delete old caches and claim all clients immediately
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — cache-first strategy
// 1. Try cache. If hit, return cached response.
// 2. If miss, fetch from network.
// 3. On successful GET response (200), clone and store in cache for future offline use.
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function(response) {
        if (event.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
