// This file is automatically loaded by react-scripts
// It configures the development server proxy settings

module.exports = function(app) {
  // Disable all caching in development
  app.use((req, res, next) => {
    // Set aggressive no-cache headers for all responses in development
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Cache-Control': 'no-cache'
    });
    next();
  });

  // Log all requests to help debug cache issues
  app.use((req, res, next) => {
    console.log(`[DEV Server] ${req.method} ${req.path}`);
    next();
  });
};