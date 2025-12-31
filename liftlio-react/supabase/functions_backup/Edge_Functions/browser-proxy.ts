/**
 * Browser Proxy Edge Function
 * Proxies requests from frontend to Browser Orchestrator with API key authentication
 *
 * Supports actions:
 * - create: Create browser container for project
 * - delete: Delete browser container
 * - health: Check browser agent health
 * - screenshot: Capture screenshot
 * - click-at: Click at coordinates
 * - type-text: Type text
 * - press-key: Press keyboard key
 * - scroll: Scroll page
 * - neko-start: Start Neko real-time browser
 * - neko-status: Get Neko status
 * - neko-stop: Stop Neko browser
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

function handleCorsPreflightRequest() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

const ORCHESTRATOR_URL = 'http://173.249.22.2:8080';
const BROWSER_AGENT_URL = 'http://173.249.22.2:10100';
const BROWSER_API_KEY = Deno.env.get('BROWSER_MCP_API_KEY') || 'liftlio-browser-mcp-secret-key-2025';

interface RequestBody {
  action: string;
  projectId?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  pressEnter?: boolean;
  direction?: 'up' | 'down';
  amount?: number;
  // Google login fields
  email?: string;
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Parse request body
    let body: RequestBody | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    }

    // If no body or no action, treat as simple proxy (legacy support)
    // ALL requests go to orchestrator - NO bypass!
    if (!body || !body.action) {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/browser-proxy');
      const targetPath = pathParts[1] || '';
      const targetUrl = `${ORCHESTRATOR_URL}${targetPath}${url.search}`;

      console.log(`[Proxy] Routing to orchestrator: ${req.method} ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BROWSER_API_KEY
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const responseData = await response.text();
      return new Response(responseData, {
        status: response.status,
        headers: corsHeaders
      });
    }

    const { action, projectId } = body;
    console.log(`[Proxy] Action: ${action}, Project: ${projectId}`);

    let targetUrl: string;
    let method: string = 'GET';
    let requestBody: string | undefined;

    switch (action) {
      // ==========================================
      // ORCHESTRATOR ENDPOINTS (Container Management)
      // ==========================================

      case 'create':
        // Create container for project
        targetUrl = `${ORCHESTRATOR_URL}/containers`;
        method = 'POST';
        requestBody = JSON.stringify({ projectId });
        break;

      case 'delete':
        // Delete container for project
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${ORCHESTRATOR_URL}/containers/${projectId}`;
        method = 'DELETE';
        break;

      case 'status':
        // Get container status
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${ORCHESTRATOR_URL}/containers/${projectId}`;
        method = 'GET';
        break;

      // ==========================================
      // NEKO (WebRTC Real-Time Browser) ENDPOINTS
      // ==========================================

      case 'neko-start':
        // Start Neko container for project
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${ORCHESTRATOR_URL}/neko/${projectId}/start`;
        method = 'POST';
        break;

      case 'neko-status':
        // Get Neko status for project
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${ORCHESTRATOR_URL}/neko/${projectId}/status`;
        method = 'GET';
        break;

      case 'neko-stop':
        // Stop Neko container for project
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${ORCHESTRATOR_URL}/neko/${projectId}/stop`;
        method = 'POST';
        break;

      // ==========================================
      // BROWSER AGENT ENDPOINTS (Direct to Agent)
      // ==========================================

      case 'health':
        // Check browser agent health
        targetUrl = `${BROWSER_AGENT_URL}/health`;
        method = 'GET';
        break;

      case 'screenshot':
        // Capture screenshot
        targetUrl = `${BROWSER_AGENT_URL}/mcp/screenshot`;
        method = 'GET';
        break;

      case 'click-at':
        // Click at coordinates
        if (body.x === undefined || body.y === undefined) {
          throw new Error('x and y coordinates required');
        }
        targetUrl = `${BROWSER_AGENT_URL}/mcp/click`;
        method = 'POST';
        requestBody = JSON.stringify({ x: body.x, y: body.y });
        break;

      case 'type-text':
        // Type text
        if (!body.text) throw new Error('text required');
        targetUrl = `${BROWSER_AGENT_URL}/mcp/type`;
        method = 'POST';
        requestBody = JSON.stringify({ text: body.text, pressEnter: body.pressEnter || false });
        break;

      case 'press-key':
        // Press keyboard key
        if (!body.key) throw new Error('key required');
        targetUrl = `${BROWSER_AGENT_URL}/mcp/key`;
        method = 'POST';
        requestBody = JSON.stringify({ key: body.key });
        break;

      case 'scroll':
        // Scroll page
        targetUrl = `${BROWSER_AGENT_URL}/mcp/scroll`;
        method = 'POST';
        requestBody = JSON.stringify({
          direction: body.direction || 'down',
          amount: body.amount || 500
        });
        break;

      // ==========================================
      // GOOGLE LOGIN ENDPOINTS (Browser Authentication)
      // ==========================================

      case 'google-login':
        // Login to Google account via browser agent
        if (!body.email || !body.password) {
          throw new Error('email and password required');
        }
        targetUrl = `${BROWSER_AGENT_URL}/login/google`;
        method = 'POST';
        requestBody = JSON.stringify({
          email: body.email,
          password: body.password
        });
        break;

      case 'session-save':
        // Save browser session cookies
        if (!projectId) throw new Error('projectId required');
        targetUrl = `${BROWSER_AGENT_URL}/session/save`;
        method = 'POST';
        requestBody = JSON.stringify({ projectId });
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: corsHeaders
        });
    }

    console.log(`[Proxy] ${method} ${targetUrl}`);

    // Make request to target
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BROWSER_API_KEY
      },
      body: requestBody
    });

    // Get response
    const responseData = await response.text();
    console.log(`[Proxy] Response: ${response.status} (${responseData.length} bytes)`);

    // Try to parse as JSON, otherwise return as-is
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = { raw: responseData };
    }

    return new Response(JSON.stringify(parsedData), {
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('[Proxy] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 502,
      headers: corsHeaders
    });
  }
});
