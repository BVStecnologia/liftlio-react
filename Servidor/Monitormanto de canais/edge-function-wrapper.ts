// =============================================
// Edge Function: Video Qualifier Wrapper
// Compatível com SQL existente (call_api_edge_function)
// =============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: CORS_HEADERS,
      status: 204
    });
  }

  try {
    // Parse request body
    const { input_value } = await req.json();

    if (!input_value) {
      return new Response(
        JSON.stringify({
          error: 'Missing input_value parameter',
          text: 'NOT'
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📥 Received request for scanner_id: ${input_value}`);

    // Call Video Qualifier API on VPS
    const vpsResponse = await fetch('http://173.249.22.2:8001/qualify-videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scanner_id: parseInt(input_value)
      }),
      signal: AbortSignal.timeout(120000) // 120s timeout
    });

    if (!vpsResponse.ok) {
      const errorText = await vpsResponse.text();
      console.error(`❌ VPS API error (${vpsResponse.status}): ${errorText}`);

      return new Response(
        JSON.stringify({
          error: `VPS API returned ${vpsResponse.status}`,
          details: errorText,
          text: 'NOT'
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse VPS response
    const vpsData = await vpsResponse.json();
    console.log(`📊 VPS Response:`, vpsData);

    // ⚠️ LOG WARNINGS (if any)
    if (vpsData.warnings && vpsData.warnings.length > 0) {
      console.warn(`⚠️ Warnings (${vpsData.warnings.length}):`, vpsData.warnings);
      vpsData.warnings.forEach((w: string, i: number) => {
        console.warn(`  ${i + 1}. ${w}`);
      });
    }

    // 📊 LOG STATS
    if (vpsData.stats) {
      console.log(`📊 Stats:`, vpsData.stats);
      if (vpsData.stats.videos_without_transcript > 0) {
        console.warn(`  ⚠️ ${vpsData.stats.videos_without_transcript} videos without transcript`);
      }
    }

    // Extract video IDs (compatible with SQL format)
    const videoIdsCsv = vpsData.qualified_video_ids_csv || '';
    const resultText = videoIdsCsv.trim() === '' ? 'NOT' : videoIdsCsv;

    console.log(`✅ Returning to SQL: ${resultText}`);

    // Return in SQL-compatible format
    return new Response(
      JSON.stringify({
        text: resultText,
        // Optional: Include extra metadata for debugging
        metadata: {
          total_analyzed: vpsData.total_analyzed,
          execution_time: vpsData.execution_time_seconds,
          success: vpsData.success
        }
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        text: 'NOT'
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }
});

/*
=== EXEMPLOS DE USO ===

1. Via cURL:
curl -X POST 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/video-qualifier-wrapper' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON-KEY]" \
  -d '{"input_value": "1118"}'

2. Resposta (com vídeos):
{
  "text": "abc123,xyz789,def456",
  "metadata": {
    "total_analyzed": 3,
    "execution_time": 17.5,
    "success": true
  }
}

3. Resposta (sem vídeos):
{
  "text": "NOT",
  "metadata": {
    "total_analyzed": 1,
    "execution_time": 12.3,
    "success": true
  }
}

4. Uso com SQL existente (SEM MODIFICAR SQL):
SELECT call_api_edge_function('1118');
SELECT get_api_text('1118');

TOTALMENTE COMPATÍVEL! ✅
*/
