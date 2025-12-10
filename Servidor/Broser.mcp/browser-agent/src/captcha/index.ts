/**
 * CAPTCHA Module - Main Export
 *
 * Provides CAPTCHA detection, solving, and injection capabilities
 * using CapMonster Cloud API
 */

export { detectCaptcha, isBlockedByCaptcha, CaptchaInfo } from './detector';
export { solveCaptcha, getBalance, isConfigured } from './solver';
export { injectCaptchaToken, submitFormAfterCaptcha } from './injector';

import { Page } from 'patchright';
import { detectCaptcha, isBlockedByCaptcha } from './detector';
import { solveCaptcha, isConfigured } from './solver';
import { injectCaptchaToken } from './injector';

export interface CaptchaSolveResult {
  solved: boolean;
  type?: string;
  time?: number;
  error?: string;
}

/**
 * High-level function to handle CAPTCHA if present
 * Returns true if CAPTCHA was solved or not present
 */
export async function handleCaptchaIfPresent(page: Page): Promise<CaptchaSolveResult> {
  const startTime = Date.now();

  try {
    // Check if CapMonster is configured
    const configured = await isConfigured();
    if (!configured) {
      console.log('[CAPTCHA] CapMonster not configured, skipping CAPTCHA handling');
      return { solved: false, error: 'CapMonster not configured' };
    }

    // Detect CAPTCHA
    const captchaInfo = await detectCaptcha(page);

    if (!captchaInfo) {
      // Check if blocked by challenge page
      const blocked = await isBlockedByCaptcha(page);
      if (!blocked) {
        return { solved: true }; // No CAPTCHA present
      }
      return { solved: false, error: 'Blocked by challenge but could not detect CAPTCHA type' };
    }

    console.log(`[CAPTCHA] Detected ${captchaInfo.type} CAPTCHA, solving...`);

    // Solve CAPTCHA
    const pageUrl = page.url();
    const token = await solveCaptcha(captchaInfo, pageUrl);

    // Inject token
    const injected = await injectCaptchaToken(page, token, captchaInfo.type);

    const elapsed = Date.now() - startTime;

    if (injected) {
      console.log(`[CAPTCHA] Successfully solved ${captchaInfo.type} in ${elapsed}ms`);
      return {
        solved: true,
        type: captchaInfo.type,
        time: elapsed
      };
    } else {
      return {
        solved: false,
        type: captchaInfo.type,
        time: elapsed,
        error: 'Token injection failed'
      };
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CAPTCHA] Error handling CAPTCHA:', errorMessage);
    return {
      solved: false,
      time: elapsed,
      error: errorMessage
    };
  }
}

/**
 * Retry an action with CAPTCHA handling
 */
export async function retryWithCaptchaHandling<T>(
  page: Page,
  action: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if failed due to CAPTCHA
      const captchaResult = await handleCaptchaIfPresent(page);

      if (captchaResult.solved && captchaResult.type) {
        console.log(`[CAPTCHA] CAPTCHA solved, retrying action (attempt ${attempt + 1}/${maxRetries + 1})`);
        // Wait a bit after CAPTCHA solve
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // If no CAPTCHA or couldn't solve, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}
