/**
 * Browser Manager
 * Manages Playwright browser instances with persistent Chrome profiles
 * Includes humanization to avoid detection
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { ProxyConfig, createProxyConfig, getDataImpulseConfig } from './proxy-config';
import {
  BehaviorProfile,
  humanClick,
  humanType,
  humanScroll,
  humanDelay,
  humanMouseMove,
  getDelay
} from './humanization';
import path from 'path';
import fs from 'fs';

export interface BrowserManagerConfig {
  projectId: string;
  projectIndex: number;
  profilesDir: string;
  headless: boolean;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  content: string;
  timestamp: string;
}

export class BrowserManager {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserManagerConfig;
  private proxyConfig: ProxyConfig | null = null;
  private behaviorProfile: BehaviorProfile | null = null;

  constructor(config: BrowserManagerConfig) {
    this.config = config;

    // Setup proxy if DataImpulse is configured
    const dataImpulseConfig = getDataImpulseConfig();
    if (dataImpulseConfig) {
      this.proxyConfig = createProxyConfig(dataImpulseConfig, config.projectIndex);
      console.log(`Proxy configured for project ${config.projectId}: port ${dataImpulseConfig.stickyBasePort + config.projectIndex}`);
    }
  }

  /**
   * Get profile directory for this project
   */
  private getProfilePath(): string {
    const profilePath = path.join(this.config.profilesDir, this.config.projectId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
      console.log(`Created profile directory: ${profilePath}`);
    }

    return profilePath;
  }

  /**
   * Initialize browser with persistent context
   * This keeps cookies, localStorage, and login sessions
   */
  async initialize(): Promise<void> {
    console.log(`Initializing browser for project: ${this.config.projectId}`);

    const profilePath = this.getProfilePath();

    const launchOptions: any = {
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };

    // Add proxy if configured
    if (this.proxyConfig) {
      launchOptions.proxy = this.proxyConfig;
    }

    // Launch persistent context (keeps profile data)
    this.context = await chromium.launchPersistentContext(profilePath, {
      ...launchOptions,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/Sao_Paulo',
      permissions: ['geolocation', 'notifications'],
      ignoreHTTPSErrors: true
    });

    // Get or create page
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    console.log(`Browser initialized for project: ${this.config.projectId}`);
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Navigating to: ${url}`);

    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    return this.getSnapshot();
  }

  /**
   * Set behavior profile for humanization
   */
  setBehaviorProfile(profile: BehaviorProfile): void {
    this.behaviorProfile = profile;
    console.log(`Behavior profile set: mouse=${profile.mouse}, typing=${profile.typing}, scroll=${profile.scroll}, delay=${profile.delay}`);
  }

  /**
   * Get current behavior profile
   */
  getBehaviorProfile(): BehaviorProfile | null {
    return this.behaviorProfile;
  }

  /**
   * Click on element (humanized if profile is set)
   */
  async click(selector: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Clicking: ${selector}`);

    // Use humanized click if behavior profile is set
    if (this.behaviorProfile) {
      try {
        await humanClick(this.page, selector, this.behaviorProfile);
        // Add human delay after click
        await humanDelay(this.behaviorProfile.delay);
      } catch (e) {
        // Fallback to direct click if humanized fails
        console.log('Humanized click failed, using direct click');
        await this.page.click(selector, { timeout: 10000 });
      }
    } else {
      await this.page.click(selector, { timeout: 10000 });
    }

    await this.page.waitForLoadState('networkidle');

    return this.getSnapshot();
  }

  /**
   * Type text into element (humanized if profile is set)
   */
  async type(selector: string, text: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Typing into: ${selector}`);

    // Use humanized typing if behavior profile is set
    if (this.behaviorProfile) {
      try {
        await humanType(this.page, selector, text, this.behaviorProfile);
        // Add human delay after typing
        await humanDelay(this.behaviorProfile.delay);
      } catch (e) {
        // Fallback to direct fill if humanized fails
        console.log('Humanized typing failed, using direct fill');
        await this.page.fill(selector, text);
      }
    } else {
      await this.page.fill(selector, text);
    }

    return this.getSnapshot();
  }

  /**
   * Scroll the page (humanized if profile is set)
   */
  async scroll(direction: 'up' | 'down', amount: number = 500): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Scrolling ${direction} by ${amount}px`);

    if (this.behaviorProfile) {
      await humanScroll(this.page, direction, amount, this.behaviorProfile.scroll);
    } else {
      const scrollAmount = direction === 'down' ? amount : -amount;
      await this.page.mouse.wheel(0, scrollAmount);
    }

    return this.getSnapshot();
  }

  /**
   * Take screenshot
   */
  async screenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const screenshotPath = path.join('/data/screenshots', `${this.config.projectId}_${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: false });

    return screenshotPath;
  }

  /**
   * Get current page snapshot
   */
  async getSnapshot(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const url = this.page.url();
    const title = await this.page.title();

    // Get simplified page content for AI context
    const content = await this.page.evaluate(() => {
      // Get visible text content
      const body = document.body;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const textParts: string[] = [];
      let node;

      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textParts.push(text);
        }
      }

      // Get interactive elements
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 20)
        .map(a => `[link: ${a.textContent?.trim()}]`);

      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
        .slice(0, 10)
        .map(b => `[button: ${b.textContent?.trim() || (b as HTMLInputElement).value}]`);

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'))
        .slice(0, 10)
        .map(i => `[input: ${(i as HTMLInputElement).placeholder || (i as HTMLInputElement).name}]`);

      return [
        textParts.slice(0, 100).join(' '),
        '',
        'Interactive elements:',
        ...links,
        ...buttons,
        ...inputs
      ].join('\n').slice(0, 5000);
    });

    return {
      url,
      title,
      content,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute arbitrary JavaScript
   */
  async evaluate(script: string): Promise<any> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.evaluate(script);
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, timeout: number = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Go back
   */
  async goBack(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.goBack();
    await this.page.waitForLoadState('networkidle');

    return this.getSnapshot();
  }

  /**
   * Go forward
   */
  async goForward(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.goForward();
    await this.page.waitForLoadState('networkidle');

    return this.getSnapshot();
  }

  /**
   * Reload page
   */
  async reload(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.reload({ waitUntil: 'networkidle' });

    return this.getSnapshot();
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
      console.log(`Browser closed for project: ${this.config.projectId}`);
    }
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.context !== null && this.page !== null;
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string | null {
    return this.page?.url() || null;
  }

  /**
   * Get direct access to the page for advanced operations
   */
  getPage(): Page | null {
    return this.page;
  }
}
