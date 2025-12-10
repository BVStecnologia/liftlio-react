/**
 * CAPTCHA Solving Endpoints (CapMonster Cloud)
 * Provides HTTP API for CAPTCHA detection and solving
 */

import express from 'express';
import { BrowserManager } from './browser-manager';
import { getBalance, isConfigured, detectCaptcha, handleCaptchaIfPresent } from './captcha';

/**
 * Setup CAPTCHA endpoints on the Express app
 */
export function setupCaptchaEndpoints(
  app: express.Application,
  getBrowserManager: () => BrowserManager | null,
  broadcastEvent: (event: string, data: any) => void
): void {

  /**
   * Get CapMonster balance
   */
  app.get('/captcha/balance', async (req, res) => {
    try {
      const configured = await isConfigured();
      if (!configured) {
        return res.json({
          success: false,
          error: 'CapMonster not configured (CAPMONSTER_API_KEY missing)'
        });
      }

      const balance = await getBalance();
      res.json({
        success: true,
        balance,
        currency: 'USD'
      });
    } catch (error: any) {
      console.error('Failed to get CapMonster balance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Detect CAPTCHA on current page
   */
  app.get('/captcha/detect', async (req, res) => {
    try {
      const browserManager = getBrowserManager();
      if (!browserManager?.isRunning()) {
        return res.status(400).json({ error: 'Browser not initialized' });
      }

      const page = browserManager.getPage();
      if (!page) {
        return res.status(400).json({ error: 'No page available' });
      }

      const captchaInfo = await detectCaptcha(page);

      res.json({
        success: true,
        captchaDetected: !!captchaInfo,
        captcha: captchaInfo,
        url: page.url()
      });
    } catch (error: any) {
      console.error('CAPTCHA detection failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Solve CAPTCHA on current page (detect + solve + inject)
   */
  app.post('/captcha/solve', async (req, res) => {
    try {
      const browserManager = getBrowserManager();
      if (!browserManager?.isRunning()) {
        return res.status(400).json({ error: 'Browser not initialized' });
      }

      const page = browserManager.getPage();
      if (!page) {
        return res.status(400).json({ error: 'No page available' });
      }

      console.log('[CAPTCHA] Starting solve process...');
      const result = await handleCaptchaIfPresent(page);

      broadcastEvent('captcha_solved', result);

      res.json({
        success: result.solved,
        ...result,
        url: page.url()
      });
    } catch (error: any) {
      console.error('CAPTCHA solve failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('CAPTCHA endpoints registered: /captcha/balance, /captcha/detect, /captcha/solve');
}
