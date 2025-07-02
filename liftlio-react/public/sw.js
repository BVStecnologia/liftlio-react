// Service Worker for aggressive caching on mobile
const CACHE_NAME = 'liftlio-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/critical.css',
  '/imagens/dashboard-hero-dark-mobile.jpg',
  '/imagens/dashboard-hero-light-mobile.jpg',
  '/imagens/dashboard-hero-dark-mobile.webp',
  '/imagens/dashboard-hero-light-mobile.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache images and fonts
          if (event.request.url.match(/\.(jpg|jpeg|png|webp|woff2|woff)$/)) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          
          return response;
        });
      })
  );
});