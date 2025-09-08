// Cache Control and Version Management
// This script handles cache busting and ensures users always see the latest version

(function() {
    // Version should be updated with each deployment
    const APP_VERSION = 'v2.1.0-' + Date.now();
    const STORAGE_KEY = 'liftlio-app-version';
    
    // Get stored version
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    // Check if version has changed
    if (storedVersion && storedVersion !== APP_VERSION) {
        console.log('[Cache Control] New version detected:', APP_VERSION);
        
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }
        
        // Clear session storage
        sessionStorage.clear();
        
        // Update version
        localStorage.setItem(STORAGE_KEY, APP_VERSION);
        
        // Force reload with cache bypass
        window.location.reload(true);
    } else {
        // Store current version
        localStorage.setItem(STORAGE_KEY, APP_VERSION);
    }
    
    // Add version to all static asset requests
    window.APP_VERSION = APP_VERSION;
    
    // Service Worker update check (if exists)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            console.log('[Cache Control] Service Worker updated, reloading...');
            window.location.reload();
        });
        
        // Check for updates every 30 seconds in production
        if (window.location.hostname !== 'localhost') {
            setInterval(function() {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                        registration.update();
                    });
                });
            }, 30000);
        }
    }
})();