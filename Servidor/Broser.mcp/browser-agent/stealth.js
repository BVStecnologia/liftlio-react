/**
 * Stealth Mode Script
 * Injected into pages via Playwright MCP --init-script
 * Hides automation indicators to avoid bot detection
 */

// Remove webdriver indicator
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined
});

// Add fake plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    return [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ];
  }
});

// Add fake languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en', 'pt-BR', 'pt']
});

// Mock chrome runtime
window.chrome = {
  runtime: {},
  loadTimes: () => ({}),
  csi: () => ({}),
  app: {}
};

// Override permissions query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters)
);

// Add fake media devices
if (navigator.mediaDevices) {
  navigator.mediaDevices.enumerateDevices = async () => [
    { deviceId: 'default', kind: 'audioinput', label: 'Default', groupId: 'default' },
    { deviceId: 'default', kind: 'videoinput', label: 'Webcam', groupId: 'default' }
  ];
}

// Override WebGL vendor/renderer
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.';
  if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  return getParameter.call(this, parameter);
};

// Canvas fingerprint noise
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
  if (type === 'image/png') {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += (Math.random() - 0.5) * 0.1;
      }
      context.putImageData(imageData, 0, 0);
    }
  }
  return originalToDataURL.apply(this, arguments);
};

console.log('[Stealth] Anti-detection scripts loaded');
