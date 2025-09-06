// Service Worker for Liftlio - Mobile Performance Optimized
const CACHE_NAME = 'liftlio-v1';
const MOBILE_ASSETS = [
  '/imagens/dashboard-hero-dark-mobile.jpg',
  '/imagens/dashboard-hero-light-mobile.jpg',
  '/imagens/dashboard-hero-dark-mobile.webp',
  '/imagens/dashboard-hero-light-mobile.webp'
];

const DESKTOP_ASSETS = [
  '/imagens/dashboard-hero-dark.jpg',
  '/imagens/dashboard-hero-light.jpg',
  '/imagens/dashboard-hero-dark.webp',
  '/imagens/dashboard-hero-light.webp'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  const isMobile = /Mobile|Android/i.test(self.navigator.userAgent);
  const assetsToCache = isMobile ? MOBILE_ASSETS : DESKTOP_ASSETS;
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
  
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache first for images
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only cache images and fonts
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          // Return from cache
          return response;
        }
        
        // Fetch from network and cache
        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
    );
  }
});