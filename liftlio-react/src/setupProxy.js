// This file is automatically loaded by react-scripts
// It configures the development server proxy settings

module.exports = function(app) {
  // SUPER AGGRESSIVE cache prevention for development
  app.use((req, res, next) => {
    // Add timestamp to force browser to see it as a new response
    const timestamp = Date.now();
    
    // Set every possible anti-cache header
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, post-check=0, pre-check=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Cache-Control': 'no-cache',
      'X-Accel-Expires': '0',
      'Vary': '*',
      'ETag': `"${timestamp}"`,
      'Last-Modified': new Date().toUTCString(),
      'X-Dev-Timestamp': timestamp.toString()
    });
    
    // Remove any existing ETag to prevent 304 responses
    res.removeHeader('etag');
    res.removeHeader('if-none-match');
    res.removeHeader('if-modified-since');
    
    next();
  });

  // Force disable browser cache for HTML files
  app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/' || req.path === '/trends' || req.path === '/liftlio-analytics') {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');
      // Add random query parameter to force reload
      if (!req.query._t) {
        req.query._t = Date.now();
      }
    }
    next();
  });

  // Log all requests to help debug cache issues
  app.use((req, res, next) => {
    const cacheStatus = req.headers['cache-control'] || 'none';
    console.log(`[DEV] ${req.method} ${req.path} | Cache: ${cacheStatus}`);
    next();
  });
};