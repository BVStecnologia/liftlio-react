/**
 * Browser Manager
 * Manages Playwright browser instances with persistent Chrome profiles
 * Includes humanization to avoid detection
 */

// PATCHRIGHT: Undetected Playwright fork that removes Runtime.enable leak
// This is the key to avoiding Google's "50% like-headless" detection!
import { chromium, Browser, BrowserContext, Page } from 'patchright';
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
import os from 'os';

// Supabase configuration for session persistence
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

interface SessionData {
  cookies: any[];
  localStorage: Record<string, string>;
  lastUrl: string;
  savedAt: string;
}

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
/**
 * Accessibility node for token-efficient page representation
 * Used instead of full text content to reduce AI token usage by ~50%
 */
export interface AccessibilityNode {
  tag: string;
  role?: string;
  text?: string;
  ref: string;  // Semantic selector for clicking (e.g., "button[aria-label="Compose"]")
  rect?: { x: number; y: number; w: number; h: number };
  children?: AccessibilityNode[];
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserManagerConfig;
  private proxyConfig: ProxyConfig | null = null;
  private behaviorProfile: BehaviorProfile | null = null;
  private resourceBlockingEnabled: boolean = false;
  private sessionSaveInterval: NodeJS.Timeout | null = null;

  constructor(config: BrowserManagerConfig) {
    this.config = config;

    // Setup proxy if DataImpulse is configured
    const dataImpulseConfig = getDataImpulseConfig();
    if (dataImpulseConfig) {
      this.proxyConfig = createProxyConfig(dataImpulseConfig, config.projectIndex);
      // Note: stickyBasePort already includes project offset from orchestrator
      console.log(`Proxy configured for project ${config.projectId}: port ${dataImpulseConfig.stickyBasePort}`);
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

    // CRITICAL FIX: Use EXACT same config as MCP Playwright local (which works!)
    // The key is assistantMode: true which:
    // 1. Adds "AutomationControlled" to --disable-features automatically
    // 2. Does NOT add --enable-automation flag
    // This is the ONLY thing that matters for Google login!
    const launchOptions: any = {
      headless: this.config.headless,
      // EXACTLY like MCP Playwright local:
      ignoreDefaultArgs: ['--disable-extensions'],
      assistantMode: true,  // THE KEY! Makes browser undetectable by Google
      // Minimal args - only what Docker requires
      args: [
        '--no-sandbox',  // Required for Docker
        '--disable-setuid-sandbox',  // Required for Docker
        '--disable-dev-shm-usage',  // Required for Docker
        // GPU spoofing - CRITICAL to avoid SwiftShader detection
        // These flags override the GPU info reported to WebGL
        '--use-gl=angle',
        '--use-angle=swiftshader',  // Still use SwiftShader for rendering but...
        '--gpu-testing-vendor-id=0x10de',  // NVIDIA vendor ID
        '--gpu-testing-device-id=0x2584',  // RTX 3050 device ID
        '--gpu-testing-gl-vendor=Google Inc. (NVIDIA)',
        '--gpu-testing-gl-renderer=ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002584) Direct3D11 vs_5_0 ps_5_0, D3D11)',
        '--gpu-testing-gl-version=OpenGL ES 3.0 (ANGLE 2.1.0)',
        // VNC visibility
        '--start-maximized',
        '--window-position=0,0',
        '--window-size=1920,1080',
      ]
    };

    // Add proxy if configured
    if (this.proxyConfig) {
      launchOptions.proxy = this.proxyConfig;
    }

    // Add proxy log
    if (this.proxyConfig) {
      console.log(`Using proxy: ${this.proxyConfig.server}`);
    }

    // Get persistent profile path
    const profilePath = this.getProfilePath();
    console.log(`Using persistent Chrome profile at: ${profilePath}`);

    // Add context settings to launch options for persistent context
    launchOptions.viewport = { width: 1920, height: 1080 };
    // userAgent removed - let Playwright use default (matches environment)
    launchOptions.locale = 'en-US';
    launchOptions.timezoneId = 'America/Sao_Paulo';
    launchOptions.permissions = ['geolocation', 'notifications'];
    launchOptions.ignoreHTTPSErrors = true;

    // Use launchPersistentContext for REAL Chrome profile persistence
    // This is KEY to avoiding Google's "unsafe browser" detection
    // Chrome keeps its own cookies, history, and session data in profilePath
    this.context = await chromium.launchPersistentContext(profilePath, launchOptions);
    this.browser = null; // Not used with persistent context

    // Get existing page or create new one
    this.page = this.context.pages()[0] || await this.context.newPage();

    // Set default timeouts
    this.page.setDefaultTimeout(60000); // 60s for operations
    this.page.setDefaultNavigationTimeout(90000); // 90s for navigation

    // Add stealth scripts to hide automation
    await this.setupStealthMode();

    // Setup automatic cookie consent handlers using addLocatorHandler
    await this.setupAutoConsentHandlers();

    // Setup resource blocking for better performance (optional, call enableResourceBlocking() to activate)
    await this.setupResourceBlocking();

    // Restore session data from Supabase (cookies, localStorage)
    await this.restoreSession();

    console.log(`Browser initialized for project: ${this.config.projectId}`);

    // Setup auto-save session every 2 minutes
    this.sessionSaveInterval = setInterval(async () => {
      await this.saveSession();
      console.log('Auto-saved session');
    }, 2 * 60 * 1000);
  }

  /**
   * Setup stealth mode with WebGL spoofing
   * CRITICAL: Must inject stealth.js to mask SwiftShader as NVIDIA GPU
   * Without this, CreepJS detects hasSwiftShader:true → "50% like-headless"
   */
  private async setupStealthMode(): Promise<void> {
    if (!this.context) return;

    // Load stealth.js which contains WebGL spoofing (NVIDIA instead of SwiftShader)
    const stealthPath = path.join(__dirname, '..', 'stealth.js');

    if (fs.existsSync(stealthPath)) {
      const stealthScript = fs.readFileSync(stealthPath, 'utf-8');
      await this.context.addInitScript(stealthScript);
      console.log('Stealth mode: injected WebGL spoofing (NVIDIA GeForce RTX 3050)');
    } else {
      console.warn('Stealth mode: stealth.js not found at', stealthPath);
    }
  }

  /**
   * Setup automatic cookie consent handlers using Playwright's addLocatorHandler
   * These handlers fire automatically when the consent dialog appears
   */
  private async setupAutoConsentHandlers(): Promise<void> {
    if (!this.page) return;

    console.log('Setting up automatic consent handlers...');

    // Common consent button texts in multiple languages
    const consentTexts = [
      // German (most common for EU proxies)
      'Alle akzeptieren',
      'Alle Cookies akzeptieren',
      'Akzeptieren',
      'Zustimmen',
      // English
      'Accept all',
      'Accept All',
      'Accept all cookies',
      'I agree',
      'Agree',
      'Accept',
      'Allow all',
      'Allow All Cookies',
      'Got it',
      'OK',
      // Portuguese
      'Aceitar tudo',
      'Aceitar todos',
      'Concordo',
      'Aceitar',
      // Spanish
      'Aceptar todo',
      'Aceptar todas',
      'Acepto',
      // French
      'Tout accepter',
      'Accepter tout',
      "J'accepte",
    ];

    // Register handler for each consent text
    for (const text of consentTexts) {
      try {
        await this.page.addLocatorHandler(
          this.page.getByRole('button', { name: text }),
          async (button) => {
            console.log(`[AUTO-CONSENT] Found and clicking: "${text}"`);
            await button.click();
            console.log(`[AUTO-CONSENT] Clicked: "${text}"`);
          },
          { times: 1, noWaitAfter: true }
        );
      } catch (e) {
        // Handler registration failed, continue
      }
    }

    // Also register handlers for common CSS selectors
    const consentSelectors = [
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', // CookieBot
      '#onetrust-accept-btn-handler', // OneTrust
      '.cc-accept', // Cookie Consent
      '[data-testid="cookie-accept-all"]',
      '[data-testid="accept-btn"]',
      '[data-testid="GDPR-accept"]',
      'button[id*="accept"][id*="cookie" i]',
      'button[class*="accept"][class*="cookie" i]',
      '[aria-label*="accept" i][aria-label*="cookie" i]',
    ];

    for (const selector of consentSelectors) {
      try {
        await this.page.addLocatorHandler(
          this.page.locator(selector).first(),
          async (button) => {
            console.log(`[AUTO-CONSENT] Found by selector and clicking: ${selector}`);
            await button.click();
            console.log(`[AUTO-CONSENT] Clicked: ${selector}`);
          },
          { times: 1, noWaitAfter: true }
        );
      } catch (e) {
        // Handler registration failed, continue
      }
    }

    console.log('Automatic consent handlers registered');
  }

  /**
   * Setup resource blocking to improve performance
   * Call enableResourceBlocking() to activate
   */
  private async setupResourceBlocking(): Promise<void> {
    if (!this.page) return;

    // Block heavy resources by default for performance
    await this.page.route('**/*', async (route) => {
      if (!this.resourceBlockingEnabled) {
        await route.continue();
        return;
      }

      const resourceType = route.request().resourceType();
      const url = route.request().url();

      // Block video streaming (YouTube, etc.)
      if (url.includes('googlevideo.com') ||
          url.includes('videoplayback') ||
          url.includes('.mp4') ||
          url.includes('.webm') ||
          url.includes('.m3u8')) {
        console.log(`[BLOCKED] Video: ${url.substring(0, 80)}...`);
        await route.abort();
        return;
      }

      // Block heavy resource types
      const blockedTypes = ['media']; // Only block media, keep images for screenshots
      if (blockedTypes.includes(resourceType)) {
        console.log(`[BLOCKED] ${resourceType}: ${url.substring(0, 50)}...`);
        await route.abort();
        return;
      }

      // Block analytics and trackers
      const blockedDomains = [
        'googletagmanager.com',
        'google-analytics.com',
        'facebook.net',
        'doubleclick.net',
        'hotjar.com',
        'mixpanel.com',
      ];

      if (blockedDomains.some(domain => url.includes(domain))) {
        await route.abort();
        return;
      }

      await route.continue();
    });
  }

  /**
   * Enable resource blocking for better performance on video-heavy sites
   */
  enableResourceBlocking(): void {
    this.resourceBlockingEnabled = true;
    console.log('Resource blocking enabled');
  }

  /**
   * Disable resource blocking
   */
  disableResourceBlocking(): void {
    this.resourceBlockingEnabled = false;
    console.log('Resource blocking disabled');
  }

  /**
   * Navigate to URL with optimized loading
   * Uses 'domcontentloaded' instead of waiting for all resources
   */
  async navigate(url: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Navigating to: ${url}`);

    // Use domcontentloaded for faster navigation (don't wait for images/videos)
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Small delay to let consent handlers fire
    await this.page.waitForTimeout(500);

    // Apply any pending localStorage from restored session
    await this.applyPendingLocalStorage();

    // Save session after navigation (captures new cookies/auth)
    await this.saveSession();

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

    // Wait removed - matches Playwright MCP pattern

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
   * Get screenshots directory (cross-platform)
   */
  private getScreenshotsDir(): string {
    // Use project-local screenshots folder for cross-platform compatibility
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');

    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log(`Created screenshots directory: ${screenshotsDir}`);
    }

    return screenshotsDir;
  }

  /**
   * Take screenshot
   */
  async screenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const screenshotsDir = this.getScreenshotsDir();
    const screenshotPath = path.join(screenshotsDir, `${this.config.projectId}_${Date.now()}.png`);
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: false,
      timeout: 30000,
      animations: 'disabled'
    });

    return screenshotPath;
  }

  /**
   * Take screenshot and return as base64
   */
  async screenshotBase64(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const buffer = await this.page.screenshot({
      fullPage: false,
      timeout: 30000,  // Increased to 30s for heavy pages like Gmail
      animations: 'disabled'
    });
    return buffer.toString('base64');
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

      // Get interactive elements - improved for YouTube and other sites

      // YouTube-specific: Get video titles first
      const videoTitles = Array.from(document.querySelectorAll('#video-title, #video-title-link, a.ytd-video-renderer'))
        .slice(0, 10)
        .map(el => {
          const text = el.textContent?.trim() || el.getAttribute('title') || el.getAttribute('aria-label');
          return text ? `[video: ${text.slice(0, 80)}]` : null;
        })
        .filter(Boolean);

      // General links with improved text extraction
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 30)
        .map(a => {
          // Try multiple sources for link text
          const text = a.textContent?.trim()
            || a.getAttribute('title')
            || a.getAttribute('aria-label')
            || (a.querySelector('img') as HTMLImageElement)?.alt;
          return text ? `[link: ${text.slice(0, 60)}]` : null;
        })
        .filter(Boolean);

      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'))
        .slice(0, 15)
        .map(b => {
          const text = b.textContent?.trim()
            || (b as HTMLInputElement).value
            || b.getAttribute('aria-label')
            || b.getAttribute('title');
          return text ? `[button: ${text.slice(0, 40)}]` : null;
        })
        .filter(Boolean);

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'))
        .slice(0, 10)
        .map(i => `[input: ${(i as HTMLInputElement).placeholder || (i as HTMLInputElement).name}]`);

      return [
        textParts.slice(0, 100).join(' '),
        '',
        'Interactive elements:',
        ...videoTitles,
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
   * Get Playwright's native ARIA snapshot (most efficient for AI processing)
   * This is what Browser MCP uses - 70-80% fewer tokens than full DOM
   * Returns structured text with refs like [ref=N] for clicking
   */
  async getAriaSnapshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      // Use Playwright's native ariaSnapshot - exactly what Browser MCP uses
      const snapshot = await this.page.locator('body').ariaSnapshot({ timeout: 5000 });
      return snapshot;
    } catch (e) {
      // Fallback to simpler extraction
      const title = await this.page.title();
      const url = this.page.url();
      return `URL: ${url}\nTitle: ${title}\n\n(ARIA snapshot failed, using fallback)`;
    }
  }

  /**
   * Get accessibility snapshot for token-efficient AI processing
   * Returns a tree of interactive elements with SEMANTIC refs for clicking
   * Semantic refs survive SPA re-renders (e.g., "button[aria-label='Compose']")
   * ~50% fewer tokens than text-based content extraction
   */
  async getAccessibilitySnapshot(): Promise<AccessibilityNode> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.evaluate(() => {
      let fallbackCounter = 0;
      const usedRefs = new Set<string>();

      function isVisible(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               parseFloat(style.opacity) > 0;
      }

      function isInteractive(el: Element): boolean {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const hasClick = el.hasAttribute('onclick') || (el as HTMLElement).onclick !== null;
        const hasHref = el.hasAttribute('href');

        return /^(a|button|input|select|textarea|video|audio)$/i.test(tag) ||
               /^(button|link|menuitem|tab|checkbox|radio|textbox|combobox)$/i.test(role || '') ||
               hasClick || hasHref ||
               el.hasAttribute('tabindex');
      }

      // Generate semantic ref that survives SPA re-renders
      function generateSemanticRef(el: Element): string {
        const tag = el.tagName.toLowerCase();

        // Priority 1: data-testid (most reliable for SPAs)
        const testId = el.getAttribute('data-testid');
        if (testId) {
          const ref = `${tag}[data-testid="${testId}"]`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 2: aria-label (common in Gmail, SPAs)
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.length < 60) {
          const ref = `${tag}[aria-label="${ariaLabel}"]`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 3: id (if not auto-generated)
        const id = el.getAttribute('id');
        if (id && !/^[\d_-]|^(ember|react|vue|ng-)/.test(id)) {
          const ref = `#${id}`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 4: role + visible text (role=button:Compose)
        const role = el.getAttribute('role');
        const text = el.textContent?.trim().slice(0, 30);
        if (role && text && text.length > 2) {
          const ref = `role=${role}:${text}`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 5: text content only (text=Compose)
        if (text && text.length >= 2 && text.length <= 40) {
          const ref = `text=${text}`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 6: name attribute (forms)
        const name = el.getAttribute('name');
        if (name) {
          const ref = `${tag}[name="${name}"]`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Priority 7: placeholder (inputs)
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) {
          const ref = `${tag}[placeholder="${placeholder}"]`;
          if (!usedRefs.has(ref)) { usedRefs.add(ref); return ref; }
        }

        // Fallback: sequential number (will need fresh snapshot if re-render happens)
        const fallbackRef = `e${fallbackCounter++}`;
        usedRefs.add(fallbackRef);
        return fallbackRef;
      }

      function buildTree(el: Element, depth: number = 0): any | null {
        if (depth > 5 || !isVisible(el)) return null;

        const tag = el.tagName.toLowerCase();
        const interactive = isInteractive(el);

        // Skip non-interactive containers without interactive children
        const hasInteractiveChild = Array.from(el.children).some(c =>
          isInteractive(c) || Array.from(c.children).some(isInteractive)
        );

        if (!interactive && !hasInteractiveChild && depth > 1) {
          return null;
        }

        // Generate semantic ref (survives SPA re-renders!)
        const ref = generateSemanticRef(el);

        const rect = el.getBoundingClientRect();
        const textContent = el.textContent?.trim() || '';
        const text = interactive ? textContent.slice(0, 50) : undefined;

        const node: any = {
          tag,
          ref,
          role: el.getAttribute('role') || undefined,
          text: text || undefined,
          rect: interactive ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height)
          } : undefined
        };

        // Add placeholder/label for inputs
        if (tag === 'input' || tag === 'textarea') {
          const input = el as HTMLInputElement;
          node.text = input.placeholder || input.name || input.id || undefined;
        }

        // Process children (max 10 per level)
        const children = Array.from(el.children)
          .map(c => buildTree(c, depth + 1))
          .filter(Boolean)
          .slice(0, 10);

        if (children.length > 0) {
          node.children = children;
        }

        return node;
      }

      return buildTree(document.body) || { tag: 'body', ref: 'e0' };
    });
  }

  /**
   * Click element by semantic ref (e.g., "button[aria-label='Compose']", "role=button:Compose", "text=Compose")
   * Uses Playwright Locators which auto-retry and survive SPA re-renders
   */
  async clickByRef(ref: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('Clicking element by semantic ref:', ref);
    const isYouTube = this.page.url().includes('youtube.com');

    try {
      // PRIORITY: YouTube JavaScript click (avoids strict mode violations)
      // Check this FIRST for YouTube pages with plain text refs
      if (isYouTube && !ref.includes('[') && !ref.startsWith('#') && !ref.startsWith('role=') && !ref.startsWith('text=')) {
        console.log('  YouTube: Trying JavaScript click for:', ref.slice(0, 50));
        const searchText = ref.slice(0, 50).toLowerCase();
        const clicked = await this.page.evaluate((text: string) => {
          // Priority 1: Video titles (#video-title)
          const titles = Array.from(document.querySelectorAll('#video-title'));
          for (let i = 0; i < titles.length; i++) {
            const title = titles[i];
            if (title.textContent?.toLowerCase().includes(text)) {
              (title as HTMLElement).click();
              return 'video-title';
            }
          }
          // Priority 2: Any clickable element with matching text
          const clickables = Array.from(document.querySelectorAll('a, button, [role="button"]'));
          for (let i = 0; i < clickables.length; i++) {
            const el = clickables[i];
            if (el.textContent?.toLowerCase().includes(text)) {
              (el as HTMLElement).click();
              return 'clickable';
            }
          }
          // Priority 3: Any element with matching aria-label
          const labeled = Array.from(document.querySelectorAll('[aria-label]'));
          for (let i = 0; i < labeled.length; i++) {
            const el = labeled[i];
            if (el.getAttribute('aria-label')?.toLowerCase().includes(text)) {
              (el as HTMLElement).click();
              return 'aria-label';
            }
          }
          return null;
        }, searchText);
        if (clicked) {
          console.log(`  YouTube: Clicked via ${clicked}!`);
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          return this.getSnapshot();
        }
        console.log('  YouTube: JavaScript click failed, trying other strategies...');
      }

      // Strategy 1: CSS selector (data-testid, aria-label, id, name, placeholder)
      if (ref.includes('[') || ref.startsWith('#')) {
        console.log('  Using CSS selector strategy');
        await this.page.locator(ref).first().click({ timeout: 5000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return this.getSnapshot();
      }

      // Strategy 2: Role-based (role=button:Compose)
      if (ref.startsWith('role=')) {
        const match = ref.match(/^role=(\w+):(.+)$/);
        if (match) {
          const [, role, name] = match;
          console.log(`  Using role strategy: role=${role}, name="${name}"`);
          await this.page.getByRole(role as any, { name }).first().click({ timeout: 5000 });
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          return this.getSnapshot();
        }
      }

      // Strategy 3: Text-based (text=Compose)
      if (ref.startsWith('text=')) {
        const text = ref.replace('text=', '');
        console.log(`  Using text strategy: "${text}"`);
        await this.page.getByText(text, { exact: false }).first().click({ timeout: 5000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return this.getSnapshot();
      }

      // Strategy 4: Fallback numeric ref (e0, e1, etc.)
      if (/^e\d+$/.test(ref)) {
        console.log('  Fallback ref detected - refreshing snapshot recommended');
        const clicked = await this.page.evaluate((targetRef: string) => {
          const elements = Array.from(document.querySelectorAll('*'));
          for (const el of elements) {
            if ((el as any).__ref === targetRef) {
              (el as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, ref);

        if (clicked) {
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          return this.getSnapshot();
        }
      }

      // Strategy 5: Try ref as a generic locator (last resort)
      console.log('  Trying as generic text locator');
      await this.page.getByText(ref, { exact: false }).first().click({ timeout: 5000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      return this.getSnapshot();

    } catch (error) {
      console.error('Click by semantic ref failed:', ref, error);
      throw new Error(`Element not found for ref: ${ref}`);
    }
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
    // Wait removed - matches Playwright MCP pattern

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
    // Wait removed - matches Playwright MCP pattern

    return this.getSnapshot();
  }

  /**
   * Reload page
   */
  async reload(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.reload();

    return this.getSnapshot();
  }

  /**
   * Click at specific coordinates (x, y)
   * Used for real-time interaction when user clicks on screenshot
   */
  async clickAt(x: number, y: number): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Clicking at coordinates: (${x}, ${y})`);

    // Use humanized mouse movement if behavior profile is set
    if (this.behaviorProfile) {
      const offset = this.behaviorProfile.click_offset || { x: 0, y: 0 };
      await humanMouseMove(this.page, x, y, this.behaviorProfile.mouse, offset);
      await humanDelay(this.behaviorProfile.delay);
    }

    await this.page.mouse.click(x, y);

    // Small delay for page to react
    await this.page.waitForTimeout(100);

    return this.getSnapshot();
  }

  /**
   * Type text directly (without targeting a specific element)
   * Used for real-time keyboard input
   */
  async typeText(text: string, pressEnter: boolean = false): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Typing text: "${text}" (pressEnter: ${pressEnter})`);

    // Type text with humanized delay if profile is set
    if (this.behaviorProfile) {
      const delay = getDelay(this.behaviorProfile.delay);
      await this.page.keyboard.type(text, { delay });
    } else {
      await this.page.keyboard.type(text);
    }

    if (pressEnter) {
      await this.page.keyboard.press('Enter');
    }

    return this.getSnapshot();
  }

  /**
   * Press a specific key
   */
  async pressKey(key: string): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`Pressing key: ${key}`);
    await this.page.keyboard.press(key);

    return this.getSnapshot();
  }

  /**
   * Save browser session (cookies, localStorage) to Supabase
   * Called automatically when browser is closed
   */
  async saveSession(): Promise<void> {
    if (!this.context || !this.page) {
      console.log('No session to save - browser not initialized');
      return;
    }

    const projectId = parseInt(this.config.projectId, 10);
    if (isNaN(projectId)) {
      console.log('Cannot save session - invalid project ID');
      return;
    }

    try {
      // Get cookies from context
      const cookies = await this.context.cookies() || [];

      // Get localStorage from page
      let localStorage: Record<string, string> = {};
      try {
        const lsData = await this.page.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
              data[key] = window.localStorage.getItem(key) || '';
            }
          }
          return data;
        });
        localStorage = lsData;
      } catch (e) {
        console.log('Could not get localStorage:', e);
      }

      const sessionData: SessionData = {
        cookies,
        localStorage,
        lastUrl: this.page.url(),
        savedAt: new Date().toISOString()
      };

      // Save to Supabase
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/Projeto?id=eq.${projectId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            browser_session_data: sessionData
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to save session:', response.status, await response.text());
      } else {
        console.log(`Session saved for project ${projectId}: ${cookies.length} cookies, ${Object.keys(localStorage).length} localStorage items`);
      }
    } catch (err) {
      console.error('Error saving session:', err);
    }
  }

  /**
   * Restore browser session (cookies, localStorage) from Supabase
   * Called automatically when browser is initialized
   */
  async restoreSession(): Promise<boolean> {
    if (!this.context || !this.page) {
      console.log('Cannot restore session - browser not initialized');
      return false;
    }

    const projectId = parseInt(this.config.projectId, 10);
    if (isNaN(projectId)) {
      console.log('Cannot restore session - invalid project ID');
      return false;
    }

    try {
      // Fetch session data from Supabase
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/Projeto?id=eq.${projectId}&select=browser_session_data`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch session:', response.status);
        return false;
      }

      const data = await response.json();
      if (!data || data.length === 0 || !data[0]?.browser_session_data) {
        console.log('No saved session found for project', projectId);
        return false;
      }

      const sessionData = data[0].browser_session_data as SessionData;

      // Restore cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        // Filter out expired cookies
        const now = Date.now() / 1000;
        const validCookies = sessionData.cookies.filter(c => !c.expires || c.expires > now);
        
        if (validCookies.length > 0) {
          await this.context.addCookies(validCookies);
          console.log(`Restored ${validCookies.length} cookies`);
        }
      }

      // Restore localStorage (need to navigate first to have a valid origin)
      if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
        // We'll restore localStorage after navigating to a page
        // Store it temporarily to apply later
        (this as any)._pendingLocalStorage = sessionData.localStorage;
        console.log(`Pending localStorage restoration: ${Object.keys(sessionData.localStorage).length} items`);
      }

      console.log(`Session restored for project ${projectId} (saved at ${sessionData.savedAt})`);
      return true;
    } catch (err) {
      console.error('Error restoring session:', err);
      return false;
    }
  }

  /**
   * Apply pending localStorage (call after navigating to restore)
   */
  private async applyPendingLocalStorage(): Promise<void> {
    const pending = (this as any)._pendingLocalStorage;
    if (!pending || !this.page) return;

    try {
      await this.page.evaluate((ls: Record<string, string>) => {
        Object.entries(ls).forEach(([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            console.error('Failed to set localStorage item:', key, e);
          }
        });
      }, pending);
      console.log(`Applied ${Object.keys(pending).length} localStorage items`);
      delete (this as any)._pendingLocalStorage;
    } catch (e) {
      console.log('Could not apply localStorage:', e);
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    // Clear auto-save interval
    if (this.sessionSaveInterval) {
      clearInterval(this.sessionSaveInterval);
      this.sessionSaveInterval = null;
    }

    // Save session before closing
    await this.saveSession();

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log(`Browser closed for project: ${this.config.projectId}`);
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

  /**
   * Automatically handle GDPR/cookie consent dialogs
   * Tries multiple common consent buttons in different languages
   * Returns true if consent was handled, false otherwise
   */
  async autoHandleConsent(): Promise<{ handled: boolean; buttonClicked: string | null }> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('Checking for consent dialogs...');

    // Common consent button texts in multiple languages
    const consentButtons = [
      // German (common in EU)
      'Alle akzeptieren',
      'Akzeptieren',
      'Alle Cookies akzeptieren',
      'Zustimmen',
      'Ich stimme zu',
      // English
      'Accept all',
      'Accept All',
      'I agree',
      'Agree',
      'Accept',
      'Allow all',
      'Allow All Cookies',
      'Got it',
      'OK',
      'Continue',
      // Portuguese
      'Aceitar tudo',
      'Aceitar todos',
      'Concordo',
      'Aceitar',
      // Spanish
      'Aceptar todo',
      'Aceptar todas',
      'Acepto',
      // French
      'Tout accepter',
      'Accepter tout',
      "J'accepte",
      // Generic CSS selectors for consent buttons
    ];

    // Try each button text with a short timeout
    for (const buttonText of consentButtons) {
      try {
        const button = this.page.getByText(buttonText, { exact: false }).first();

        // Quick check if button exists (500ms timeout)
        const isVisible = await button.isVisible({ timeout: 500 }).catch(() => false);

        if (isVisible) {
          console.log(`Found consent button: "${buttonText}"`);
          await button.click({ timeout: 3000 });
          console.log(`Clicked consent button: "${buttonText}"`);

          // Wait briefly for dialog to close
          await this.page.waitForTimeout(500);

          return { handled: true, buttonClicked: buttonText };
        }
      } catch (e) {
        // Button not found or click failed, try next
        continue;
      }
    }

    // Also try common CSS selectors for consent buttons
    const consentSelectors = [
      '[data-testid="accept-btn"]',
      '[data-testid="GDPR-accept"]',
      '.accept-cookies',
      '#accept-cookies',
      '.cookie-consent-accept',
      '#cookie-accept',
      '[aria-label*="accept"]',
      '[aria-label*="Accept"]',
      'button[id*="accept"]',
      'button[class*="accept"]',
      '.consent-accept',
      '#consent-accept',
    ];

    for (const selector of consentSelectors) {
      try {
        const button = this.page.locator(selector).first();
        const isVisible = await button.isVisible({ timeout: 300 }).catch(() => false);

        if (isVisible) {
          console.log(`Found consent button by selector: ${selector}`);
          await button.click({ timeout: 2000 });
          console.log(`Clicked consent button: ${selector}`);
          await this.page.waitForTimeout(500);
          return { handled: true, buttonClicked: selector };
        }
      } catch (e) {
        continue;
      }
    }

    console.log('No consent dialog found or all attempts failed');
    return { handled: false, buttonClicked: null };
  }
}
