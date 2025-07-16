// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v21 - Correção Scheduled Messages)
 * 
 * Descrição:
 * Versão que corrige a contagem de mensagens agendadas
 * usando a mesma lógica da UI (mentions_overview)
 * 
 * Correções da v21:
 * - Usa mentions_overview para contar mensagens agendadas
 * - Busca por status_das_postagens = 'pending' como a UI
 * - Mantém todas as outras funcionalidades da v20
 * 
 * @author Valdair & Claude
 * @date 14/07/2025
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Configuração de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Variáveis de ambiente
const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Cliente Supabase com service role
const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cache simples para embeddings
const embeddingCache = new Map<string, any>();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

/**
 * Detecta o idioma do texto
 */
function detectLanguage(text: string): 'pt' | 'en' {
  const ptPatterns = [
    /\b(você|voce|está|esta|são|sao|não|nao|sim|olá|ola|obrigado|por favor|eu|meu|minha|nosso|nossa)\b/i,
    /\b(projeto|vídeo|video|canal|menção|mencao|mensagem|análise|analise|sentimento|métrica|metrica)\b/i,
    /\b(quantos?|quais?|quando|onde|porque|como|qual)\b/i,
    /\b(fazer|ter|ser|estar|poder|dever|querer|precisar|conseguir)\b/i
  ];
  
  const enPatterns = [
    /\b(you|your|are|is|not|yes|hello|hi|thanks|please|my|our)\b/i,
    /\b(project|video|channel|mention|message|analysis|sentiment|metric)\b/i,
    /\b(how many|which|when|where|why|how|what)\b/i,
    /\b(do|have|be|can|should|want|need|will|must)\b/i
  ];
  
  let ptScore = 0;
  let enScore = 0;
  
  ptPatterns.forEach(pattern => {
    if (pattern.test(text)) ptScore++;
  });
  
  enPatterns.forEach(pattern => {
    if (pattern.test(text)) enScore++;
  });
  
  // Se houver mais padrões PT ou empate, assume PT (língua padrão)
  return ptScore >= enScore ? 'pt' : 'en';
}

/**
 * Detecta categorias de perguntas para melhor contextualização
 */
function detectQuestionCategories(prompt: string): string[] {
  const categories = [];
  
  // Detectar perguntas sobre métricas/estatísticas
  if (/\b(quantos?|quantidade|número|total|estatísticas?|métricas?|how many|metrics?|statistics?|total)\b/i.test(prompt)) {
    categories.push('metrics');
  }
  
  // Detectar perguntas sobre conteúdo específico
  if (/\b(mensagens?|comentários?|vídeos?|canais?|posts?|postadas?|messages?|comments?|videos?|channels?|posted)\b/i.test(prompt)) {
    categories.push('content');
  }
  
  // Detectar perguntas sobre análise/sentiment
  if (/\b(sentimento|análise|positivo|negativo|tendência|sentiment|analysis|positive|negative|trend)\b/i.test(prompt)) {
    categories.push('analysis');
  }
  
  // Detectar perguntas temporais
  if (/\b(hoje|ontem|semana|mês|quando|today|yesterday|week|month|when)\b/i.test(prompt)) {
    categories.push('temporal');
  }
  
  // Default
  if (categories.length === 0) {
    categories.push('general');
  }
  
  return categories;
}

/**
 * Busca estatísticas reais do projeto - CORRIGIDO PARA SCHEDULED
 */
async function getProjectStats(projectId: string, currentPage?: string) {
  try {
    // 1. SEMPRE usar o RPC get_project_dashboard_stats como fonte primária
    const { data: dashboardStats, error: dashboardError } = await supabase.rpc('get_project_dashboard_stats', {
      p_project_id: projectId
    });

    if (dashboardError) {
      console.error('Erro ao buscar dashboard stats:', dashboardError);
      return null;
    }

    // 2. Buscar mensagens agendadas usando mentions_overview (CORREÇÃO V21)
    // Precisamos buscar o scanner_id correspondente ao projectId
    const { data: scannerData } = await supabase
      .from('Scanner de videos do youtube')
      .select('id')
      .eq('Projeto_id', projectId)
      .single();

    let scheduledCount = 0;
    if (scannerData?.id) {
      // Usar mentions_overview com a mesma lógica da UI
      const { count } = await supabase
        .from('mentions_overview')
        .select('*', { count: 'exact', head: true })
        .eq('scanner_project_id', scannerData.id)
        .eq('status_das_postagens', 'pending');
      
      scheduledCount = count || 0;
    }

    // 3. Métricas específicas por página
    let monitoringStats = null;
    if (currentPage === '/monitoring') {
      const { data: videosData } = await supabase
        .from('Videos')
        .select('visualizacoes, likes')
        .eq('ProjetoID', projectId);
      
      if (videosData) {
        const totalViews = videosData.reduce((sum, v) => sum + (v.visualizacoes || 0), 0);
        const totalLikes = videosData.reduce((sum, v) => sum + (v.likes || 0), 0);
        const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';
        
        monitoringStats = {
          totalViews,
          totalLikes,
          engagementRate: `${engagementRate}%`
        };
      }
    }

    // 4. Métricas específicas de menções
    let mentionsStats = null;
    if (currentPage === '/mentions') {
      const { data: mentionsData } = await supabase
        .from('Comentarios')
        .select('id, lead_score')
        .eq('ProjetoID', projectId)
        .gte('lead_score', 50);
      
      if (mentionsData) {
        const totalHighLeadScore = mentionsData.length;
        const avgLeadScore = mentionsData.length > 0 
          ? (mentionsData.reduce((sum, m) => sum + (m.lead_score || 0), 0) / mentionsData.length).toFixed(1)
          : '0';
        
        mentionsStats = {
          totalHighLeadScore,
          averageLeadScore: avgLeadScore
        };
      }
    }

    // 5. Buscar top canais se necessário
    let topChannelsData = null;
    if (dashboardStats?.channels_count > 0) {
      const { data: channelsData } = await supabase
        .from('Canais')
        .select('nome, inscritos')
        .eq('ProjetoID', projectId)
        .order('inscritos', { ascending: false })
        .limit(3);
      
      topChannelsData = channelsData;
    }

    return {
      // Métricas principais (SEMPRE usar os valores do RPC)
      totalPosted: dashboardStats.messages_posted || 0,
      totalComments: dashboardStats.comments_count || 0,
      totalChannels: dashboardStats.channels_count || 0,
      totalVideos: dashboardStats.videos_count || 0,
      scheduledMessages: scheduledCount,  // CORRIGIDO: Agora usa mentions_overview
      
      // Métricas contextuais (baseadas na página)
      monitoringStats,
      mentionsStats,
      
      // Top canais
      topChannels: topChannelsData || [],
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      source: 'dashboard_rpc'
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

/**
 * Busca mensagens agendadas recentes
 */
async function getRecentScheduledMessages(projectId: string, limit: number = 2) {
  try {
    // Buscar o scanner_id correspondente
    const { data: scannerData } = await supabase
      .from('Scanner de videos do youtube')
      .select('id')
      .eq('Projeto_id', projectId)
      .single();

    if (!scannerData?.id) {
      return [];
    }

    // Buscar mensagens agendadas usando mentions_overview
    const { data, error } = await supabase
      .from('mentions_overview')
      .select(`
        msg_id,
        msg_text,
        scheduled_post_date_timestamp,
        video_title,
        comment_author
      `)
      .eq('scanner_project_id', scannerData.id)
      .eq('status_das_postagens', 'pending')
      .order('scheduled_post_date_timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar mensagens agendadas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens agendadas:', error);
    return [];
  }
}

/**
 * Formata data para exibição amigável
 */
function formatDate(dateString: string, language: 'pt' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (language === 'pt') {
    if (diffHours < 1) return 'há menos de 1 hora';
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  } else {
    if (diffHours < 1) return 'less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  }
}

/**
 * Busca dados via RAG com fallback
 */
async function searchWithRAG(projectId: string, prompt: string, language: 'pt' | 'en', categories: string[]) {
  try {
    console.log(`🔍 Iniciando busca RAG para projeto ${projectId}`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`🌐 Idioma: ${language}`);
    console.log(`📂 Categorias: ${categories.join(', ')}`);

    // Verificar cache primeiro
    const cacheKey = `${projectId}-${prompt}`;
    const cached = embeddingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('✅ Resultado encontrado no cache');
      return cached.data;
    }

    // Limpar cache se estiver muito grande
    if (embeddingCache.size > CACHE_MAX_SIZE) {
      const oldestKey = Array.from(embeddingCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      embeddingCache.delete(oldestKey);
    }

    // Gerar embedding via edge function
    const embeddingResponse = await supabase.functions.invoke('generate-embedding', {
      body: { input: prompt }
    });

    if (!embeddingResponse.data?.embedding) {
      console.error('❌ Erro ao gerar embedding:', embeddingResponse.error);
      return null;
    }

    const embedding = embeddingResponse.data.embedding;
    console.log('✅ Embedding gerado com sucesso');

    // Buscar conteúdo similar via RPC
    const { data: searchResults, error: searchError } = await supabase.rpc('search_project_rag', {
      p_project_id: projectId,
      p_embedding: embedding,
      p_match_threshold: 0.7,
      p_match_count: 5
    });

    if (searchError) {
      console.error('❌ Erro na busca RAG:', searchError);
      return null;
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ Nenhum resultado RAG encontrado');
      return null;
    }

    console.log(`✅ ${searchResults.length} resultados RAG encontrados`);

    // Processar e formatar resultados
    const formattedResults = searchResults.map(result => {
      const metadata = result.metadata || {};
      
      // Criar contexto baseado no tipo de tabela
      let context = '';
      switch (result.table_name) {
        case 'Videos':
          context = `Vídeo: "${metadata.titulo || 'Sem título'}" (${metadata.visualizacoes || 0} views, ${metadata.likes || 0} likes)`;
          break;
        case 'Comentarios':
          context = `Comentário de @${metadata.autor || 'Unknown'}: "${result.content.substring(0, 100)}..."`;
          break;
        case 'Mensagens':
          context = `Mensagem: "${result.content.substring(0, 100)}..."`;
          break;
        case 'Canais':
          context = `Canal: ${metadata.nome || 'Unknown'} (${metadata.inscritos || 0} inscritos)`;
          break;
        default:
          context = `${result.table_name}: "${result.content.substring(0, 100)}..."`;
      }

      return {
        content: result.content,
        context,
        similarity: result.similarity,
        table: result.table_name,
        metadata
      };
    });

    // Armazenar no cache
    const ragData = {
      results: formattedResults,
      timestamp: Date.now()
    };
    embeddingCache.set(cacheKey, { data: ragData, timestamp: Date.now() });

    return ragData;
  } catch (error) {
    console.error('❌ Erro geral no RAG:', error);
    return null;
  }
}

/**
 * Função principal do handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, projectId, userId, currentPage, conversationHistory = [] } = await req.json();

    if (!prompt || !projectId) {
      throw new Error('Prompt e projectId são obrigatórios');
    }

    console.log('=== Nova requisição ===');
    console.log('Projeto:', projectId);
    console.log('Usuário:', userId);
    console.log('Página atual:', currentPage);
    console.log('Prompt:', prompt);

    // Detectar idioma e categorias
    const language = detectLanguage(prompt);
    const categories = detectQuestionCategories(prompt);
    
    console.log('Idioma detectado:', language);
    console.log('Categorias:', categories);

    // Buscar dados do projeto
    const [projectStats, scheduledMessages, ragData] = await Promise.all([
      getProjectStats(projectId, currentPage),
      categories.includes('content') || prompt.toLowerCase().includes('schedul') || prompt.toLowerCase().includes('agend')
        ? getRecentScheduledMessages(projectId)
        : Promise.resolve([]),
      searchWithRAG(projectId, prompt, language, categories)
    ]);

    console.log('📊 Stats do projeto:', projectStats);
    console.log('📅 Mensagens agendadas:', scheduledMessages?.length || 0);
    console.log('🔍 Resultados RAG:', ragData?.results?.length || 0);

    // Construir contexto para o Claude
    let systemContext = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos.
         
         CONTEXTO DO PROJETO ATUAL:
         - Total de mensagens postadas: ${projectStats?.totalPosted || 0}
         - Total de comentários: ${projectStats?.totalComments || 0}
         - Total de canais: ${projectStats?.totalChannels || 0}
         - Total de vídeos: ${projectStats?.totalVideos || 0}
         - Mensagens agendadas: ${projectStats?.scheduledMessages || 0}
         ${projectStats?.monitoringStats ? `
         - Visualizações totais: ${projectStats.monitoringStats.totalViews}
         - Likes totais: ${projectStats.monitoringStats.totalLikes}
         - Taxa de engajamento: ${projectStats.monitoringStats.engagementRate}` : ''}
         ${projectStats?.mentionsStats ? `
         - Menções com alto lead score: ${projectStats.mentionsStats.totalHighLeadScore}
         - Lead score médio: ${projectStats.mentionsStats.averageLeadScore}` : ''}
         
         REGRAS IMPORTANTES:
         1. SEMPRE use os números exatos fornecidos no contexto
         2. Responda de forma natural e conversacional
         3. Se não tiver informação específica, diga claramente
         4. Mantenha as respostas concisas e relevantes
         5. Use os dados do RAG quando disponíveis para enriquecer as respostas`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform.
         
         CURRENT PROJECT CONTEXT:
         - Total posted messages: ${projectStats?.totalPosted || 0}
         - Total comments: ${projectStats?.totalComments || 0}
         - Total channels: ${projectStats?.totalChannels || 0}
         - Total videos: ${projectStats?.totalVideos || 0}
         - Scheduled messages: ${projectStats?.scheduledMessages || 0}
         ${projectStats?.monitoringStats ? `
         - Total views: ${projectStats.monitoringStats.totalViews}
         - Total likes: ${projectStats.monitoringStats.totalLikes}
         - Engagement rate: ${projectStats.monitoringStats.engagementRate}` : ''}
         ${projectStats?.mentionsStats ? `
         - High lead score mentions: ${projectStats.mentionsStats.totalHighLeadScore}
         - Average lead score: ${projectStats.mentionsStats.averageLeadScore}` : ''}
         
         IMPORTANT RULES:
         1. ALWAYS use the exact numbers provided in the context
         2. Respond naturally and conversationally
         3. If you don't have specific information, say so clearly
         4. Keep responses concise and relevant
         5. Use RAG data when available to enrich responses`;

    // Adicionar informações de mensagens agendadas se relevante
    if (scheduledMessages.length > 0 && (categories.includes('content') || prompt.toLowerCase().includes('schedul') || prompt.toLowerCase().includes('agend'))) {
      const scheduledInfo = scheduledMessages.map(msg => 
        `- "${msg.msg_text?.substring(0, 50)}..." (${msg.scheduled_post_date_timestamp ? new Date(msg.scheduled_post_date_timestamp).toLocaleDateString() : 'data não definida'})`
      ).join('\n');
      
      systemContext += language === 'pt'
        ? `\n\nMENSAGENS AGENDADAS RECENTES:\n${scheduledInfo}`
        : `\n\nRECENT SCHEDULED MESSAGES:\n${scheduledInfo}`;
    }

    // Adicionar dados do RAG se disponíveis
    if (ragData?.results && ragData.results.length > 0) {
      const ragInfo = ragData.results.slice(0, 3).map(r => 
        `- ${r.context} (${(r.similarity * 100).toFixed(0)}% relevância)`
      ).join('\n');
      
      systemContext += language === 'pt'
        ? `\n\nDADOS RELEVANTES ENCONTRADOS:\n${ragInfo}`
        : `\n\nRELEVANT DATA FOUND:\n${ragInfo}`;
    }

    // Preparar mensagens para o Claude
    const messages = [
      ...conversationHistory.slice(-5), // Últimas 5 mensagens do histórico
      { role: 'user', content: prompt }
    ];

    // Chamar API do Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemContext,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro na API do Claude:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = await response.json();
    const aiResponse = claudeData.content[0].text;

    // Salvar na memória de conversação
    try {
      await supabase
        .from('agent_memory')
        .insert({
          project_id: projectId,
          user_id: userId,
          message_type: 'user',
          content: prompt,
          metadata: {
            language,
            categories,
            current_page: currentPage,
            has_rag_results: !!ragData?.results?.length
          }
        });

      await supabase
        .from('agent_memory')
        .insert({
          project_id: projectId,
          user_id: userId,
          message_type: 'assistant',
          content: aiResponse,
          metadata: {
            language,
            model: 'claude-3-haiku-20240307',
            stats_used: !!projectStats,
            rag_results_count: ragData?.results?.length || 0
          }
        });
    } catch (memError) {
      console.error('Erro ao salvar memória:', memError);
      // Continuar mesmo se falhar ao salvar
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        metadata: {
          language,
          categories,
          projectStats,
          ragResultsCount: ragData?.results?.length || 0,
          scheduledMessagesCount: scheduledMessages.length
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Erro no agente:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});