/**
 * Browser Proxy Edge Function
 * Proxies requests from frontend to Browser Orchestrator with API key authentication
 */

import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const ORCHESTRATOR_URL = 'http://173.249.22.2:8080';
const BROWSER_API_KEY = Deno.env.get('BROWSER_MCP_API_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/browser-proxy');
    const targetPath = pathParts[1] || '';

    // Parse request body if present
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text();
      } catch {
        body = undefined;
      }
    }

    // Build target URL
    const targetUrl = `${ORCHESTRATOR_URL}${targetPath}${url.search}`;

    console.log(`Proxying ${req.method} ${targetPath} to ${targetUrl}`);

    // Forward request to orchestrator with API key
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BROWSER_API_KEY,
      },
      body: body || undefined,
    });

    // Get response data
    const responseData = await response.text();

    console.log(`Response status: ${response.status}`);

    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Browser proxy error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: corsHeaders,
      }
    );
  }
});
