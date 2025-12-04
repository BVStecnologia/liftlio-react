/**
 * Stealth Mode Script - Enhanced for Google Login
 * Injected into pages via Playwright --init-script
 * Makes browser appear as a normal user browser
 */

// Remove webdriver indicator (multiple methods for redundancy)
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});
delete navigator.webdriver;

// Override platform to match Linux
Object.defineProperty(navigator, 'platform', {
  get: () => 'Linux x86_64',
  configurable: true
});

// Add realistic plugins (matching browser-manager.ts)
const mockPlugins = [
  { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
  { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
  { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
  { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
  { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '' }
];

try {
  const pluginArray = Object.create(PluginArray.prototype);
  mockPlugins.forEach((p, i) => {
    const plugin = Object.create(Plugin.prototype);
    Object.defineProperties(plugin, {
      name: { value: p.name, enumerable: true },
      filename: { value: p.filename, enumerable: true },
      description: { value: p.description, enumerable: true },
      length: { value: 0, enumerable: true }
    });
    pluginArray[i] = plugin;
  });
  Object.defineProperty(pluginArray, 'length', { value: mockPlugins.length });
  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray,
    configurable: true
  });
} catch (e) {
  // Fallback if PluginArray not available
}

// Add consistent languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['pt-BR', 'pt', 'en-US', 'en'],
  configurable: true
});

// Hardware concurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => 8,
  configurable: true
});

// Device memory
Object.defineProperty(navigator, 'deviceMemory', {
  get: () => 8,
  configurable: true
});

// Mock Chrome runtime (essential for Google services)
window.chrome = {
  runtime: {
    connect: function() { return { onMessage: { addListener: function(){} }, postMessage: function(){} }; },
    sendMessage: function() {},
    onMessage: { addListener: function(){} },
    id: undefined
  },
  loadTimes: function() {
    return {
      commitLoadTime: Date.now() / 1000 - Math.random() * 2,
      connectionInfo: 'http/1.1',
      finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
      finishLoadTime: Date.now() / 1000 - Math.random() * 0.5,
      firstPaintAfterLoadTime: 0,
      firstPaintTime: Date.now() / 1000 - Math.random() * 3,
      navigationType: 'Other',
      npnNegotiatedProtocol: 'unknown',
      requestTime: Date.now() / 1000 - Math.random() * 4,
      startLoadTime: Date.now() / 1000 - Math.random() * 3,
      wasAlternateProtocolAvailable: false,
      wasFetchedViaSpdy: false,
      wasNpnNegotiated: false
    };
  },
  csi: function() {
    return {
      onloadT: Date.now(),
      pageT: Math.random() * 1000 + 500,
      startE: Date.now() - Math.random() * 2000,
      tran: 15
    };
  },
  app: {
    isInstalled: false,
    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
  }
};

// Override permissions query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery.call(window.navigator.permissions, parameters)
);

// Add fake media devices
if (navigator.mediaDevices) {
  const originalEnumerate = navigator.mediaDevices.enumerateDevices;
  navigator.mediaDevices.enumerateDevices = async () => {
    try {
      const devices = await originalEnumerate.call(navigator.mediaDevices);
      if (devices.length > 0) return devices;
    } catch (e) {}
    return [
      { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'default' },
      { deviceId: 'communications', kind: 'audioinput', label: '', groupId: 'default' },
      { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'default' },
      { deviceId: 'default', kind: 'videoinput', label: '', groupId: 'default' }
    ];
  };
}

// WebGL spoofing - CRITICAL: Report real NVIDIA GPU to avoid SwiftShader detection
// CreepJS detects hasSwiftShader:true which causes "50% like-headless" detection
// Solution: Spoof as NVIDIA GeForce RTX 3050 (same as Windows MCP reference)
const getParameterProxyHandler = {
  apply: function(target, thisArg, args) {
    const param = args[0];
    // UNMASKED_VENDOR_WEBGL (37445) - Report NVIDIA vendor
    if (param === 37445) return 'Google Inc. (NVIDIA)';
    // UNMASKED_RENDERER_WEBGL (37446) - Report NVIDIA GeForce RTX 3050
    // This MUST NOT contain "SwiftShader" anywhere!
    if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002584) Direct3D11 vs_5_0 ps_5_0, D3D11)';
    return target.apply(thisArg, args);
  }
};

try {
  WebGLRenderingContext.prototype.getParameter = new Proxy(
    WebGLRenderingContext.prototype.getParameter,
    getParameterProxyHandler
  );
  WebGL2RenderingContext.prototype.getParameter = new Proxy(
    WebGL2RenderingContext.prototype.getParameter,
    getParameterProxyHandler
  );
} catch (e) {}

// Prevent detection via prototype chain
const nativeToString = Function.prototype.toString;
const customFunctions = new Set();

function makeNativeString(fn) {
  customFunctions.add(fn);
}

Function.prototype.toString = function() {
  if (customFunctions.has(this)) {
    return 'function () { [native code] }';
  }
  return nativeToString.call(this);
};

makeNativeString(Function.prototype.toString);

// Notification API
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Object.defineProperty(Notification, 'permission', {
    get: () => 'default',
    configurable: true
  });
}

// Battery API (return unavailable to avoid fingerprinting)
if (navigator.getBattery) {
  navigator.getBattery = async () => ({
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1,
    addEventListener: () => {},
    removeEventListener: () => {}
  });
}

// Connection API
if (navigator.connection) {
  Object.defineProperty(navigator, 'connection', {
    get: () => ({
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      saveData: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    }),
    configurable: true
  });
}

// Mock Web Share API (noWebShare detection)
if (!navigator.share) {
  navigator.share = async (data) => {
    console.log('[Stealth] Web Share called with:', data);
    return Promise.resolve();
  };
  navigator.canShare = (data) => true;
}

// Mock Contact Picker API (noContactsManager detection)
if (!navigator.contacts) {
  navigator.contacts = {
    select: async (properties, options) => {
      return [];
    },
    getProperties: async () => ['name', 'email', 'tel', 'address', 'icon']
  };
}

// Mock Content Index API (noContentIndex detection)
if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
  navigator.serviceWorker.ready.then(registration => {
    if (!registration.index) {
      registration.index = {
        add: async (description) => {},
        delete: async (id) => {},
        getAll: async () => []
      };
    }
  }).catch(() => {});
}

// Fix background color detection (hasKnownBgColor)
// Add a slight variation to default background to avoid fingerprinting
try {
  const style = document.createElement('style');
  style.textContent = 'html { background-color: rgba(255,255,255,0.999) !important; }';
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  }
} catch (e) {}

console.log('[Stealth] Enhanced anti-detection scripts loaded (WebGL: NVIDIA RTX 3050)');
