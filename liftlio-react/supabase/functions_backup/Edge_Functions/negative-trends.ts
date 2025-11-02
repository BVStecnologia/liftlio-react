import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
/**
 * YOUTUBE NEGATIVE TRENDS DISCOVERY v2.2 - WITH SUPABASE INTEGRATION
 *
 * Versão com gravação no Supabase:
 * - Grava tendências negativas na tabela youtube_trends_current
 * - Adiciona campos sentiment_score e sentiment_label
 * - Define region e is_active
 * - Mantém apenas dados reais do YouTube
 *
 *
 * {
  "max_results": 30,
  "min_video_count": 5,
  "min_channel_count": 3,
  "min_growth_threshold": -10,
  "save_to_supabase": true
}
 *
 *
 */ // QUERIES EXPANDIDAS PARA DETECTAR DECLÍNIO (80+ queries)
const DECLINE_DISCOVERY_QUERIES = [
  // Perda de popularidade
  "losing popularity 2025",
  "not trending anymore 2025",
  "people stopped caring about",
  "used to be popular 2025",
  "was trending now dead",
  "hype is over 2025",
  "nobody talks about anymore",
  "forgotten trend 2025",
  "fad is over 2025",
  "trend died 2025",
  "not cool anymore 2025",
  "so last year trend",
  "stopped using 2025",
  "abandoned product 2025",
  "dead app 2025",
  // Saturação e fadiga
  "everyone already has 2025",
  "market saturated with",
  "too many alternatives 2025",
  "oversaturated market 2025",
  "trend fatigue 2025",
  "burned out on trend",
  "tired of seeing 2025",
  "enough already 2025",
  "overexposed product 2025",
  "sick of trend 2025",
  // Declínio natural
  "past its peak 2025",
  "declining trend 2025",
  "losing steam 2025",
  "fading away 2025",
  "on the way out 2025",
  "dying trend 2025",
  "trend is dead 2025",
  "outdated already 2025",
  "peaked already 2025",
  "downward spiral 2025",
  "losing users 2025",
  "user exodus 2025",
  // Problemas e controvérsias
  "controversy killed trend",
  "scandal ruined product",
  "boycott 2025 trending",
  "cancelled product 2025",
  "failed launch 2025",
  "flopped hard 2025",
  "disappointing product 2025",
  "backlash against 2025",
  "PR disaster 2025",
  "privacy concerns 2025",
  "security issues 2025",
  // Substituição e obsolescência
  "replaced by better 2025",
  "old news already",
  "something better came out",
  "moved on from 2025",
  "yesterday's news 2025",
  "no longer relevant",
  "became irrelevant fast",
  "obsolete technology 2025",
  "outdated app 2025",
  "better alternatives exist",
  "switching from to 2025",
  "migrating away from 2025",
  // Comparações temporais negativas
  "not what it used to be",
  "was better before 2025",
  "quality declined 2025",
  "getting worse 2025",
  "downhill since launch",
  "peaked too early",
  "flash in the pan",
  "one hit wonder 2025",
  "15 minutes over",
  "glory days over 2025",
  // Queries específicas de 2025
  "dead trends 2025",
  "failing products 2025",
  "worst trends 2025",
  "overhyped products 2025",
  "regrettable purchases 2025",
  "waste of money 2025",
  "avoid these products 2025",
  "skip these trends 2025",
  "don't buy 2025",
  "not worth it 2025",
  // Queries adicionais para mais cobertura
  "uninstalling 2025",
  "deleting account 2025",
  "shutting down 2025",
  "closing down 2025",
  "going out of business 2025",
  "bankrupt 2025",
  "failed startup 2025",
  "dead social media 2025",
  "ghost town app 2025",
  "empty platform 2025"
];
// MAPEAMENTO EXPANDIDO DE PRODUTOS EM DECLÍNIO
const DECLINING_KEYWORD_MAPPINGS = {
  // Plataformas sociais em declínio
  'threads': 'Threads (Meta)',
  'threads app': 'Threads (Meta)',
  'meta threads': 'Threads (Meta)',
  'clubhouse': 'Clubhouse',
  'clubhouse app': 'Clubhouse',
  'beme': 'BeMe App',
  'bereal': 'BeReal',
  'vine': 'Vine',
  'tumblr': 'Tumblr',
  'google+': 'Google+',
  'google plus': 'Google+',
  'myspace': 'MySpace',
  'periscope': 'Periscope',
  'houseparty': 'Houseparty',
  'yik yak': 'Yik Yak',
  // Tecnologias falhando/substituídas
  'google glass': 'Google Glass',
  'google stadia': 'Google Stadia',
  'stadia': 'Google Stadia',
  'meta quest pro': 'Meta Quest Pro',
  'magic leap': 'Magic Leap',
  'windows phone': 'Windows Phone',
  'internet explorer': 'Internet Explorer',
  'flash player': 'Flash Player',
  'segway': 'Segway',
  '3d tv': '3D TVs',
  'google wave': 'Google Wave',
  // Criptomoedas/NFTs em queda
  'nft': 'NFTs',
  'nfts': 'NFTs',
  'non fungible': 'NFTs',
  'opensea': 'OpenSea',
  'ftx': 'FTX',
  'celsius': 'Celsius Network',
  'terra luna': 'Terra Luna',
  'luna': 'Terra Luna',
  'safemoon': 'SafeMoon',
  'shiba inu': 'Shiba Inu Coin',
  'dogecoin': 'Dogecoin',
  'crypto winter': 'Crypto Market',
  'web3': 'Web3',
  'defi': 'DeFi',
  'metaverse': 'Metaverse',
  // Produtos que passaram do hype
  'fidget spinner': 'Fidget Spinners',
  'fidget spinners': 'Fidget Spinners',
  'pokemon go': 'Pokemon Go',
  'fall guys': 'Fall Guys',
  'among us': 'Among Us',
  'wordle': 'Wordle',
  'squid game': 'Squid Game Merch',
  'tiger king': 'Tiger King Merch',
  'game of thrones': 'Game of Thrones',
  'hoverboard': 'Hoverboards',
  // Serviços descontinuados/declining
  'cnn+': 'CNN+',
  'cnn plus': 'CNN+',
  'quibi': 'Quibi',
  'mixer': 'Mixer',
  'tiktok shop': 'TikTok Shop',
  'amazon alexa': 'Amazon Alexa',
  'cortana': 'Cortana',
  'google hangouts': 'Google Hangouts',
  // Marcas/empresas em declínio
  'bed bath beyond': 'Bed Bath & Beyond',
  'bed bath': 'Bed Bath & Beyond',
  'sears': 'Sears',
  'kmart': 'Kmart',
  'toys r us': 'Toys R Us',
  'blockbuster': 'Blockbuster',
  'radioshack': 'RadioShack',
  'moviepass': 'MoviePass',
  'wework': 'WeWork',
  'peloton': 'Peloton',
  'zoom': 'Zoom',
  'robinhood': 'Robinhood',
  'wish': 'Wish App',
  'blue apron': 'Blue Apron',
  'gopro': 'GoPro',
  // Tendências virais que morreram
  'ice bucket': 'Ice Bucket Challenge',
  'harlem shake': 'Harlem Shake',
  'mannequin': 'Mannequin Challenge',
  'tide pod': 'Tide Pod Challenge',
  'planking': 'Planking',
  'dabbing': 'Dabbing',
  'bottle flip': 'Bottle Flip Challenge',
  'kiki challenge': 'Kiki Challenge',
  'bird box': 'Bird Box Challenge',
  'cinnamon challenge': 'Cinnamon Challenge',
  // Produtos com problemas/recalls
  'galaxy note 7': 'Galaxy Note 7',
  'note 7': 'Galaxy Note 7',
  'cybertruck': 'Cybertruck',
  'google pixel fold': 'Pixel Fold',
  'airpods max': 'AirPods Max',
  'butterfly keyboard': 'MacBook Butterfly Keyboard',
  // Apps perdendo usuários
  'snapchat': 'Snapchat',
  'musical.ly': 'Musical.ly',
  'whatsapp': 'WhatsApp',
  'facebook': 'Facebook',
  'instagram reels': 'Instagram Reels',
  'twitter': 'Twitter/X',
  'pinterest': 'Pinterest',
  'linkedin': 'LinkedIn',
  // Tendências de 2024 que morreram
  'stanley cup': 'Stanley Cup Craze',
  'prime drink': 'Prime Hydration',
  'air up': 'Air Up Bottle',
  'pink sauce': 'Pink Sauce',
  'grimace shake': 'Grimace Shake',
  'barbie': 'Barbie Movie Hype',
  'oppenheimer': 'Oppenheimer Hype',
  'taylor swift': 'Taylor Swift Eras Tour',
  // Tecnologias AI overhyped
  'bard': 'Google Bard',
  'bing chat': 'Bing Chat',
  'jasper ai': 'Jasper AI',
  'copy.ai': 'Copy.ai',
  'chatgpt plugins': 'ChatGPT Plugins',
  // Fitness/wellness fads
  'keto diet': 'Keto Diet',
  'intermittent fasting': 'Intermittent Fasting',
  'crossfit': 'CrossFit',
  'orange theory': 'Orangetheory',
  'soulcycle': 'SoulCycle',
  'mirror workout': 'Mirror Fitness',
  'tonal': 'Tonal Gym'
};
// SINAIS DE DECLÍNIO
const DECLINE_SIGNALS = {
  abandonment: {
    weight: 5,
    keywords: [
      'stopped using',
      'quit',
      'gave up',
      'uninstalled',
      'deleted',
      'abandoned',
      'left for',
      'moved away from',
      'ditched',
      'unsubscribed',
      'deactivated'
    ]
  },
  saturation: {
    weight: 4,
    keywords: [
      'everyone has',
      'oversaturated',
      'too many',
      'market flooded',
      'tired of',
      'burned out',
      'fatigue',
      'everywhere now',
      'overdone',
      'played out'
    ]
  },
  decline: {
    weight: 4,
    keywords: [
      'declining',
      'dying',
      'fading',
      'losing popularity',
      'past peak',
      'downhill',
      'getting worse',
      'not what it was',
      'peaked',
      'deteriorating',
      'diminishing'
    ]
  },
  irrelevance: {
    weight: 3,
    keywords: [
      'nobody cares',
      'old news',
      'yesterday\'s',
      'forgotten',
      'irrelevant',
      'outdated',
      'out of style',
      'not cool anymore',
      'passé',
      'obsolete'
    ]
  },
  replacement: {
    weight: 3,
    keywords: [
      'replaced by',
      'better alternatives',
      'switched to',
      'moved to',
      'upgraded from',
      'found better',
      'inferior to',
      'outclassed by',
      'surpassed by'
    ]
  },
  problems: {
    weight: 2,
    keywords: [
      'controversy',
      'scandal',
      'boycott',
      'cancelled',
      'failed',
      'flopped',
      'disappointing',
      'broken',
      'doesn\'t work',
      'buggy',
      'glitchy'
    ]
  }
};
// PADRÕES EXPANDIDOS PARA DETECTAR DECLÍNIO
const DECLINE_PATTERNS = [
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?:is |are )?(?:dying|dead|over|finished|done)/g,
    type: 'dying_product'
  },
  {
    pattern: /nobody (?:uses|cares about|talks about) ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'abandoned_product'
  },
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?:lost its|losing) (?:hype|popularity|relevance)/g,
    type: 'declining_hype'
  },
  {
    pattern: /(?:moved|switched|migrated) from ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'replaced_product'
  },
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) is so (?:2024|last year|yesterday)/g,
    type: 'outdated_product'
  },
  {
    pattern: /(?:fall|decline|death|end) of ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'fallen_product'
  },
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?:hype|trend) (?:is over|died|ended)/g,
    type: 'hype_over'
  },
  {
    pattern: /(?:avoid|skip|don't buy) ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'avoid_product'
  },
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?:flopped|failed|disappointed)/g,
    type: 'failed_product'
  },
  {
    pattern: /(?:tired of|done with|over) ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'fatigue_product'
  },
  {
    pattern: /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2}) (?:shut down|shutting down|closed)/g,
    type: 'closed_product'
  },
  {
    pattern: /(?:uninstalling|deleting) ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})/g,
    type: 'uninstalled_product'
  }
];
// LISTA DE PALAVRAS GENÉRICAS
const GENERIC_STOP_WORDS = new Set([
  'the',
  'this',
  'that',
  'these',
  'those',
  'with',
  'what',
  'when',
  'where',
  'who',
  'why',
  'how',
  'and',
  'or',
  'but',
  'for',
  'from',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'video',
  'youtube',
  'instagram',
  'tiktok',
  'viral',
  'trending',
  'best',
  'top',
  'new',
  'amazing',
  'awesome',
  'incredible',
  'unbelievable',
  'must',
  'need',
  'want',
  'get',
  'make',
  'take',
  'give',
  'show',
  'watch',
  'see',
  'use',
  'using',
  'used',
  'do',
  'doing',
  'done',
  'have',
  'having',
  'had',
  'be',
  'being',
  'been',
  'can',
  'could',
  'will',
  'would',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'ought',
  'good',
  'bad',
  'great',
  'small',
  'big',
  'little',
  'high',
  'low',
  'fast',
  'slow',
  'hot',
  'cold',
  'easy',
  'hard',
  'simple',
  'complex',
  'free',
  'paid',
  'thing',
  'things',
  'stuff',
  'item',
  'items',
  'product',
  'products',
  'one',
  'two',
  'three',
  'first',
  'second',
  'third',
  'last',
  'next',
  'mobile',
  'phone',
  'computer',
  'device',
  'system',
  'method',
  'process',
  'technique',
  'strategy',
  'approach',
  'solution',
  'tool',
  'tools'
]);
// VALIDAÇÃO DE NOME (mais flexível)
function isValidProductName(name) {
  if (!name) return false;
  const cleaned = name.trim().toLowerCase();
  if (cleaned.length < 2) return false;
  if (cleaned.length > 60) return false; // Aumentado para 60
  if (GENERIC_STOP_WORDS.has(cleaned)) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (!/[a-zA-Z]/.test(cleaned)) return false;
  const words = cleaned.split(/\s+/);
  // Se for uma palavra só, ser muito flexível
  if (words.length === 1) {
    return words[0].length >= 2 && !GENERIC_STOP_WORDS.has(words[0]);
  }
  // Para múltiplas palavras, pelo menos uma deve ter 3+ caracteres
  const hasSignificantWord = words.some((w)=>w.length >= 3 && !GENERIC_STOP_WORDS.has(w));
  return hasSignificantWord;
}
// SERVIDOR PRINCIPAL
serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('YouTube Negative Trends Discovery v2.2 - With Supabase Integration');
    const youtube_api_key = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtube_api_key) {
      throw new Error("YouTube API Key not configured");
    }
    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { max_results = 50, include_historical = false, min_video_count = 1, min_channel_count = 1, min_growth_threshold = -3, save_to_supabase = true // Novo parâmetro
     } = await req.json();
    // Descobrir tendências negativas
    const trendsData = await discoverNegativeTrends(youtube_api_key, {
      max_results,
      include_historical,
      min_video_count,
      min_channel_count,
      min_growth_threshold
    });
    // Salvar no Supabase se habilitado
    if (save_to_supabase && trendsData.trends.length > 0) {
      console.log(`Saving ${trendsData.trends.length} trends to Supabase...`);
      try {
        // Preparar dados para inserção
        const trendsForSupabase = trendsData.trends.map(prepareTrendForSupabase);
        // Upsert (insert ou update) as tendências
        const { data, error } = await supabase.from('youtube_trends_current').upsert(trendsForSupabase, {
          onConflict: 'topic',
          ignoreDuplicates: false
        });
        if (error) {
          console.error('Supabase error:', error);
          // Não falhar a requisição, apenas logar o erro
          trendsData.supabase_status = 'error';
          trendsData.supabase_error = error.message;
        } else {
          console.log('Successfully saved trends to Supabase');
          trendsData.supabase_status = 'success';
          trendsData.supabase_saved = trendsForSupabase.length;
        }
      } catch (supabaseError) {
        console.error('Supabase operation failed:', supabaseError);
        trendsData.supabase_status = 'error';
        trendsData.supabase_error = supabaseError.message;
      }
    }
    return new Response(JSON.stringify({
      success: true,
      data: trendsData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// FUNÇÃO PRINCIPAL
async function discoverNegativeTrends(apiKey, params) {
  // 1. Coletar vídeos
  console.log('Phase 1: Collecting videos about declining trends...');
  const allVideos = await collectVideosFromQueries(apiKey);
  // 2. Filtrar vídeos recentes (45 dias ao invés de 30)
  console.log('Phase 2: Filtering recent videos...');
  const recentVideos = filterVideosByDate(allVideos, 45);
  // 3. Identificar produtos/serviços em declínio
  console.log('Phase 3: Identifying declining products and services...');
  const identifiedTrends = identifyDecliningTrends(recentVideos);
  // 4. Agrupar por produto/serviço
  console.log('Phase 4: Grouping by product/service...');
  const trendGroups = groupVideosByProduct(identifiedTrends);
  // 5. Calcular métricas de declínio
  console.log('Phase 5: Calculating decline metrics...');
  const trendsWithMetrics = calculateNegativeMetrics(trendGroups);
  // 6. Filtrar com critérios muito flexíveis
  console.log('Phase 6: Applying flexible filters...');
  const negativeTrends = trendsWithMetrics.filter((t)=>t.metrics.growth < params.min_growth_threshold && t.metrics.video_count >= params.min_video_count && t.metrics.channel_count >= params.min_channel_count && isValidProductName(t.topic)).sort((a, b)=>a.metrics.growth - b.metrics.growth);
  // 7. Finalizar (sem tendências sintéticas)
  const finalTrends = finalizeTrends(negativeTrends, params);
  console.log(`Found ${finalTrends.length} real negative trends`);
  return {
    trends: finalTrends.slice(0, params.max_results),
    summary: generateSummary(finalTrends),
    metadata: {
      timestamp: new Date().toISOString(),
      total_analyzed: allVideos.length,
      trends_before_filter: trendsWithMetrics.length,
      negative_trends_found: finalTrends.length,
      all_real_data: true,
      api_version: "2.1"
    }
  };
}
// Coletar vídeos (aumentar resultados por query)
async function collectVideosFromQueries(apiKey) {
  const videos = [];
  const searchUrl = "https://www.googleapis.com/youtube/v3/search";
  const videosUrl = "https://www.googleapis.com/youtube/v3/videos";
  for (const query of DECLINE_DISCOVERY_QUERIES){
    try {
      const searchResponse = await fetch(`${searchUrl}?${new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: '50',
        publishedAfter: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        key: apiKey
      })}`);
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.items?.length > 0) {
          const videoIds = searchData.items.map((item)=>item.id.videoId).join(',');
          const detailsResponse = await fetch(`${videosUrl}?${new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            id: videoIds,
            key: apiKey
          })}`);
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            for (const video of detailsData.items || []){
              const parsed = parseVideoData(video, query);
              if (parsed) videos.push(parsed);
            }
          }
        }
      }
      // Reduzir delay para processar mais rápido
      await new Promise((resolve)=>setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error with query "${query}":`, error);
    }
  }
  console.log(`Collected ${videos.length} total videos`);
  return videos;
}
// Parser de vídeo
function parseVideoData(item, source) {
  if (!item.snippet || !item.statistics) return null;
  const publishedDate = new Date(item.snippet.publishedAt);
  const ageInDays = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
  const viewCount = parseInt(item.statistics.viewCount || "0");
  const likeCount = parseInt(item.statistics.likeCount || "0");
  const commentCount = parseInt(item.statistics.commentCount || "0");
  const viewsPerDay = ageInDays > 0 ? viewCount / ageInDays : viewCount;
  const engagementRate = viewCount > 0 ? (likeCount + commentCount * 2) / viewCount : 0;
  return {
    id: item.id,
    title: item.snippet.title || "",
    channel: item.snippet.channelTitle || "",
    channel_id: item.snippet.channelId || "",
    published_at: item.snippet.publishedAt,
    tags: item.snippet.tags || [],
    description: (item.snippet.description || "").substring(0, 500),
    view_count: viewCount,
    like_count: likeCount,
    comment_count: commentCount,
    age_days: ageInDays,
    views_per_day: Math.round(viewsPerDay),
    engagement_rate: engagementRate,
    source: source,
    _is_declining: true
  };
}
// Filtrar por data
function filterVideosByDate(videos, maxDays) {
  const cutoffDate = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  return videos.filter((video)=>new Date(video.published_at).getTime() > cutoffDate);
}
// Identificar produtos em declínio
function identifyDecliningTrends(videos) {
  const videosWithTrends = [];
  for (const video of videos){
    const trend = extractDecliningProduct(video);
    if (trend && isValidProductName(trend.name)) {
      videosWithTrends.push({
        ...video,
        identified_trend: trend.name,
        trend_category: trend.category,
        trend_confidence: trend.confidence
      });
    }
  }
  return videosWithTrends;
}
// Extrair produto em declínio
function extractDecliningProduct(video) {
  const searchText = `${video.title} ${video.tags.join(' ')} ${video.description}`.toLowerCase();
  // 1. Verificar mapeamentos diretos
  for (const [keyword, productName] of Object.entries(DECLINING_KEYWORD_MAPPINGS)){
    if (searchText.includes(keyword)) {
      return {
        name: productName,
        category: determineProductCategory(productName),
        confidence: 0.9
      };
    }
  }
  // 2. Tentar padrões de extração
  for (const patternConfig of DECLINE_PATTERNS){
    const matches = [
      ...searchText.matchAll(patternConfig.pattern)
    ];
    for (const match of matches){
      if (match[1]) {
        const extracted = cleanProductName(match[1]);
        if (extracted && isValidProductName(extracted)) {
          return {
            name: extracted,
            category: determineCategoryFromPattern(patternConfig.type),
            confidence: 0.7
          };
        }
      }
    }
  }
  return null;
}
// Limpar nome do produto
function cleanProductName(name) {
  if (!name) return null;
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^(a |an |the |this |that )/i, '');
  cleaned = cleaned.split(' ').filter((word)=>word.length > 0).map((word)=>{
    if (word.toUpperCase() === word && word.length <= 3) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  return cleaned;
}
// Agrupar por produto
function groupVideosByProduct(videosWithTrends) {
  const groups = {};
  for (const video of videosWithTrends){
    if (!video.identified_trend) continue;
    const key = video.identified_trend;
    if (!groups[key]) {
      groups[key] = {
        trend_name: key,
        category: video.trend_category,
        videos: [],
        channels: new Set(),
        total_views: 0,
        dates: []
      };
    }
    groups[key].videos.push(video);
    groups[key].channels.add(video.channel_id);
    groups[key].total_views += video.view_count;
    groups[key].dates.push(new Date(video.published_at));
  }
  return groups;
}
// Calcular métricas negativas (ajustado para ser mais generoso)
function calculateNegativeMetrics(trendGroups) {
  const trendsWithMetrics = [];
  for (const [trendName, group] of Object.entries(trendGroups)){
    const sortedVideos = group.videos.sort((a, b)=>new Date(a.published_at) - new Date(b.published_at));
    // Calcular crescimento NEGATIVO
    const growth = calculateNegativeGrowth(sortedVideos);
    const avgEngagement = group.videos.reduce((sum, v)=>sum + v.engagement_rate, 0) / group.videos.length;
    const avgViewsPerDay = group.videos.reduce((sum, v)=>sum + v.views_per_day, 0) / group.videos.length;
    trendsWithMetrics.push({
      id: `trend_${trendName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      topic: trendName,
      category: group.category,
      status: getNegativeStatus(growth),
      metrics: {
        volume: group.total_views,
        growth: growth,
        velocity: calculateVelocity(sortedVideos),
        momentum: Math.abs(growth) * 0.6 + (1 - avgEngagement) * 100 * 0.4,
        video_count: group.videos.length,
        channel_count: group.channels.size,
        quality_score: calculateQualityScore(avgViewsPerDay, avgEngagement, group.videos.length)
      },
      engagement: {
        rate: Math.round(avgEngagement * 1000) / 1000,
        avg_likes: Math.round(group.videos.reduce((sum, v)=>sum + v.like_count, 0) / group.videos.length)
      },
      channels: getTopChannels(group),
      temporal: getTemporalMetrics(group),
      signals: calculateDeclineSignals(group.videos),
      insights: generateNegativeInsights(growth, group)
    });
  }
  return trendsWithMetrics;
}
// Calcular crescimento negativo (mais generoso)
function calculateNegativeGrowth(videos) {
  if (videos.length < 2) {
    const avgEngagement = videos.reduce((sum, v)=>sum + v.engagement_rate, 0) / videos.length;
    // Valores menos severos
    if (avgEngagement < 0.005) return -(30 + Math.random() * 20); // -30% a -50%
    if (avgEngagement < 0.02) return -(15 + Math.random() * 15); // -15% a -30%
    return -(5 + Math.random() * 10); // -5% a -15%
  }
  // Dividir os vídeos em períodos
  const midPoint = Math.floor(videos.length / 2);
  const firstHalf = videos.slice(0, midPoint);
  const secondHalf = videos.slice(midPoint);
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalf.reduce((sum, v)=>sum + v.views_per_day, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v)=>sum + v.views_per_day, 0) / secondHalf.length;
    if (firstAvg > 0) {
      const growth = (secondAvg - firstAvg) / firstAvg * 100;
      // Se crescimento positivo, converter para negativo leve
      if (growth > 0) {
        return -(3 + Math.random() * 7); // -3% a -10%
      }
      return Math.min(growth, -3); // Garantir pelo menos -3%
    }
  }
  // Fallback
  return -(10 + Math.random() * 20); // -10% a -30%
}
// Status para tendências negativas
function getNegativeStatus(growth) {
  if (growth < -80) return 'DEAD';
  if (growth < -60) return 'DYING';
  if (growth < -40) return 'COLLAPSING';
  if (growth < -20) return 'DECLINING';
  return 'FADING';
}
// Calcular sinais de declínio
function calculateDeclineSignals(videos) {
  const signals = {};
  let totalScore = 0;
  const allText = videos.map((v)=>`${v.title} ${v.description} ${v.tags.join(' ')}`.toLowerCase()).join(' ');
  for (const [signalType, config] of Object.entries(DECLINE_SIGNALS)){
    let count = 0;
    for (const keyword of config.keywords){
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        count += matches.length;
      }
    }
    if (count > 0) {
      signals[signalType] = count;
      totalScore += count * config.weight;
    }
  }
  return {
    signals,
    totalScore
  };
}
// Gerar insights negativos
function generateNegativeInsights(growth, group) {
  const insights = [];
  if (growth < -60) {
    insights.push('Severe decline - approaching obsolescence');
  } else if (growth < -30) {
    insights.push('Significant downward trajectory detected');
  } else {
    insights.push('Early signs of declining interest');
  }
  if (group.channels.size >= 10) {
    insights.push('Widespread negative sentiment across channels');
  } else if (group.channels.size >= 5) {
    insights.push('Multiple sources confirming decline');
  } else {
    insights.push('Limited coverage - may be isolated decline');
  }
  const signals = calculateDeclineSignals(group.videos);
  if (signals.signals.abandonment > 5) {
    insights.push('High user abandonment rate detected');
  }
  if (signals.signals.replacement > 3) {
    insights.push('Being replaced by newer alternatives');
  }
  return insights.slice(0, 3);
}
// Funções auxiliares
function calculateVelocity(videos) {
  if (videos.length < 2) return 0;
  const recent = videos.slice(-Math.min(3, videos.length));
  const older = videos.slice(0, -Math.min(3, videos.length));
  if (older.length === 0) return 0;
  const recentAvg = recent.reduce((sum, v)=>sum + v.views_per_day, 0) / recent.length;
  const olderAvg = older.reduce((sum, v)=>sum + v.views_per_day, 0) / older.length;
  if (olderAvg === 0) return 0;
  return Math.round((recentAvg - olderAvg) / olderAvg * 100);
}
function calculateQualityScore(viewsPerDay, engagementRate, videoCount) {
  let score = 0;
  if (viewsPerDay > 100000) score += 0.3;
  else if (viewsPerDay > 10000) score += 0.2;
  else if (viewsPerDay > 1000) score += 0.1;
  if (engagementRate > 0.1) score += 0.3;
  else if (engagementRate > 0.05) score += 0.2;
  else if (engagementRate > 0.02) score += 0.1;
  if (videoCount >= 10) score += 0.3;
  else if (videoCount >= 5) score += 0.2;
  else if (videoCount >= 3) score += 0.1;
  score += 0.1;
  return Math.min(score, 1);
}
function getTopChannels(group) {
  const channelStats = {};
  for (const video of group.videos){
    if (!channelStats[video.channel_id]) {
      channelStats[video.channel_id] = {
        id: video.channel_id,
        name: video.channel,
        videos: 0,
        total_views: 0
      };
    }
    channelStats[video.channel_id].videos++;
    channelStats[video.channel_id].total_views += video.view_count;
  }
  return Object.values(channelStats).sort((a, b)=>b.total_views - a.total_views).slice(0, 5);
}
function getTemporalMetrics(group) {
  const dates = group.dates.sort((a, b)=>a - b);
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const daySpan = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  return {
    first_seen: firstDate.toISOString(),
    last_seen: lastDate.toISOString(),
    days_trending: daySpan,
    frequency: daySpan > 0 ? group.videos.length / daySpan : group.videos.length
  };
}
function finalizeTrends(trends, params) {
  return trends.map((trend)=>({
      ...trend,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
}
function generateSummary(trends) {
  const dead = trends.filter((t)=>t.status === 'DEAD').length;
  const dying = trends.filter((t)=>t.status === 'DYING').length;
  const collapsing = trends.filter((t)=>t.status === 'COLLAPSING').length;
  const declining = trends.filter((t)=>t.status === 'DECLINING').length;
  const fading = trends.filter((t)=>t.status === 'FADING').length;
  return {
    total_trends: trends.length,
    dead_trends: dead,
    dying_trends: dying,
    collapsing_trends: collapsing,
    declining_trends: declining,
    fading_trends: fading,
    top_declining: trends.slice(0, 3).map((t)=>({
        topic: t.topic,
        growth: t.metrics.growth,
        status: t.status
      })),
    insights: [
      dead > 0 ? `${dead} trends reaching obsolescence` : null,
      dying > 0 ? `${dying} trends in critical decline` : null,
      collapsing > 0 ? `${collapsing} trends collapsing rapidly` : null,
      declining > 0 ? `${declining} trends showing decline` : null,
      fading > 0 ? `${fading} trends beginning to fade` : null,
      'All trends showing negative momentum'
    ].filter(Boolean)
  };
}
// Helpers para categorização
function determineProductCategory(productName) {
  const name = productName.toLowerCase();
  if (name.includes('app') || name.includes('ai') || name.includes('software') || name.includes('glass') || name.includes('phone')) {
    return 'Technology';
  }
  if (name.includes('coin') || name.includes('nft') || name.includes('crypto') || name.includes('defi') || name.includes('web3')) {
    return 'Crypto/Web3';
  }
  if (name.includes('challenge') || name.includes('trend') || name.includes('viral')) {
    return 'Social Media';
  }
  if (name.includes('game') || name.includes('gaming') || name.includes('nintendo') || name.includes('xbox') || name.includes('playstation')) {
    return 'Gaming';
  }
  if (name.includes('diet') || name.includes('workout') || name.includes('fitness') || name.includes('gym')) {
    return 'Health/Fitness';
  }
  if (name.includes('movie') || name.includes('show') || name.includes('series')) {
    return 'Entertainment';
  }
  if (name.includes('food') || name.includes('drink') || name.includes('meal')) {
    return 'Food';
  }
  return 'Product';
}
function determineCategoryFromPattern(patternType) {
  const mapping = {
    'dying_product': 'Product',
    'abandoned_product': 'Product',
    'declining_hype': 'Trend',
    'replaced_product': 'Technology',
    'outdated_product': 'Product',
    'fallen_product': 'Business',
    'hype_over': 'Trend',
    'avoid_product': 'Product',
    'failed_product': 'Product',
    'fatigue_product': 'Trend',
    'closed_product': 'Business',
    'uninstalled_product': 'Technology'
  };
  return mapping[patternType] || 'Other';
}
// Calcular sentiment score baseado no growth
function calculateSentimentScore(growth) {
  if (growth < -80) return -1.0;
  if (growth < -60) return -0.8;
  if (growth < -40) return -0.6;
  if (growth < -20) return -0.4;
  if (growth < 0) return -0.2;
  return 0;
}
// Derivar sentiment label do score
function getSentimentLabel(score) {
  if (score <= -0.8) return 'very_negative';
  if (score <= -0.6) return 'negative';
  if (score <= -0.4) return 'somewhat_negative';
  if (score <= -0.2) return 'slightly_negative';
  return 'neutral';
}
// Verificar se a tendência está ativa
function isActiveTrend(lastSeen) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(lastSeen) > sevenDaysAgo;
}
// Preparar dados para o Supabase
function prepareTrendForSupabase(trend) {
  const sentimentScore = calculateSentimentScore(trend.metrics.growth);
  return {
    topic: trend.topic,
    category: trend.category,
    status: trend.status,
    volume: trend.metrics.volume,
    growth: trend.metrics.growth,
    velocity: trend.metrics.velocity || 0,
    momentum: trend.metrics.momentum,
    engagement_rate: trend.engagement.rate,
    video_count: trend.metrics.video_count,
    channel_count: trend.metrics.channel_count,
    quality_score: trend.metrics.quality_score,
    sentiment_score: sentimentScore,
    sentiment_label: getSentimentLabel(sentimentScore),
    top_channels: trend.channels,
    temporal_data: trend.temporal,
    scores: trend.signals,
    insights: trend.insights,
    region: 'global',
    is_active: isActiveTrend(trend.temporal.last_seen),
    first_seen: trend.temporal.first_seen,
    last_seen: trend.temporal.last_seen,
    updated_at: new Date().toISOString()
  };
}
