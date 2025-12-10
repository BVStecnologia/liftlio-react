/**
 * CAPTCHA Detector Module
 * Detects various CAPTCHA types on web pages
 */

import { Page } from 'patchright';

export interface CaptchaInfo {
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'turnstile';
  siteKey: string;
  visible: boolean;
  iframe?: string;
}

/**
 * Detects if there's a CAPTCHA on the current page
 */
export async function detectCaptcha(page: Page): Promise<CaptchaInfo | null> {
  try {
    const captchaInfo = await page.evaluate(() => {
      // Check for reCAPTCHA v2 (checkbox)
      const recaptchaV2Iframe = document.querySelector('iframe[src*="recaptcha/api2"]');
      const recaptchaV2Div = document.querySelector('.g-recaptcha');

      if (recaptchaV2Iframe || recaptchaV2Div) {
        let siteKey = '';

        // Try to get site key from div
        if (recaptchaV2Div) {
          siteKey = (recaptchaV2Div as HTMLElement).dataset.sitekey || '';
        }

        // Try to get site key from iframe src
        if (!siteKey && recaptchaV2Iframe) {
          const src = recaptchaV2Iframe.getAttribute('src') || '';
          const match = src.match(/k=([^&]+)/);
          if (match) siteKey = match[1];
        }

        // Try to get from script
        if (!siteKey) {
          const scripts = document.querySelectorAll('script[src*="recaptcha"]');
          scripts.forEach(script => {
            const src = script.getAttribute('src') || '';
            const match = src.match(/render=([^&]+)/);
            if (match && match[1] !== 'explicit') siteKey = match[1];
          });
        }

        if (siteKey) {
          return {
            type: 'recaptcha_v2' as const,
            siteKey,
            visible: true,
            iframe: recaptchaV2Iframe?.getAttribute('src') || undefined
          };
        }
      }

      // Check for reCAPTCHA v3 (invisible)
      const recaptchaV3Script = document.querySelector('script[src*="recaptcha"][src*="render="]');
      if (recaptchaV3Script) {
        const src = recaptchaV3Script.getAttribute('src') || '';
        const match = src.match(/render=([^&]+)/);
        if (match && match[1] !== 'explicit') {
          return {
            type: 'recaptcha_v3' as const,
            siteKey: match[1],
            visible: false
          };
        }
      }

      // Check for hCaptcha
      const hcaptchaIframe = document.querySelector('iframe[src*="hcaptcha"]');
      const hcaptchaDiv = document.querySelector('.h-captcha');

      if (hcaptchaIframe || hcaptchaDiv) {
        let siteKey = '';

        if (hcaptchaDiv) {
          siteKey = (hcaptchaDiv as HTMLElement).dataset.sitekey || '';
        }

        if (!siteKey && hcaptchaIframe) {
          const src = hcaptchaIframe.getAttribute('src') || '';
          const match = src.match(/sitekey=([^&]+)/);
          if (match) siteKey = match[1];
        }

        if (siteKey) {
          return {
            type: 'hcaptcha' as const,
            siteKey,
            visible: true,
            iframe: hcaptchaIframe?.getAttribute('src') || undefined
          };
        }
      }

      // Check for Cloudflare Turnstile
      const turnstileIframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
      const turnstileDiv = document.querySelector('.cf-turnstile');

      if (turnstileIframe || turnstileDiv) {
        let siteKey = '';

        if (turnstileDiv) {
          siteKey = (turnstileDiv as HTMLElement).dataset.sitekey || '';
        }

        if (siteKey) {
          return {
            type: 'turnstile' as const,
            siteKey,
            visible: true,
            iframe: turnstileIframe?.getAttribute('src') || undefined
          };
        }
      }

      return null;
    });

    return captchaInfo;
  } catch (error) {
    console.log('[CAPTCHA DETECTOR] Error detecting CAPTCHA:', error);
    return null;
  }
}

/**
 * Checks if the page is blocked by a CAPTCHA challenge
 */
export async function isBlockedByCaptcha(page: Page): Promise<boolean> {
  try {
    const blocked = await page.evaluate(() => {
      // Common CAPTCHA challenge indicators
      const indicators = [
        // reCAPTCHA challenge
        'iframe[src*="recaptcha/api2/anchor"]',
        'iframe[src*="recaptcha/api2/bframe"]',
        // hCaptcha challenge
        'iframe[src*="hcaptcha.com/captcha"]',
        // Cloudflare challenge
        '#challenge-running',
        '#challenge-form',
        '.cf-browser-verification',
        // Generic challenge page indicators
        '[data-captcha-challenge]',
        '.captcha-container'
      ];

      for (const selector of indicators) {
        const element = document.querySelector(selector);
        if (element) {
          const style = window.getComputedStyle(element);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
      }

      // Check for challenge text in page
      const bodyText = document.body?.innerText?.toLowerCase() || '';
      const challengeTexts = [
        'verify you are human',
        'i\'m not a robot',
        'complete the captcha',
        'security check',
        'please verify'
      ];

      for (const text of challengeTexts) {
        if (bodyText.includes(text)) {
          return true;
        }
      }

      return false;
    });

    return blocked;
  } catch (error) {
    return false;
  }
}
