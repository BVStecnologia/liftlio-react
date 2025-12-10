/**
 * CAPTCHA Token Injector Module
 * Injects solved CAPTCHA tokens into web pages
 */

import { Page } from 'patchright';
import { CaptchaInfo } from './detector';

/**
 * Inject a solved CAPTCHA token into the page
 */
export async function injectCaptchaToken(
  page: Page,
  token: string,
  captchaType: CaptchaInfo['type']
): Promise<boolean> {
  try {
    console.log(`[CAPTCHA INJECTOR] Injecting ${captchaType} token...`);

    const result = await page.evaluate(({ token, type }: { token: string; type: string }) => {
      let success = false;

      if (type === 'recaptcha_v2' || type === 'recaptcha_v3') {
        // Method 1: Fill the hidden textarea
        const responseTextarea = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement;
        if (responseTextarea) {
          responseTextarea.value = token;
          responseTextarea.style.display = 'block'; // Temporarily show to allow value change
          responseTextarea.innerHTML = token;
          responseTextarea.style.display = 'none';
          success = true;
        }

        // Also fill any other recaptcha response fields
        const allResponseFields = document.querySelectorAll('[name="g-recaptcha-response"]');
        allResponseFields.forEach(field => {
          (field as HTMLTextAreaElement).value = token;
        });

        // Method 2: Call the callback function
        try {
          // Try grecaptcha callback
          const grecaptcha = (window as any).grecaptcha;
          if (grecaptcha) {
            // Try enterprise callback
            if (grecaptcha.enterprise?.getResponse) {
              grecaptcha.enterprise.execute?.();
            }

            // Try to find and call the callback from config
            const clients = (window as any).___grecaptcha_cfg?.clients;
            if (clients) {
              for (const clientId in clients) {
                const client = clients[clientId];
                // Navigate through nested structure to find callback
                const findCallback = (obj: any): Function | null => {
                  if (!obj || typeof obj !== 'object') return null;
                  if (typeof obj.callback === 'function') return obj.callback;
                  for (const key in obj) {
                    const result = findCallback(obj[key]);
                    if (result) return result;
                  }
                  return null;
                };

                const callback = findCallback(client);
                if (callback) {
                  callback(token);
                  success = true;
                }
              }
            }
          }
        } catch (e) {
          console.log('Callback injection failed:', e);
        }

        // Method 3: Dispatch events
        try {
          const event = new Event('input', { bubbles: true });
          responseTextarea?.dispatchEvent(event);

          const changeEvent = new Event('change', { bubbles: true });
          responseTextarea?.dispatchEvent(changeEvent);
        } catch (e) {
          // Ignore event errors
        }
      }

      if (type === 'hcaptcha') {
        // Fill hCaptcha response fields
        const responseFields = document.querySelectorAll('[name="h-captcha-response"], [name="g-recaptcha-response"]');
        responseFields.forEach(field => {
          (field as HTMLTextAreaElement).value = token;
          success = true;
        });

        // Try to call hcaptcha callback
        try {
          const hcaptcha = (window as any).hcaptcha;
          if (hcaptcha) {
            // Find callback from hcaptcha config
            const callbacks = document.querySelectorAll('[data-callback]');
            callbacks.forEach(el => {
              const callbackName = el.getAttribute('data-callback');
              if (callbackName && typeof (window as any)[callbackName] === 'function') {
                (window as any)[callbackName](token);
                success = true;
              }
            });
          }
        } catch (e) {
          console.log('hCaptcha callback failed:', e);
        }
      }

      if (type === 'turnstile') {
        // Fill Turnstile response fields
        const responseFields = document.querySelectorAll('[name="cf-turnstile-response"]');
        responseFields.forEach(field => {
          (field as HTMLTextAreaElement).value = token;
          success = true;
        });

        // Try to call Turnstile callback
        try {
          const turnstile = (window as any).turnstile;
          if (turnstile) {
            // Trigger callback if available
            const widgets = document.querySelectorAll('.cf-turnstile[data-callback]');
            widgets.forEach(el => {
              const callbackName = el.getAttribute('data-callback');
              if (callbackName && typeof (window as any)[callbackName] === 'function') {
                (window as any)[callbackName](token);
                success = true;
              }
            });
          }
        } catch (e) {
          console.log('Turnstile callback failed:', e);
        }
      }

      return success;
    }, { token, type: captchaType });

    if (result) {
      console.log(`[CAPTCHA INJECTOR] Token injected successfully`);
    } else {
      console.log(`[CAPTCHA INJECTOR] Token injection may have failed - no response field found`);
    }

    return result;
  } catch (error) {
    console.error('[CAPTCHA INJECTOR] Error injecting token:', error);
    return false;
  }
}

/**
 * Submit the form after injecting CAPTCHA token
 */
export async function submitFormAfterCaptcha(page: Page): Promise<boolean> {
  try {
    // Try to find and click submit button
    const submitted = await page.evaluate(() => {
      // Common submit button selectors
      const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '[data-callback] + button',
        '.g-recaptcha + button',
        '.h-captcha + button',
        'form button:last-child',
        '#submit',
        '.submit-btn',
        '[name="submit"]'
      ];

      for (const selector of selectors) {
        const btn = document.querySelector(selector) as HTMLElement;
        if (btn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }

      // Try to submit the form directly
      const form = document.querySelector('form');
      if (form) {
        form.submit();
        return true;
      }

      return false;
    });

    if (submitted) {
      console.log('[CAPTCHA INJECTOR] Form submitted');
      // Wait for navigation or response
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    return submitted;
  } catch (error) {
    console.error('[CAPTCHA INJECTOR] Error submitting form:', error);
    return false;
  }
}
