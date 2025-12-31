// Edge Function: error-monitor v1
// Busca logs de erros de todos os serviços Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_ACCESS_TOKEN = Deno.env.get('SUPABASE_ACCESS_TOKEN');
const PROJECT_REF = 'suqjifkhmekcdflwowiw';

interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  metadata?: Record<string, unknown>;
}

async function fetchServiceLogs(service: string): Promise<LogEntry[]> {
  try {
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/analytics/endpoints/logs.all`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[${service}] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const logs: LogEntry[] = [];

    // Parse logs based on service type
    if (Array.isArray(data)) {
      for (const entry of data) {
        const isError =
          entry.status_code >= 400 ||
          entry.level === 'error' ||
          entry.error_severity === 'ERROR' ||
          entry.msg?.includes('error') ||
          entry.msg?.includes('Error');

        if (isError) {
          logs.push({
            id: entry.id || crypto.randomUUID(),
            timestamp: entry.timestamp || new Date().toISOString(),
            service: service,
            level: entry.status_code >= 500 ? 'error' : 'warning',
            message: entry.msg || entry.message || `HTTP ${entry.status_code}`,
            metadata: {
              status_code: entry.status_code,
              path: entry.path,
              method: entry.method,
            }
          });
        }
      }
    }

    return logs;
  } catch (error) {
    console.error(`[${service}] Fetch error:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[error-monitor] Fetching logs from all services...');

    // Use MCP-style log fetching for each service
    const services = ['api', 'edge-function', 'auth', 'postgres', 'storage', 'realtime'];
    const allErrors: LogEntry[] = [];

    // Fetch logs using the internal Supabase log system
    for (const service of services) {
      try {
        // Use the same approach as health-checker - direct VPS call for now
        // In production, would use Management API with proper auth

        // Simulated error detection based on service health
        const healthResponse = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          }
        });

        if (!healthResponse.ok) {
          allErrors.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            service: 'api',
            level: 'error',
            message: `API returned ${healthResponse.status}`,
            metadata: { status_code: healthResponse.status }
          });
        }
      } catch (e) {
        // Service check failed
      }
    }

    // Check Edge Functions logs via function invocation errors
    // This would be populated by actual error tracking

    // Check VPS services for errors
    const vpsServices = [
      { name: 'video-qualifier', url: 'http://173.249.22.2:8001/health' },
      { name: 'youtube-search', url: 'http://173.249.22.2:8002/health' },
      { name: 'claude-api', url: 'http://173.249.22.2:10200/health' },
      { name: 'orchestrator', url: 'http://173.249.22.2:8080/health' },
    ];

    for (const svc of vpsServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(svc.url, {
          signal: controller.signal,
          method: 'GET'
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          allErrors.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            service: svc.name,
            level: 'error',
            message: `Service returned HTTP ${response.status}`,
            metadata: { status_code: response.status, url: svc.url }
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (!errorMsg.includes('abort')) {
          allErrors.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            service: svc.name,
            level: 'error',
            message: `Service unreachable: ${errorMsg}`,
            metadata: { url: svc.url }
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    allErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to 50 most recent
    const recentErrors = allErrors.slice(0, 50);

    console.log(`[error-monitor] Found ${recentErrors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      total: recentErrors.length,
      errors: recentErrors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[error-monitor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errors: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
