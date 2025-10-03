// @ts-nocheck - Edge Function roda no Deno (Supabase), não no TypeScript local
/**
 * Edge Function: Retornar-Ids-do-youtube
 *
 * ⚠️ ATENÇÃO: Este arquivo é uma CÓPIA LOCAL para referência.
 * A versão real roda no Supabase Edge Functions (ambiente Deno).
 * Erros de TypeScript aqui são NORMAIS e esperados.
 *
 * Chama o servidor Python YouTube Search Engine v5 para buscar e selecionar vídeos
 * usando Claude AI para análise semântica.
 *
 * COMO TESTAR NO PAINEL DO SUPABASE:
 * ====================================
 * Body (JSON):
 * {"scannerId": 469}
 *
 * Scanners disponíveis:
 * - 469: Shamo (Brasil)
 * - 470: AI Recommendation Engine (US)
 *
 * RESPOSTA ESPERADA:
 * ==================
 * {
 *   "text": "id1,id2,id3",  // Campo principal usado pelas funções SQL
 *   "success": true,
 *   "data": {...}           // Dados completos para debug
 * }
 *
 * Tempo de resposta normal: 8-10 segundos (devido às 2 chamadas ao Claude)
 *
 * CHAMADA POR:
 * ============
 * - 02_update_video_id_cache.sql (linha 34)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Headers anti-cache para prevenir resultados incorretos
  const noCacheHeaders = {
    ...corsHeaders,
    "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: noCacheHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log(`[${requestId}] ========== NEW REQUEST ==========`);
  console.log(`[${requestId}] Time: ${new Date().toISOString()}`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);

  try {
    const { scannerId } = await req.json();
    console.log(`[${requestId}] Scanner ID received: ${scannerId}`);

    // Detectar origem da requisição
    const referer = req.headers.get("referer") || "";
    const isFromPanel = referer.includes('supabase.com');
    console.log(`[${requestId}] From Supabase Panel: ${isFromPanel}`);

    // Chamar servidor Python
    console.log(`[${requestId}] Calling Python server at 173.249.22.2:8000/search...`);
    const pythonStartTime = Date.now();

    const response = await fetch("http://173.249.22.2:8000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ scannerId }),
      signal: AbortSignal.timeout(50000)
    });

    const pythonResponseTime = Date.now() - pythonStartTime;
    console.log(`[${requestId}] Python server responded in ${pythonResponseTime}ms`);
    console.log(`[${requestId}] Python response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Python server error: ${errorText}`);
      throw new Error(`Python server error: ${response.status}`);
    }

    const responseText = await response.text();
    console.log(`[${requestId}] Python raw response length: ${responseText.length} chars`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse response as JSON`);
      throw new Error(`Invalid JSON response from Python server`);
    }

    // Extrair IDs dos vídeos - o servidor retorna no campo "text"
    let videoIdsString = "";
    if (data.text) {
      videoIdsString = data.text;
      console.log(`[${requestId}] Video IDs extracted from 'text': ${videoIdsString}`);
    } else if (data.data && data.data.video_ids_string) {
      videoIdsString = data.data.video_ids_string;
      console.log(`[${requestId}] Video IDs extracted from 'data.video_ids_string': ${videoIdsString}`);
    } else if (data.data && data.data.video_ids) {
      videoIdsString = data.data.video_ids.join(",");
      console.log(`[${requestId}] Video IDs extracted from 'data.video_ids': ${videoIdsString}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${requestId}] Total processing time: ${totalTime}ms`);

    // FORMATO DE RESPOSTA COMPATÍVEL COM AS FUNÇÕES SQL
    // A função SQL 'update_video_id_cache' espera o campo 'text'
    const result = {
      text: videoIdsString,
      success: true,
      data: data.data || data,
      processing_time_ms: totalTime,
      python_response_time_ms: pythonResponseTime,
      request_id: requestId,
      timestamp: Date.now()
    };

    console.log(`[${requestId}] Returning video IDs: ${videoIdsString}`);
    console.log(`[${requestId}] ========== END REQUEST ==========`);

    return new Response(JSON.stringify(result), {
      headers: {
        ...noCacheHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[${requestId}] ERROR after ${errorTime}ms:`, error.message);

    // Resposta de erro compatível
    return new Response(JSON.stringify({
      text: "",
      success: false,
      error: error.message,
      request_id: requestId,
      processing_time_ms: errorTime
    }), {
      headers: {
        ...noCacheHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
