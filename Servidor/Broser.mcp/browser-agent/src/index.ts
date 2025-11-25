/**
 * Browser Agent - MCP Server
 * Exposes Playwright browser control via HTTP/SSE
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { BrowserManager, BrowserSnapshot } from './browser-manager';
import dotenv from 'dotenv';
import { setupAgentEndpoint } from './agent-endpoint';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.MCP_PORT || '3000');
const PROJECT_ID = process.env.PROJECT_ID || 'default';
const PROJECT_INDEX = parseInt(process.env.PROJECT_INDEX || '0');
const PROFILES_DIR = process.env.PROFILES_DIR || '/data/profiles';
const HEADLESS = process.env.HEADLESS !== 'false';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow SSE
}));
app.use(cors());
app.use(express.json());

// Browser manager instance
let browserManager: BrowserManager | null = null;

// SSE clients
const sseClients: Map<string, express.Response> = new Map();

/**
 * Send event to all SSE clients
 */
function broadcastEvent(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  sseClients.forEach((res, clientId) => {
    try {
      res.write(message);
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
      sseClients.delete(clientId);
    }
  });
}

// Setup AI Agent endpoint (after broadcastEvent is defined)
setupAgentEndpoint(
  app,
  () => browserManager,
  (bm: BrowserManager) => { browserManager = bm; },
  {
    projectId: PROJECT_ID,
    projectIndex: PROJECT_INDEX,
    profilesDir: PROFILES_DIR,
    headless: HEADLESS
  },
  broadcastEvent
);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    projectId: PROJECT_ID,
    browserRunning: browserManager?.isRunning() || false,
    currentUrl: browserManager?.getCurrentUrl() || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * SSE endpoint for real-time updates
 */
app.get('/sse', (req, res) => {
  const clientId = uuidv4();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, projectId: PROJECT_ID })}\n\n`);

  // Store client
  sseClients.set(clientId, res);
  console.log(`SSE client connected: ${clientId}`);

  // Handle disconnect
  req.on('close', () => {
    sseClients.delete(clientId);
    console.log(`SSE client disconnected: ${clientId}`);
  });
});

/**
 * Initialize browser
 */
app.post('/browser/init', async (req, res) => {
  try {
    if (browserManager?.isRunning()) {
      return res.json({ success: true, message: 'Browser already running' });
    }

    browserManager = new BrowserManager({
      projectId: PROJECT_ID,
      projectIndex: PROJECT_INDEX,
      profilesDir: PROFILES_DIR,
      headless: HEADLESS
    });

    await browserManager.initialize();

    broadcastEvent('browser_initialized', { projectId: PROJECT_ID });

    res.json({ success: true, message: 'Browser initialized' });
  } catch (error: any) {
    console.error('Failed to initialize browser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Navigate to URL
 */
app.post('/mcp/navigate', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!browserManager?.isRunning()) {
      // Auto-initialize browser if not running
      browserManager = new BrowserManager({
        projectId: PROJECT_ID,
        projectIndex: PROJECT_INDEX,
        profilesDir: PROFILES_DIR,
        headless: HEADLESS
      });
      await browserManager.initialize();
    }

    const snapshot = await browserManager.navigate(url);

    broadcastEvent('navigation', { url, snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Navigation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Click element
 */
app.post('/mcp/click', async (req, res) => {
  try {
    const { selector } = req.body;

    if (!selector) {
      return res.status(400).json({ error: 'Selector is required' });
    }

    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.click(selector);

    broadcastEvent('click', { selector, snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Click failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Type text
 */
app.post('/mcp/type', async (req, res) => {
  try {
    const { selector, text } = req.body;

    if (!selector || !text) {
      return res.status(400).json({ error: 'Selector and text are required' });
    }

    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.type(selector, text);

    broadcastEvent('type', { selector, snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Type failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Take screenshot
 */
app.post('/mcp/screenshot', async (req, res) => {
  try {
    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const screenshotPath = await browserManager.screenshot();

    broadcastEvent('screenshot', { path: screenshotPath });

    res.json({ success: true, path: screenshotPath });
  } catch (error: any) {
    console.error('Screenshot failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Get current snapshot
 */
app.get('/mcp/snapshot', async (req, res) => {
  try {
    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.getSnapshot();

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Snapshot failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Go back
 */
app.post('/mcp/back', async (req, res) => {
  try {
    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.goBack();

    broadcastEvent('navigation', { action: 'back', snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Go back failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Go forward
 */
app.post('/mcp/forward', async (req, res) => {
  try {
    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.goForward();

    broadcastEvent('navigation', { action: 'forward', snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Go forward failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Reload
 */
app.post('/mcp/reload', async (req, res) => {
  try {
    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const snapshot = await browserManager.reload();

    broadcastEvent('navigation', { action: 'reload', snapshot });

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Reload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MCP Tool: Evaluate JavaScript
 */
app.post('/mcp/evaluate', async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    if (!browserManager?.isRunning()) {
      return res.status(400).json({ error: 'Browser not initialized' });
    }

    const result = await browserManager.evaluate(script);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Evaluate failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Close browser
 */
app.post('/browser/close', async (req, res) => {
  try {
    if (browserManager) {
      await browserManager.close();
      browserManager = null;
    }

    broadcastEvent('browser_closed', { projectId: PROJECT_ID });

    res.json({ success: true, message: 'Browser closed' });
  } catch (error: any) {
    console.error('Failed to close browser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List available MCP tools
 */
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        endpoint: 'POST /mcp/navigate',
        params: { url: 'string (required)' }
      },
      {
        name: 'browser_click',
        description: 'Click on an element',
        endpoint: 'POST /mcp/click',
        params: { selector: 'string (required)' }
      },
      {
        name: 'browser_type',
        description: 'Type text into an element',
        endpoint: 'POST /mcp/type',
        params: { selector: 'string (required)', text: 'string (required)' }
      },
      {
        name: 'browser_screenshot',
        description: 'Take a screenshot',
        endpoint: 'POST /mcp/screenshot',
        params: {}
      },
      {
        name: 'browser_snapshot',
        description: 'Get current page snapshot',
        endpoint: 'GET /mcp/snapshot',
        params: {}
      },
      {
        name: 'browser_back',
        description: 'Go back in history',
        endpoint: 'POST /mcp/back',
        params: {}
      },
      {
        name: 'browser_forward',
        description: 'Go forward in history',
        endpoint: 'POST /mcp/forward',
        params: {}
      },
      {
        name: 'browser_reload',
        description: 'Reload current page',
        endpoint: 'POST /mcp/reload',
        params: {}
      },
      {
        name: 'browser_evaluate',
        description: 'Execute JavaScript on page',
        endpoint: 'POST /mcp/evaluate',
        params: { script: 'string (required)' }
      }
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');

  if (browserManager) {
    await browserManager.close();
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');

  if (browserManager) {
    await browserManager.close();
  }

  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Browser Agent MCP Server running on port ${PORT}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Project Index: ${PROJECT_INDEX}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Profiles Dir: ${PROFILES_DIR}`);
});
