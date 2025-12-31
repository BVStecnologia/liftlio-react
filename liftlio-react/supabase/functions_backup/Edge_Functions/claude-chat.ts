/**
 * =============================================================================
 * LIFTLIO CLAUDE CHAT - Edge Function
 * =============================================================================
 * Proxy para o container Claude Code API no servidor
 * Permite chamar o Claude de SQL Functions ou do frontend
 *
 * v4: Added OAuth token validation - checks system_config before processing
 * =============================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuração do servidor Claude Code API
const CLAUDE_API_URL = Deno.env.get("CLAUDE_API_URL") || "http://173.249.22.2:10200";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========== CHECK OAUTH TOKEN STATUS (v4) ==========
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: oauthConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'browser_oauth_token')
        .single();

      if (oauthConfig?.value?.status === 'expired') {
        console.log('[CLAUDE-CHAT] OAuth token EXPIRED - rejecting request');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'OAuth token expired. Renew token on VPS.',
            tokenStatus: 'expired',
            action: 'Run oauth-direct.js on VPS and sync volumes'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ========== END OAUTH CHECK ==========

    // Parse request body
    const body = await req.json();
    const {
      message,
      maxTurns = 10,
      continueSession = false,
      model = null  // "haiku" | "sonnet" | "opus" (default: opus)
    } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CLAUDE-CHAT] Message: ${message.substring(0, 100)}... Model: ${model || 'default'}`);

    // Call Claude Code API
    const response = await fetch(`${CLAUDE_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        maxTurns,
        continueSession,
        model,  // Pass model to API
      }),
    });

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CLAUDE-CHAT] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Claude API error: ${response.status}`,
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse response
    const data = await response.json();

    console.log(`[CLAUDE-CHAT] Success: ${data.success}, Duration: ${data.duration}ms`);

    // Return response
    return new Response(
      JSON.stringify({
        success: data.success,
        response: data.response,
        sessionId: data.sessionId,
        duration: data.duration,
        model: model || 'opus',
        cost: data.output?.total_cost_usd || null,
        usage: data.output?.usage || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error(`[CLAUDE-CHAT] Error: ${error.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
