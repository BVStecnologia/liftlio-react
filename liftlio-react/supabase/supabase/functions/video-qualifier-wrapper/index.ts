// =============================================
// Edge Function: Video Qualifier Wrapper V2
// BILINGUAL VERSION: Returns enhanced JSONB array
// =============================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface VideoResult {
  id: string;
  status: 'APPROVED' | 'REJECTED' | 'SKIPPED';
  motivo: string;  // Portuguese
  reason: string;  // English (NEW)
  analyzed_at: string;  // ISO 8601 timestamp (NEW)
  score?: number;  // AI confidence 0-1 (NEW)
  tags?: string[];  // Categories detected (NEW)
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
    console.log(`🌍 Using bilingual V2 API endpoint`);

    // Call Video Qualifier API V2 on VPS
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
    console.log(`📊 VPS Response received`);
    console.log(`   📌 Scanner ID: ${vpsData.scanner_id}`);
    console.log(`   📌 Total analyzed: ${vpsData.total_analyzed}`);
    console.log(`   📌 Qualified count: ${vpsData.qualified_video_ids?.length || 0}`);

    // ⚠️ LOG WARNINGS (if any)
    if (vpsData.warnings && vpsData.warnings.length > 0) {
      console.warn(`⚠️ Warnings (${vpsData.warnings.length}):`);
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

    // ⭐ PROCESS BILINGUAL RESULTS
    let resultsArray: VideoResult[] = [];

    // Check for V2 format with all_results or results_jsonb
    if (vpsData.results_jsonb && Array.isArray(vpsData.results_jsonb)) {
      // V2 format: Direct JSONB array
      console.log(`✅ V2 Format detected: ${vpsData.results_jsonb.length} results`);
      resultsArray = vpsData.results_jsonb;

      // Log bilingual examples
      if (resultsArray.length > 0) {
        const firstResult = resultsArray[0];
        console.log(`📝 Sample bilingual result:`);
        console.log(`   🇧🇷 PT: ${firstResult.motivo}`);
        console.log(`   🇺🇸 EN: ${firstResult.reason}`);
        console.log(`   📊 Score: ${firstResult.score}`);
        console.log(`   🏷️ Tags: ${firstResult.tags?.join(', ') || 'none'}`);
      }
    } else if (vpsData.all_results && Array.isArray(vpsData.all_results)) {
      // V2 format: Structured results
      console.log(`✅ V2 Structured format: ${vpsData.all_results.length} results`);
      resultsArray = vpsData.all_results.map((r: any) => ({
        id: r.id,
        status: r.status,
        motivo: r.motivo,
        reason: r.reason,
        analyzed_at: r.analyzed_at,
        score: r.score,
        tags: r.tags
      }));
    } else {
      // Fallback: Try to parse legacy format
      console.warn(`⚠️ Legacy format detected, converting...`);

      const resultsText = vpsData.all_results ||
                         vpsData.qualified_results ||
                         vpsData.results_with_justifications ||
                         vpsData.qualified_video_ids_csv ||
                         "";

      if (!resultsText || resultsText === "" || resultsText === "NOT") {
        console.log(`❌ No videos qualified or empty response`);
        return new Response(JSON.stringify({
          call_api_edge_function: {
            text: []
          }
        }), {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
          }
        });
      }

      // Parse legacy CSV format and convert to bilingual
      const currentTimestamp = new Date().toISOString();
      const entries = resultsText.split(',');

      resultsArray = entries.map((entry: string) => {
        const [videoId, rest] = entry.split(':');
        let status: 'APPROVED' | 'REJECTED' | 'SKIPPED' = 'REJECTED';
        let motivo = rest || 'Sem análise';

        if (rest?.includes('✅ APPROVED')) {
          status = 'APPROVED';
          motivo = rest.replace('✅ APPROVED｜', '').replace('✅ APPROVED:', '');
        } else if (rest?.includes('❌ REJECTED')) {
          status = 'REJECTED';
          motivo = rest.replace('❌ REJECTED｜', '').replace('❌ REJECTED:', '');
        } else if (rest?.includes('⚠️ SKIPPED')) {
          status = 'SKIPPED';
          motivo = rest.replace('⚠️ SKIPPED｜', '').replace('⚠️ SKIPPED:', '');
        }

        // Generate English translation (basic conversion)
        const reason = translateToEnglish(motivo);

        return {
          id: videoId.trim(),
          status,
          motivo: motivo.trim().substring(0, 120),
          reason: reason.substring(0, 120),
          analyzed_at: currentTimestamp,
          score: status === 'APPROVED' ? 0.8 : 0.2,
          tags: extractTags(motivo)
        };
      }).filter((r: any) => r.id && r.id !== 'NOT' && r.id !== '');
    }

    // Count statistics
    const approvedCount = resultsArray.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = resultsArray.filter(r => r.status === 'REJECTED').length;
    const skippedCount = resultsArray.filter(r => r.status === 'SKIPPED').length;

    console.log(`📊 Final statistics:`);
    console.log(`   ✅ Approved: ${approvedCount}`);
    console.log(`   ❌ Rejected: ${rejectedCount}`);
    console.log(`   ⚠️ Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${resultsArray.length}`);

    // Return JSONB array for direct database storage
    const response = {
      call_api_edge_function: {
        text: resultsArray  // Now returns JSONB array instead of CSV string
      }
    };

    console.log(`✅ Returning bilingual JSONB array with ${resultsArray.length} results`);

    return new Response(JSON.stringify(response), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error(`❌ Edge Function error: ${error}`);
    return new Response(JSON.stringify({
      error: `Edge Function error: ${error.message}`,
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

// Helper function to translate Portuguese to English (basic)
function translateToEnglish(motivo: string): string {
  // Basic keyword translation for common terms
  const translations: Record<string, string> = {
    'Vídeo sobre': 'Video about',
    'Conteúdo sobre': 'Content about',
    'Público': 'Audience',
    'iniciante': 'beginner',
    'empresa': 'enterprise',
    'marketing': 'marketing',
    'desenvolvimento pessoal': 'personal development',
    'sem relação': 'not related',
    'não relacionado': 'not related',
    'produto': 'product',
    'serviço': 'service',
    'genérico': 'generic',
    'específico': 'specific',
    'B2B': 'B2B',
    'B2C': 'B2C',
    'AI': 'AI',
    'IA': 'AI',
    'digital': 'digital',
    'tutorial': 'tutorial',
    'curso': 'course',
    'aula': 'lesson'
  };

  let result = motivo;
  for (const [pt, en] of Object.entries(translations)) {
    result = result.replace(new RegExp(pt, 'gi'), en);
  }

  // If no translation was made, prefix with generic indicator
  if (result === motivo && !motivo.includes('B2B') && !motivo.includes('AI')) {
    result = `Content analysis: ${motivo}`;
  }

  return result;
}

// Helper function to extract tags from reasoning
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();

  // Common tags to detect
  const tagPatterns = [
    { pattern: /\bb2b\b/i, tag: 'b2b' },
    { pattern: /\bb2c\b/i, tag: 'b2c' },
    { pattern: /marketing/i, tag: 'marketing' },
    { pattern: /ai|ia|inteligência artificial|artificial intelligence/i, tag: 'ai' },
    { pattern: /tutorial/i, tag: 'tutorial' },
    { pattern: /curso|course/i, tag: 'course' },
    { pattern: /empresa|enterprise|corporate/i, tag: 'enterprise' },
    { pattern: /iniciante|beginner/i, tag: 'beginner' },
    { pattern: /digital/i, tag: 'digital' },
    { pattern: /vendas|sales/i, tag: 'sales' },
    { pattern: /produto|product/i, tag: 'product' },
    { pattern: /desenvolvimento|development/i, tag: 'development' }
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(lowerText) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5); // Max 5 tags
}

// =============================================
// EXAMPLE RESPONSE FORMAT:
// =============================================
/*
{
  "call_api_edge_function": {
    "text": [
      {
        "id": "abc123",
        "status": "APPROVED",
        "motivo": "Vídeo sobre AI marketing B2B; público enterprise",
        "reason": "Video about B2B AI marketing; enterprise audience",
        "analyzed_at": "2025-01-24T10:30:00Z",
        "score": 0.92,
        "tags": ["b2b", "marketing", "ai", "enterprise"]
      },
      {
        "id": "xyz789",
        "status": "REJECTED",
        "motivo": "Conteúdo genérico sobre produtividade",
        "reason": "Generic content about productivity",
        "analyzed_at": "2025-01-24T10:30:00Z",
        "score": 0.15,
        "tags": ["productivity"]
      }
    ]
  }
}
*/