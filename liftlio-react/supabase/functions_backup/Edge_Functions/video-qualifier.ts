/**
 * Video Qualifier Edge Function
 *
 * Replaces the Python VPS API for video qualification.
 * Uses 2-stage filtering with Claude Haiku 4.5:
 * - Stage 1: Pre-filter based on metadata only (fast, cheap)
 * - Stage 2: Full analysis with transcript (only for approved videos)
 *
 * Input: { scanner_id: number }
 * Output: { text: [...], metadata: {...} }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ============================================
// Stage 1 Prompt (Pre-filter - no transcript)
// ============================================
const STAGE1_PROMPT_TEMPLATE = `TAREFA: Pré-filtro rápido - Identificar se vídeo é direcionado a SELLERS (pessoas que vendem algo).

🎯 CRITÉRIO CENTRAL:
O vídeo é para pessoas/empresas que VENDEM produtos ou serviços?

BUYERS VÁLIDOS (APROVAR):
✅ E-commerce/Dropshipping: Vendem produtos físicos
✅ SaaS Founders: Vendem software/apps
✅ Service Providers: Vendem serviços (agências, consultoria, freelance)
✅ Coaches/Creators: Vendem cursos, produtos digitais, mentorias
✅ Local Businesses: Vendem produtos/serviços locais
✅ B2B/B2C Companies: Qualquer negócio vendendo algo

NÃO-BUYERS (REJEITAR):
❌ Content Creators: Fazem vídeos (não vendem produtos)
❌ Paid Ads Specialists: Fazem anúncios (skill técnica)
❌ Consumers/Hobbyists: Consomem conteúdo
❌ Tutorial/How-to (sem venda): Ensinam mas não vendem
❌ Entertainment: Entretenimento puro

⚡ ECONOMIA DE CUSTOS:
- Rejeitar NON-SELLERS economiza ~40% (evita processar transcrições desnecessárias)
- Na dúvida sobre SE VENDE algo → REJEITE (melhor falso negativo que falso positivo aqui)
- Se vídeo é para quem VENDE → APROVAR (Stage 2 valida relevância)

RESPOSTA OBRIGATÓRIA (JSON):
Retorne um objeto JSON onde cada chave é o video_id e o valor é:
- "PASS" se vídeo é para SELLERS (mesmo que nicho diferente)
- "PRE_FILTER_REJECT: [motivo breve, max 80 chars]" se vídeo NÃO é para sellers

Exemplo:
{
  "abc123": "PASS",
  "xyz789": "PRE_FILTER_REJECT: Vídeo para content creators; não vendem produtos",
  "def456": "PASS"
}

ATENÇÃO: Use EXATAMENTE o prefixo "PRE_FILTER_REJECT:" (não use "REJECT:")

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}`;

// ============================================
// Stage 2 Prompt (Full analysis - with transcript)
// ============================================
const STAGE2_PROMPT_TEMPLATE = `TAREFA: Análise em 2 CAMADAS - Determinar se vídeos são relevantes para ferramenta de discovery.

═══════════════════════════════════════════════════════════
CAMADA 1: BUYER QUALIFICATION (Eliminatória)
═══════════════════════════════════════════════════════════

Responda SIM ou NÃO para CADA pergunta:

1️⃣ VIEWER VENDE ALGO?
   ✅ SIM: Produto físico, digital, SaaS, serviço, curso, consultoria
   ❌ NÃO: Apenas consome, é hobbysta, employee sem decision making

2️⃣ VIEWER PRECISA DE CLIENTES/DESCOBERTA?
   ✅ SIM: Busca growth, acquisition, leads, visibilidade, conversions
   **IMPORTANTE**: E-commerce/Dropshipping/Shopify sellers SEMPRE = SIM
   (product research/sourcing É PARTE do processo de selling)
   ❌ NÃO: Apenas skill técnica, entretenimento, educação não-business

3️⃣ PRODUTO RESOLVE PROBLEMA DO VIEWER?
   ✅ SIM: Discovery orgânica ajuda a conseguir clientes/leads
   ❌ NÃO: Problema é técnico (ex: edição, design, operações)

DECISÃO CAMADA 1:
- SE QUALQUER "NÃO" → ❌ REJECTED (score 0.2)
- SE TODAS "SIM" → Prosseguir para CAMADA 2

═══════════════════════════════════════════════════════════
CAMADA 2: RELEVANCE SCORING (0-100 pontos)
═══════════════════════════════════════════════════════════

A. AUDIENCE OVERLAP (0-40 pontos)
   - Mesmo tipo de negócio (B2B, B2C, D2C, SaaS, Physical)? 0-15 pts
   - Mesmo stage (Startup, Scaling, Established)? 0-10 pts
   - Budget similar (Bootstrap, Funded, Enterprise)? 0-15 pts

B. PROBLEM OVERLAP (0-40 pontos)
   - Menciona dificuldade de conseguir clientes/leads? 0-20 pts
   - Discute canais de acquisition ou marketing? 0-10 pts
   - Frustra com CAC alto ou dependência de paid ads? 0-10 pts

C. NATURAL FIT (0-20 pontos)
   - Recomendar produto seria útil (não spam)? 0-15 pts
   - Viewer conhece conceito de organic discovery? 0-5 pts

PONTUAÇÃO TOTAL: A + B + C (0-100)

CONVERSÃO DE SCORE:
- 70-100 pontos: ✅ APPROVED (score 0.80-1.0, strong fit)
- 50-69 pontos:  ✅ APPROVED (score 0.60-0.79, moderate fit)
- 30-49 pontos:  ❌ REJECTED (score 0.35-0.59, weak fit)
- 0-29 pontos:   ❌ REJECTED (score 0.0-0.34, no fit)

═══════════════════════════════════════════════════════════
FORMATO DE RESPOSTA JSON:
═══════════════════════════════════════════════════════════

Para cada vídeo, retorne justificativa formatada:

{
  "video_id": "✅ APPROVED: [motivo PT-BR, max 120 chars]"
}

 OU

{
  "video_id": "❌ REJECTED: [motivo PT-BR, max 120 chars]"
}

EXEMPLOS:

✅ APPROVED (Camada 2 passou):
"✅ APPROVED: E-commerce owner buscando clientes; Liftlio oferece discovery orgânico; fit natural; score 78"

❌ REJECTED (Camada 1 falhou):
"❌ REJECTED: Viewer é content creator; não vende produto; não precisa customer acquisition"

❌ REJECTED (Camada 2 - score baixo):
"❌ REJECTED: Viewer vende mas foco em sales tactics (não acquisition); score 35; fit insuficiente"

═══════════════════════════════════════════════════════════

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}

IMPORTANTE:
- Se NENHUM vídeo qualificado: retorne {{"result": "NOT"}}
- Justificativas em PT-BR, objetivas, claras
- Use ponto-e-vírgula (;) ao invés de vírgulas
- Máximo 120 caracteres por justificativa
- Retorne APENAS o JSON, sem markdown
- Use EXATAMENTE os prefixos: ✅ APPROVED, ❌ REJECTED, ⚠️ SKIPPED`;

// ============================================
// Helper Functions
// ============================================
function formatVideoLight(video) {
  const truncDesc = video.description.substring(0, 500);
  const tagsStr = video.tags.slice(0, 10).join(', ') || 'N/A';
  return `ID: ${video.id}\nTítulo: ${video.title}\nDescrição: ${truncDesc}...\nCanal: ${video.channel_title || 'N/A'}\nPublicado: ${video.published_at}\nDuração: ${video.duration}\nViews: ${video.view_count.toLocaleString()} | Likes: ${video.like_count.toLocaleString()} | Comments: ${video.comment_count.toLocaleString()}\nTags: ${tagsStr}`;
}

function formatVideoFull(video) {
  const transcript = video.transcript?.substring(0, 2000) || 'N/A';
  const baseInfo = formatVideoLight(video);
  return `${baseInfo}\nTranscrição: ${transcript}...`;
}

function parseDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

function filterByDuration(videos) {
  return videos.filter((video)=>{
    const durationSeconds = parseDuration(video.duration);
    return durationSeconds >= 60 && durationSeconds <= 1800; // 1min - 30min
  });
}

function extractScore(reasoning) {
  const match = reasoning.match(/score[:\s]+(\d+\.?\d*)/i);
  if (match) {
    const score = parseFloat(match[1]);
    return score > 1 ? score / 100 : score;
  }
  if (reasoning.includes('✅ APPROVED')) return 0.75;
  if (reasoning.includes('❌ REJECTED')) return 0.2;
  return 0.5;
}

function extractTags(reasoning) {
  const tags = [];
  const lowerReasoning = reasoning.toLowerCase();
  if (lowerReasoning.includes('b2b')) tags.push('b2b');
  if (lowerReasoning.includes('b2c')) tags.push('b2c');
  if (lowerReasoning.includes('ecommerce') || lowerReasoning.includes('e-commerce')) tags.push('ecommerce');
  if (lowerReasoning.includes('saas')) tags.push('saas');
  if (lowerReasoning.includes('marketing')) tags.push('marketing');
  if (lowerReasoning.includes('startup')) tags.push('startup');
  return tags;
}

function translateToEnglish(textPT) {
  const translations = {
    'E-commerce owner buscando clientes': 'E-commerce owner seeking customers',
    'Liftlio oferece discovery': 'Liftlio offers discovery',
    'fit natural': 'natural fit',
    'Viewer é content creator': 'Viewer is content creator',
    'não vende produto': 'does not sell product',
    'não precisa customer acquisition': 'does not need customer acquisition',
    'Vídeo muito curto': 'Video too short',
    'Vídeo muito longo': 'Video too long',
    'Vídeo para content creators': 'Video for content creators',
    'não vendem produtos': 'do not sell products'
  };
  let translated = textPT;
  for (const [pt, en] of Object.entries(translations)){
    translated = translated.replace(pt, en);
  }
  return translated;
}

// ============================================
// Main Handler
// ============================================
serve(async (req)=>{
  const startTime = Date.now();
  try {
    const { scanner_id } = await req.json();
    if (!scanner_id) {
      return new Response(JSON.stringify({
        error: 'scanner_id is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log(`🎯 Processing scanner ${scanner_id}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: scannerData, error: scannerError } = await supabase.from('Canais do youtube').select(`
        id,
        channel_id,
        videos_para_scann,
        Projeto (
          id,
          "Project name",
          "description service"
        )
      `).eq('id', scanner_id).single();

    if (scannerError || !scannerData) {
      console.error('❌ Scanner not found:', scannerError);
      return new Response(JSON.stringify({
        error: 'Scanner not found',
        details: scannerError
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let videoIds = [];
    if (scannerData.videos_para_scann) {
      try {
        videoIds = JSON.parse(scannerData.videos_para_scann);
        console.log(`✅ Parsed ${videoIds.length} video IDs from JSON array`);
      } catch (e) {
        videoIds = scannerData.videos_para_scann.split(',').map((id)=>id.trim());
        console.log(`✅ Parsed ${videoIds.length} video IDs from CSV (legacy)`);
      }
    }

    if (videoIds.length === 0) {
      console.log('⚠️ No videos to process');
      return new Response(JSON.stringify({
        text: [],
        metadata: {
          total_analyzed: 0,
          execution_time: 0,
          success: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    videoIds = videoIds.slice(0, 20);

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet,contentDetails,statistics&key=${youtubeApiKey}`;

    console.log(`🔍 Fetching ${videoIds.length} videos from YouTube API...`);

    const youtubeResponse = await fetch(youtubeUrl);
    const youtubeData = await youtubeResponse.json();

    if (!youtubeData.items || youtubeData.items.length === 0) {
      console.log('⚠️ YouTube API returned 0 videos');
      return new Response(JSON.stringify({
        text: [],
        metadata: {
          total_analyzed: 0,
          execution_time: 0,
          success: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const videos = youtubeData.items.map((item)=>({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channel_title: item.snippet.channelTitle,
        published_at: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        view_count: parseInt(item.statistics.viewCount || '0'),
        like_count: parseInt(item.statistics.likeCount || '0'),
        comment_count: parseInt(item.statistics.commentCount || '0'),
        tags: item.snippet.tags || []
      }));

    console.log(`✅ Fetched ${videos.length} videos from YouTube`);

    const filteredVideos = filterByDuration(videos);
    console.log(`✅ ${filteredVideos.length} videos passed duration filter`);

    if (filteredVideos.length === 0) {
      return new Response(JSON.stringify({
        text: [],
        metadata: {
          total_analyzed: 0,
          execution_time: 0,
          success: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const project = {
      nome_produto: scannerData.Projeto['Project name'] || 'Liftlio',
      descricao_servico: scannerData.Projeto['description service'] || 'Plataforma de discovery orgânico'
    };

    // STAGE 1: Pre-filter
    console.log('🔍 [STAGE 1] Pre-filtering videos (metadata only)...');

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    const stage1SystemPrompt = STAGE1_PROMPT_TEMPLATE.replace('{nome_produto}', project.nome_produto).replace('{descricao_servico}', project.descricao_servico);
    const stage1VideosText = filteredVideos.map(formatVideoLight).join('\n---\n');
    const stage1UserPrompt = `VÍDEOS PARA PRÉ-FILTRO:\n\n${stage1VideosText}\n\nLembre-se: responda APENAS com o JSON no formato especificado.\nPara cada vídeo, retorne "PASS" ou "PRE_FILTER_REJECT: motivo breve".`;

    const stage1Response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: stage1SystemPrompt,
        messages: [{ role: 'user', content: stage1UserPrompt }]
      })
    });

    const stage1Data = await stage1Response.json();
    let stage1ResultText = stage1Data.content[0].text.trim();

    if (stage1ResultText.startsWith('```')) {
      stage1ResultText = stage1ResultText.split('```')[1];
      if (stage1ResultText.startsWith('json')) {
        stage1ResultText = stage1ResultText.substring(4);
      }
      stage1ResultText = stage1ResultText.trim();
    }

    const stage1Results = JSON.parse(stage1ResultText);

    const approvedVideos = [];
    const finalResults = [];

    for (const video of filteredVideos){
      const decision = stage1Results[video.id] || 'PASS';
      if (decision === 'PASS') {
        approvedVideos.push(video);
      } else {
        const rejectReason = decision.replace('PRE_FILTER_REJECT: ', '');
        finalResults.push({
          id: video.id,
          status: 'REJECTED',
          motivo: `PRE_FILTER_REJECT: ${rejectReason}`,
          reason: `PRE_FILTER_REJECT: ${translateToEnglish(rejectReason)}`,
          score: 0.0,
          tags: [],
          analyzed_at: new Date().toISOString()
        });
      }
    }

    console.log(`✅ [STAGE 1] ${approvedVideos.length} passed, ${finalResults.length} rejected`);
    console.log(`[STAGE 1] Tokens: ${stage1Data.usage.input_tokens} input + ${stage1Data.usage.output_tokens} output`);

    if (approvedVideos.length === 0) {
      const executionTime = (Date.now() - startTime) / 1000;
      return new Response(JSON.stringify({
        text: finalResults,
        metadata: {
          total_analyzed: filteredVideos.length,
          execution_time: executionTime,
          success: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch transcripts
    console.log(`🔍 Fetching transcripts for ${approvedVideos.length} approved videos...`);

    for (const video of approvedVideos){
      const { data: cachedTranscript } = await supabase.from('Videos_trancricao').select('trancription').eq('video_id', video.id).single();
      if (cachedTranscript?.trancription) {
        video.transcript = cachedTranscript.trancription;
        console.log(`✅ Transcript for ${video.id} from cache`);
      } else {
        try {
          const transcriptUrl = `https://transcricao.liftlio.com/transcribe?video_id=${video.id}`;
          const transcriptResponse = await fetch(transcriptUrl);
          const transcriptData = await transcriptResponse.json();
          video.transcript = transcriptData.transcript || '';
          console.log(`✅ Transcript for ${video.id} from API`);
        } catch (e) {
          console.warn(`⚠️ Failed to fetch transcript for ${video.id}:`, e);
          video.transcript = '';
        }
      }
    }

    // STAGE 2: Full analysis
    console.log('🔍 [STAGE 2] Analyzing videos with full context...');

    const stage2SystemPrompt = STAGE2_PROMPT_TEMPLATE.replace('{nome_produto}', project.nome_produto).replace('{descricao_servico}', project.descricao_servico);
    const stage2VideosText = approvedVideos.map(formatVideoFull).join('\n---\n');
    const stage2UserPrompt = `VÍDEOS PARA ANÁLISE:\n\n${stage2VideosText}\n\nLembre-se: responda APENAS com o JSON no formato especificado.\nPara cada vídeo, forneça uma justificativa clara em PT-BR usando os prefixos ✅ APPROVED, ❌ REJECTED ou ⚠️ SKIPPED.`;

    const stage2Response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: stage2SystemPrompt,
        messages: [{ role: 'user', content: stage2UserPrompt }]
      })
    });

    const stage2Data = await stage2Response.json();
    let stage2ResultText = stage2Data.content[0].text.trim();

    if (stage2ResultText.startsWith('```')) {
      stage2ResultText = stage2ResultText.split('```')[1];
      if (stage2ResultText.startsWith('json')) {
        stage2ResultText = stage2ResultText.substring(4);
      }
      stage2ResultText = stage2ResultText.trim();
    }

    const stage2Results = JSON.parse(stage2ResultText);

    for (const video of approvedVideos){
      const reasoning = stage2Results[video.id];
      if (!reasoning) continue;
      const status = reasoning.includes('✅ APPROVED') ? 'APPROVED' : 'REJECTED';
      const score = extractScore(reasoning);
      const tags = extractTags(reasoning);
      const cleanReasoning = reasoning.replace(/[✅❌⚠️]/g, '').replace(/,/g, ';').substring(0, 120);
      finalResults.push({
        id: video.id,
        status,
        motivo: cleanReasoning,
        reason: translateToEnglish(cleanReasoning),
        score,
        tags,
        analyzed_at: new Date().toISOString()
      });
    }

    console.log(`✅ [STAGE 2] Analysis complete`);
    console.log(`[STAGE 2] Tokens: ${stage2Data.usage.input_tokens} input + ${stage2Data.usage.output_tokens} output`);

    const executionTime = (Date.now() - startTime) / 1000;
    const approvedCount = finalResults.filter((r)=>r.status === 'APPROVED').length;
    const rejectedCount = finalResults.filter((r)=>r.status === 'REJECTED').length;

    console.log(`🎯 2-STAGE ANALYSIS COMPLETE: ${approvedCount} approved | ${rejectedCount} rejected`);

    return new Response(JSON.stringify({
      text: finalResults,
      metadata: {
        total_analyzed: filteredVideos.length,
        execution_time: executionTime,
        success: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error processing request:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
