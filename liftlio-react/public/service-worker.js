// Development Service Worker - Cleans up old caches and unregisters itself
// This file exists to help transition from the old caching service worker

// Delete all caches
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      // Delete all caches
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Unregister this service worker after cleaning up
      console.log('Cleaning up: Service worker will unregister itself');
      return self.registration.unregister();
    })
  );
});

// Don't handle any fetch events - let everything go to network
self.addEventListener('fetch', () => {
  // Do nothing - let the browser handle all requests normally
});