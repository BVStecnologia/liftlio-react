// =============================================
// Edge Function: Video Qualifier Wrapper v5
// MODIFICAÇÃO: Retorna JSONB array ao invés de string CSV
// =============================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface VideoResult {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  motivo: string;
}

Deno.serve(async (req) => {
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
      return new Response(JSON.stringify({
        error: 'Missing input_value parameter',
        text: []
      }), {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      });
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

      return new Response(JSON.stringify({
        error: `VPS API returned ${vpsResponse.status}`,
        details: errorText,
        text: []
      }), {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse VPS response
    const vpsData = await vpsResponse.json();
    console.log(`📊 VPS Response:`, vpsData);

    // ⚠️ LOG WARNINGS (if any)
    if (vpsData.warnings && vpsData.warnings.length > 0) {
      console.warn(`⚠️ Warnings (${vpsData.warnings.length}):`, vpsData.warnings);
      vpsData.warnings.forEach((w, i) => {
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

    // ⭐ NOVA LÓGICA: Converter string para JSONB array
    // VPS pode retornar em diferentes formatos, tentar todos:
    const resultsText = vpsData.all_results ||
                       vpsData.qualified_results ||
                       vpsData.results_with_justifications ||
                       vpsData.qualified_video_ids_csv ||
                       '';

    console.log(`📝 Results text from VPS: ${resultsText}`);

    // Se retornou "NOT" ou vazio, retornar array vazio
    if (!resultsText || resultsText.trim() === '' || resultsText === 'NOT') {
      console.log(`✅ No videos to process, returning empty array`);
      return new Response(JSON.stringify({
        text: [],
        metadata: {
          total_analyzed: vpsData.total_analyzed || 0,
          execution_time: vpsData.execution_time_seconds || 0,
          success: vpsData.success || true
        }
      }), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse string para JSONB array
    const videos: VideoResult[] = [];

    try {
      // Formato esperado: "id:✅ APPROVED｜motivo,id:❌ REJECTED｜motivo,..."
      const entries = resultsText.split(',');

      for (const entry of entries) {
        const trimmed = entry.trim();
        if (!trimmed) continue;

        // Separar ID:STATUS｜MOTIVO
        const parts = trimmed.split('｜');
        if (parts.length < 2) {
          // Formato sem justificativa (apenas IDs)
          videos.push({
            id: trimmed,
            status: 'APPROVED',  // Se retornou na lista, assumir aprovado
            motivo: ''
          });
          continue;
        }

        const [idStatusPart, motivoPart] = parts;

        // Separar ID de STATUS
        const colonIndex = idStatusPart.indexOf(':');
        if (colonIndex === -1) {
          // Sem status, apenas ID
          videos.push({
            id: idStatusPart.trim(),
            status: 'APPROVED',
            motivo: motivoPart?.trim() || ''
          });
          continue;
        }

        const videoId = idStatusPart.substring(0, colonIndex).trim();
        const statusPart = idStatusPart.substring(colonIndex + 1).trim();

        // Detectar status (APPROVED ou REJECTED)
        const isApproved = statusPart.includes('✅') || statusPart.includes('APPROVED');
        const status: 'APPROVED' | 'REJECTED' = isApproved ? 'APPROVED' : 'REJECTED';

        videos.push({
          id: videoId,
          status: status,
          motivo: motivoPart?.trim() || ''
        });
      }

      console.log(`✅ Parsed ${videos.length} videos successfully`);
      console.log(`📊 Breakdown: ${videos.filter(v => v.status === 'APPROVED').length} approved, ${videos.filter(v => v.status === 'REJECTED').length} rejected`);

    } catch (parseError) {
      console.error(`❌ Error parsing results: ${parseError.message}`);
      console.error(`   Raw text: ${resultsText}`);

      // Fallback: retornar apenas IDs como aprovados
      const fallbackIds = resultsText.split(',').map(id => id.trim()).filter(id => id && id !== 'NOT');
      fallbackIds.forEach(id => {
        videos.push({
          id: id,
          status: 'APPROVED',
          motivo: 'Parsing error - assumed approved'
        });
      });
    }

    // Return JSONB array format
    return new Response(JSON.stringify({
      text: videos,  // ⭐ AGORA É ARRAY, NÃO STRING!
      metadata: {
        total_analyzed: vpsData.total_analyzed || videos.length,
        execution_time: vpsData.execution_time_seconds || 0,
        success: vpsData.success || true,
        approved_count: videos.filter(v => v.status === 'APPROVED').length,
        rejected_count: videos.filter(v => v.status === 'REJECTED').length
      }
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(JSON.stringify({
      error: error.message,
      text: []
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
});

/*
=== MUDANÇAS NA v5 ===

ANTES (v4):
{
  "text": "id1,id2,id3",  // String CSV
  "metadata": {...}
}

AGORA (v5):
{
  "text": [
    {"id": "id1", "status": "APPROVED", "motivo": "Motivo aprovado"},
    {"id": "id2", "status": "REJECTED", "motivo": "Motivo rejeitado"}
  ],
  "metadata": {
    "total_analyzed": 2,
    "execution_time": 28.5,
    "success": true,
    "approved_count": 1,
    "rejected_count": 1
  }
}

=== COMPATIBILIDADE ===

✅ SQL precisa ser atualizado para:
api_result_text := api_result->'text';  -- Agora é JSONB array
videos_scanreados := api_result_text;   -- Já é JSONB!

=== TESTES ===

1. Via cURL:
curl -X POST 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/video-qualifier-wrapper' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON-KEY]" \
  -d '{"input_value": "1119"}'

2. Resposta esperada:
{
  "text": [
    {"id": "gFpBbvI6NF8", "status": "REJECTED", "motivo": "Vídeo motivacional..."},
    {"id": "ExOuL-QSJms", "status": "REJECTED", "motivo": "Recomendação de livros..."}
  ],
  "metadata": {
    "total_analyzed": 2,
    "execution_time": 28.15,
    "success": true,
    "approved_count": 0,
    "rejected_count": 2
  }
}
*/
