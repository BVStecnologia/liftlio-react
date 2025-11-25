/**
 * DataImpulse Proxy Configuration
 * Provides residential IP rotation for browser instances
 */

export interface ProxyConfig {
  server: string;
  username: string;
  password: string;
}

export interface DataImpulseConfig {
  login: string;
  password: string;
  host: string;
  stickyBasePort: number;
}

/**
 * Creates a proxy configuration for a specific project
 * Each project gets a unique sticky port = unique residential IP
 */
export function createProxyConfig(
  config: DataImpulseConfig,
  projectIndex: number
): ProxyConfig {
  const stickyPort = config.stickyBasePort + projectIndex;

  return {
    server: `http://${config.host}:${stickyPort}`,
    username: config.login,
    password: config.password
  };
}

/**
 * Gets DataImpulse config from environment variables
 */
export function getDataImpulseConfig(): DataImpulseConfig | null {
  const login = process.env.DATAIMPULSE_LOGIN;
  const password = process.env.DATAIMPULSE_PASSWORD;
  const host = process.env.DATAIMPULSE_HOST || 'gw.dataimpulse.com';
  const stickyBasePort = parseInt(process.env.DATAIMPULSE_STICKY_BASE_PORT || '10000');

  if (!login || !password) {
    console.warn('DataImpulse credentials not configured - proxy disabled');
    return null;
  }

  return {
    login,
    password,
    host,
    stickyBasePort
  };
}

/**
 * Test proxy connection
 */
export async function testProxyConnection(config: ProxyConfig): Promise<boolean> {
  try {
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      proxy: config,
      headless: true
    });

    const page = await browser.newPage();
    const response = await page.goto('https://api.ipify.org/', { timeout: 10000 });
    const ip = await page.textContent('body');

    await browser.close();

    console.log(`Proxy test successful. IP: ${ip}`);
    return true;
  } catch (error) {
    console.error('Proxy test failed:', error);
    return false;
  }
}
