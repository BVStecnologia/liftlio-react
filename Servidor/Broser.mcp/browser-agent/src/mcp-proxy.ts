/**
 * MCP Proxy Layer
 * Proxies calls to Playwright MCP while adding custom features:
 * - Humanization (delays before clicks)
 * - SSE event broadcasting
 * - Session persistence hooks
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { BrowserManager } from './browser-manager';
import { IncomingMessage, ServerResponse } from 'http';

const PLAYWRIGHT_MCP_URL = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:8931';

// Random delay between min and max milliseconds
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Routes that should be handled locally by Express, NOT proxied to Playwright MCP
 * These endpoints use the local browserManager instance
 */
const LOCAL_ROUTES = [
  '/screenshot',
  '/snapshot',
  '/navigate',
  '/click',
  '/type',
  '/back',
  '/forward',
  '/scroll',
  '/waitFor',
  '/close'
];

/**
 * Create MCP Proxy Router
 * @param getBrowserManager - Function to get current browser manager instance
 * @param broadcastEvent - Function to broadcast SSE events
 */
export function createMCPProxy(
  getBrowserManager: () => BrowserManager | null,
  broadcastEvent: (event: string, data: unknown) => void
): Router {
  const router = Router();

  // Humanization settings
  const HUMANIZATION_ENABLED = process.env.HUMANIZATION_ENABLED !== 'false';
  const CLICK_DELAY_MIN = parseInt(process.env.CLICK_DELAY_MIN || '50');
  const CLICK_DELAY_MAX = parseInt(process.env.CLICK_DELAY_MAX || '150');
  const TYPE_DELAY_MIN = parseInt(process.env.TYPE_DELAY_MIN || '30');
  const TYPE_DELAY_MAX = parseInt(process.env.TYPE_DELAY_MAX || '80');

  // Skip proxy for local routes - let them be handled by Express endpoints
  router.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const isLocalRoute = LOCAL_ROUTES.some(route => path === route || path.startsWith(route));

    if (isLocalRoute) {
      // Skip this router entirely, let Express handle it
      return next('router');
    }

    next();
  });

  // Pre-handler for humanization
  router.use(async (req: Request, res: Response, next: NextFunction) => {
    const browserManager = getBrowserManager();

    // Only apply humanization if enabled and we have a browser manager
    if (!HUMANIZATION_ENABLED || !browserManager) {
      return next();
    }

    const path = req.path;
    const body = req.body || {};

    try {
      // Apply humanization delays based on action type
      if (path.includes('browser_click') || path.includes('click')) {
        const delay = randomDelay(CLICK_DELAY_MIN, CLICK_DELAY_MAX);
        console.log(`[MCP-Proxy] Humanization: ${delay}ms delay before click`);
        await sleep(delay);

        // Broadcast pre-click event
        broadcastEvent('mcp_action_start', {
          action: 'click',
          target: body.element || body.ref,
          timestamp: new Date().toISOString()
        });
      }

      if (path.includes('browser_type') || path.includes('type')) {
        const delay = randomDelay(TYPE_DELAY_MIN, TYPE_DELAY_MAX);
        console.log(`[MCP-Proxy] Humanization: ${delay}ms delay before type`);
        await sleep(delay);

        broadcastEvent('mcp_action_start', {
          action: 'type',
          text: body.text?.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        });
      }

      if (path.includes('browser_navigate') || path.includes('navigate')) {
        broadcastEvent('mcp_action_start', {
          action: 'navigate',
          url: body.url,
          timestamp: new Date().toISOString()
        });
      }

      if (path.includes('browser_snapshot') || path.includes('snapshot')) {
        broadcastEvent('mcp_action_start', {
          action: 'snapshot',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('[MCP-Proxy] Humanization error:', error);
    }

    next();
  });

  // Create proxy middleware with proper typing
  const proxy = createProxyMiddleware({
    target: PLAYWRIGHT_MCP_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/mcp': '' // Remove /mcp prefix when forwarding
    },
    on: {
      proxyRes: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => {
        // Broadcast completion events
        const path = (req as Request).path || req.url || '';

        // Collect response body for broadcasting
        let responseBody = '';

        proxyRes.on('data', (chunk: Buffer) => {
          responseBody += chunk.toString();
        });

        proxyRes.on('end', () => {
          try {
            const data = responseBody ? JSON.parse(responseBody) : {};

            broadcastEvent('mcp_action_complete', {
              path: path,
              status: proxyRes.statusCode,
              result: data,
              timestamp: new Date().toISOString()
            });
          } catch {
            // Ignore parse errors
          }
        });
      },
      error: (err: Error, req: IncomingMessage, res: ServerResponse | import('net').Socket) => {
        console.error('[MCP-Proxy] Proxy error:', err.message);

        broadcastEvent('mcp_error', {
          path: req.url || '',
          error: err.message,
          timestamp: new Date().toISOString()
        });

        // Only send response if res is a ServerResponse (not a Socket)
        if ('headersSent' in res && !res.headersSent) {
          (res as ServerResponse).writeHead(502, { 'Content-Type': 'application/json' });
          (res as ServerResponse).end(JSON.stringify({
            error: 'Playwright MCP unavailable',
            message: err.message,
            fallback: 'Use direct browser-manager methods'
          }));
        }
      }
    }
  });

  // Apply proxy to all /mcp routes
  router.use('/', proxy);

  return router;
}

/**
 * Health check for Playwright MCP service
 */
export async function checkPlaywrightMCPHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PLAYWRIGHT_MCP_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
