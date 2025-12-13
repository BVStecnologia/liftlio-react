// Anti-automation detection script for Playwright MCP
// Hides "Chrome is being controlled by automated software" indicators

// Override navigator.webdriver
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});

// Override navigator.plugins to look more realistic
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const plugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ];
    plugins.item = (i) => plugins[i];
    plugins.namedItem = (name) => plugins.find(p => p.name === name);
    plugins.refresh = () => {};
    return plugins;
  },
  configurable: true
});

// Override navigator.languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
  configurable: true
});

// Override window.chrome
window.chrome = {
  runtime: {},
  loadTimes: function() {},
  csi: function() {},
  app: {}
};

// Override permissions query
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );
}

console.log('[Liftlio] Anti-automation script loaded');
