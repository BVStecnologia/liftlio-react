// Edge Function: Retornar-Ids-do-youtube
/**
 * Chama o servidor Python YouTube Search Engine v5 para buscar e selecionar vídeos
 * usando Claude AI para análise semântica.
 *
 * COMO TESTAR NO PAINEL DO SUPABASE:
 * ====================================
 * Body (JSON):
 * {"scannerId": 584}
 *
 * Scanners disponíveis:
 * - 584: Get More Customers
 * - 583: Shopify Sales
 * - 402: SEO Optimization
 *
 * RESPOSTA ESPERADA:
 * ==================
 * {
 *   "text": "id1,id2",       // Campo principal usado pelas funções SQL (AGORA 2 IDs!)
 *   "success": true,
 *   "data": {...}            // Dados completos para debug
 * }
 *
 * Tempo de resposta normal: 50-60 segundos (devido às chamadas ao Claude)
 *
 * CHANGELOG V2 (28/10/2025):
 * - Timeout aumentado: 50s → 120s (API leva ~56s)
 * - Sistema agora retorna 2 vídeos ao invés de 1
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
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
      signal: AbortSignal.timeout(120000)  // FIX: 50s → 120s (API leva ~56s)
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
    console.log(`[${requestId}] Video count: ${videoIdsString.split(',').length}`);

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

    console.log(`[${requestId}] Returning ${videoIdsString.split(',').length} video IDs: ${videoIdsString}`);
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
