// Edge Function: health-checker
// Verifica o status de todos os servicos VPS em uma unica chamada
// Resolve problema de CORS - server-to-server nao tem restricao

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServiceConfig {
  name: string;
  url: string;
  displayName: string;
}

const VPS_SERVICES: ServiceConfig[] = [
  {
    name: 'orchestrator',
    url: 'http://173.249.22.2:8080/health',
    displayName: 'Browser Orchestrator'
  },
  {
    name: 'vpsBrowser',
    url: 'http://173.249.22.2:10100/health',
    displayName: 'VPS Browser Agent'
  },
  {
    name: 'videoQualifier',
    url: 'http://173.249.22.2:8001/health',
    displayName: 'Video Qualifier'
  },
  {
    name: 'transcricao',
    url: 'http://173.249.22.2:8081/docs',
    displayName: 'Transcricao Service'
  },
  {
    name: 'youtubeSearch',
    url: 'http://173.249.22.2:8000/health',
    displayName: 'YouTube Search'
  },
  {
    name: 'mcpGmail',
    url: 'http://173.249.22.2:3000/health',
    displayName: 'MCP Gmail'
  },
  {
    name: 'analyticsServer',
    url: 'https://track.liftlio.com/t.js',
    displayName: 'Analytics Server'
  },
];

interface HealthResult {
  name: string;
  displayName: string;
  status: 'ok' | 'error' | 'offline';
  responseTime?: number;
  httpStatus?: number;
  error?: string;
}

async function checkService(service: ServiceConfig): Promise<HealthResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(service.url, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      name: service.name,
      displayName: service.displayName,
      status: response.ok ? 'ok' : 'error',
      responseTime,
      httpStatus: response.status,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      name: service.name,
      displayName: service.displayName,
      status: 'offline',
      responseTime,
      error: errorMessage.includes('abort') ? 'Timeout (5s)' : errorMessage,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[health-checker] Starting health check for all VPS services...');

    // Check all services in parallel
    const results = await Promise.all(
      VPS_SERVICES.map(service => checkService(service))
    );

    // Build response object
    const healthStatus: Record<string, 'ok' | 'error' | 'offline'> = {};
    const details: HealthResult[] = [];

    for (const result of results) {
      healthStatus[result.name] = result.status;
      details.push(result);
    }

    // Summary
    const totalServices = results.length;
    const healthyServices = results.filter(r => r.status === 'ok').length;
    const offlineServices = results.filter(r => r.status === 'offline').length;

    console.log(`[health-checker] Results: ${healthyServices}/${totalServices} healthy, ${offlineServices} offline`);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices,
        offline: offlineServices,
      },
      status: healthStatus,
      details,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[health-checker] Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
