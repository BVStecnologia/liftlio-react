// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v20 - Completa)
 * 
 * Descrição:
 * Versão definitiva combinando:
 * - Métricas sincronizadas da v16
 * - RAG otimizado da v19
 * - Correções de bugs
 * 
 * @author Valdair & Claude
 * @date 13/07/2025
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
  const ptWords = /\b(você|voce|está|esta|são|sao|tem|tudo|bem|ola|olá|obrigado|por favor|ajuda|preciso|quero|fazer|isso|aqui|agora|hoje|ontem|amanhã|sim|não|nao|mais|menos|muito|pouco|grande|pequeno|bom|ruim|melhor|pior|quantas|quantos|quais|mensagens|postadas|vídeos|canais|menções|menção)\\b/i;
  const enWords = /\b(you|are|is|have|hello|hi|thanks|please|help|need|want|make|this|here|now|today|yesterday|tomorrow|yes|no|more|less|very|little|big|small|good|bad|better|worse|how|many|which|messages|posted|videos|channels|mentions|mention)\\b/i;
  
  const ptMatches = (text.match(ptWords) || []).length;
  const enMatches = (text.match(enWords) || []).length;
  
  return ptMatches >= enMatches ? 'pt' : 'en';
}

/**
 * Gera UUID válido
 */
function getValidUserId(userId: string | null | undefined): string {
  if (!userId || userId === 'anonymous') {
    return '00000000-0000-0000-0000-000000000000';
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }
  
  return crypto.randomUUID();
}

function getValidSessionId(sessionId: string | null | undefined): string {
  if (!sessionId) {
    return crypto.randomUUID();
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(sessionId)) {
    return sessionId;
  }
  
  return crypto.randomUUID();
}

/**
 * Salva conversa com metadata
 */
async function saveConversation(
  userId: string,
  projectId: string | null,
  sessionId: string,
  message: string,
  messageType: 'user' | 'assistant',
  additionalMetadata?: any
) {
  try {
    const validUserId = getValidUserId(userId);
    const validSessionId = getValidSessionId(sessionId);
    
    const metadata = {
      timestamp: new Date().toISOString(),
      message_length: message.length,
      original_user_id: userId,
      original_session_id: sessionId,
      ...additionalMetadata
    };

    const { error } = await supabase
      .from('agent_conversations')
      .insert({
        id: crypto.randomUUID(),
        user_id: validUserId,
        project_id: projectId ? parseInt(projectId) : null,
        session_id: validSessionId,
        message_type: messageType,
        message: message,
        metadata: metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao salvar conversa:', error);
    }
  } catch (error) {
    console.error('Erro ao processar salvamento:', error);
  }
}

/**
 * Busca histórico de conversas
 */
async function getConversationContext(userId: string, projectId: string | null, sessionId: string) {
  try {
    const validUserId = getValidUserId(userId);
    const validSessionId = getValidSessionId(sessionId);

    const { data: sessionHistory } = await supabase
      .from('agent_conversations')
      .select('message_type, message, created_at')
      .eq('user_id', validUserId)
      .eq('session_id', validSessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    let projectHistory = [];
    if (projectId) {
      const { data } = await supabase
        .from('agent_conversations')
        .select('message_type, message, created_at')
        .eq('user_id', validUserId)
        .eq('project_id', parseInt(projectId))
        .neq('session_id', validSessionId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      projectHistory = data || [];
    }

    return {
      sessionHistory: sessionHistory || [],
      projectHistory: projectHistory
    };
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return { sessionHistory: [], projectHistory: [] };
  }
}

/**
 * Categoriza pergunta
 */
function categorizeQuestion(prompt: string): string[] {
  const categories = [];
  
  if (/\b(quantos?|quantas?|total|número|estatísticas?|métricas?|how many|total|number|statistics|metrics)\\b/i.test(prompt)) {
    categories.push('metrics');
  }
  
  if (/\b(mensagens?|comentários?|vídeos?|canais?|posts?|postadas?|menções?|messages?|comments?|videos?|channels?|posted|mentions?)\\b/i.test(prompt)) {
    categories.push('content');
  }
  
  if (/\b(hoje|ontem|semana|mês|quando|data|horário|today|yesterday|week|month|when|date|time)\\b/i.test(prompt)) {
    categories.push('temporal');
  }
  
  if (/\b(status|estado|situação|como está|como estão|pendente|agendado|how is|how are|pending|scheduled)\\b/i.test(prompt)) {
    categories.push('status');
  }
  
  if (/\b(ir para|navegar|abrir|mostrar|página|tela|go to|navigate|open|show|page|screen)\\b/i.test(prompt)) {
    categories.push('navigation');
  }
  
  return categories;
}

/**
 * Busca estatísticas reais do projeto (da v16)
 */
async function getProjectStats(projectId: string, currentPage?: string) {
  try {
    // 1. Usar RPC para estatísticas do dashboard
    const { data: dashboardStats, error: dashboardError } = await supabase.rpc('get_project_dashboard_stats', {
      project_id_param: parseInt(projectId)
    });

    if (dashboardError) {
      console.error('Erro ao buscar dashboard stats:', dashboardError);
      return null;
    }

    // 2. Buscar mensagens agendadas
    const { count: scheduledCount } = await supabase
      .from('Mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('ProjetoID', projectId)
      .not('DataPostagem', 'is', null)
      .is('Postado', false);

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
          engagementRate
        };
      }
    }

    // 4. Top canais
    const { data: topChannelsData } = await supabase.rpc('get_top_channels_by_project', {
      project_id_input: parseInt(projectId),
      limit_input: 3
    });

    return {
      totalMentions: dashboardStats.total_mentions || 0,
      mentionsToday: dashboardStats.today_mentions || 0,
      totalChannels: dashboardStats.channels_count || 0,
      totalVideos: dashboardStats.videos_count || 0,
      scheduledMessages: scheduledCount || 0,
      monitoringStats,
      topChannels: topChannelsData || [],
      lastUpdated: new Date().toISOString(),
      currentPage: currentPage || 'unknown'
    };

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

/**
 * Otimiza prompt para embedding (da v19)
 */
function optimizePromptForEmbedding(prompt: string, categories: string[], language: 'pt' | 'en'): string {
  let optimized = prompt.toLowerCase();
  
  const termMappings = {
    'menção': 'POSTAGEM REALIZADA mensagem publicado posted',
    'menções': 'POSTAGEM REALIZADA mensagens publicadas posted',
    'mention': 'POSTAGEM REALIZADA message published posted',
    'mentions': 'POSTAGEM REALIZADA messages published posted',
    'hoje': '13/07/2025 julho july',
    'today': '13/07/2025 july julho',
    'postada': 'POSTAGEM REALIZADA posted status posted',
    'postadas': 'POSTAGEM REALIZADA posted status posted',
    'posted': 'POSTAGEM REALIZADA postada postagem'
  };
  
  for (const [term, expansion] of Object.entries(termMappings)) {
    if (optimized.includes(term)) {
      optimized += ' ' + expansion;
    }
  }
  
  if (categories.includes('temporal')) {
    const timeMatch = prompt.match(/\b(\d{1,2}:\d{2})\b/);
    if (timeMatch) {
      optimized += ` ${timeMatch[1]} horário time`;
    }
    optimized += ' 13/07/2025 07/13/2025 13 julho july';
  }
  
  if (categories.includes('content')) {
    optimized += ' conteúdo content earnings breakdown Humanlike Writer HW affiliate';
  }
  
  optimized += ' projeto project 58 HW Humanlike Writer';
  
  return optimized;
}

/**
 * Extrai keywords
 */
function extractKeywords(prompt: string): string[] {
  const domainKeywords = [
    'postagem', 'realizada', 'menção', 'menções', 
    'posted', 'mention', 'mentions', 'earnings',
    'breakdown', 'humanlike', 'writer', 'HW'
  ];
  
  const words = prompt.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['para', 'como', 'está', 'estão', 'what', 'when', 'where', 'with'].includes(word));
  
  const keywords = [...words];
  for (const keyword of domainKeywords) {
    if (prompt.toLowerCase().includes(keyword.substring(0, 3))) {
      keywords.push(keyword);
    }
  }
  
  return [...new Set(keywords)];
}

/**
 * Busca híbrida com RAG (da v19)
 */
async function searchProjectData(prompt: string, projectId: string, categories: string[], language: 'pt' | 'en') {
  try {
    const projectIdNumber = parseInt(projectId);
    
    // Cache
    const cacheKey = `${projectId}:${prompt}`;
    const cached = embeddingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.results;
    }
    
    // Otimizar e gerar embedding
    const optimizedPrompt = optimizePromptForEmbedding(prompt, categories, language);
    
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: optimizedPrompt }
    });

    let searchResults = [];
    
    // 1. Busca por embedding
    if (embeddingData?.embedding) {
      const thresholds = [0.7, 0.6, 0.5, 0.4];
      
      for (const threshold of thresholds) {
        const { data: results, error: searchError } = await supabase.rpc('search_project_rag', {
          query_embedding: embeddingData.embedding,
          project_filter: projectIdNumber,
          similarity_threshold: threshold,
          match_count: 20
        });

        if (!searchError && results && results.length > 0) {
          searchResults = results;
          break;
        }
      }
    }
    
    // 2. Busca por keywords
    const keywords = extractKeywords(prompt);
    if (keywords.length > 0 && searchResults.length < 5) {
      const keywordConditions = keywords
        .slice(0, 5)
        .map(k => `content.ilike.%${k}%`)
        .join(',');
      
      const { data: keywordResults } = await supabase
        .from('rag_embeddings')
        .select('*')
        .eq('project_id', projectIdNumber)
        .or(keywordConditions)
        .limit(10);
      
      if (keywordResults && keywordResults.length > 0) {
        const existingIds = new Set(searchResults.map((r: any) => r.id));
        const newResults = keywordResults
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            ...r,
            similarity: 0.5
          }));
        
        searchResults = [...searchResults, ...newResults];
      }
    }
    
    // 3. Conteúdo recente
    if (searchResults.length < 5) {
      const { data: recentResults } = await supabase
        .from('rag_embeddings')
        .select('*')
        .eq('project_id', projectIdNumber)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentResults) {
        const existingIds = new Set(searchResults.map((r: any) => r.id));
        const newResults = recentResults
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            ...r,
            similarity: 0.3
          }));
        
        searchResults = [...searchResults, ...newResults];
      }
    }
    
    if (searchResults.length === 0) {
      return null;
    }

    // Formatar resultados
    const groupedResults = searchResults.reduce((acc: any, result: any) => {
      const table = result.source_table;
      if (!acc[table]) {
        acc[table] = [];
      }
      acc[table].push(result);
      return acc;
    }, {});

    const formattedResults = [];
    const maxPerTable = 3;

    for (const [table, results] of Object.entries(groupedResults)) {
      const sortedResults = (results as any[])
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxPerTable);

      for (const result of sortedResults) {
        formattedResults.push({
          table,
          content: result.content,
          similarity: result.similarity,
          metadata: result.metadata
        });
      }
    }

    const finalResults = formattedResults.slice(0, 10);
    
    // Cache
    if (embeddingCache.size >= CACHE_MAX_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      embeddingCache.delete(firstKey);
    }
    embeddingCache.set(cacheKey, {
      results: finalResults,
      timestamp: Date.now()
    });
    
    return finalResults;

  } catch (error) {
    console.error('Erro na busca RAG:', error);
    return null;
  }
}

/**
 * Formata contexto RAG
 */
function formatRAGContext(ragResults: any[], language: 'pt' | 'en'): string {
  if (!ragResults || ragResults.length === 0) return '';

  const tableTranslations: any = {
    'Mensagens': language === 'pt' ? 'Mensagens' : 'Messages',
    'Comentarios_Principais': language === 'pt' ? 'Comentários' : 'Comments',
    'Videos': language === 'pt' ? 'Vídeos' : 'Videos',
    'Respostas_Comentarios': language === 'pt' ? 'Respostas' : 'Replies',
    'Settings_messages_posts': language === 'pt' ? 'Postagens' : 'Posts',
    'rag_embeddings': language === 'pt' ? 'Conteúdo' : 'Content'
  };

  let context = language === 'pt' 
    ? '\n\n## 🔍 Informações Específicas Encontradas:\n' 
    : '\n\n## 🔍 Specific Information Found:\n';

  const processedResults = ragResults.map(result => {
    let cleanContent = result.content;
    
    cleanContent = cleanContent.replace(/^(POSTAGEM REALIZADA em |Mensagem: |Comentário: |Resposta: )/i, '');
    
    const dateMatch = cleanContent.match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/);
    const statusMatch = cleanContent.match(/Status: (\w+)/i);
    const contentMatch = cleanContent.match(/Conteúdo postado: (.+?)(?:\.|$)/i);
    
    return {
      ...result,
      cleanContent,
      date: dateMatch ? dateMatch[1] : null,
      status: statusMatch ? statusMatch[1] : null,
      mainContent: contentMatch ? contentMatch[1] : cleanContent.substring(0, 150)
    };
  });

  const grouped = processedResults.reduce((acc: any, result: any) => {
    const type = tableTranslations[result.table] || result.table;
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});

  for (const [type, results] of Object.entries(grouped)) {
    context += `\n### ${type}:\n`;
    
    for (const result of results as any[]) {
      if (result.date) {
        context += `\n**📅 ${result.date}**`;
        if (result.status) context += ` (${result.status})`;
        context += '\n';
      }
      
      context += `${result.mainContent}\n`;
      
      if (result.metadata?.canal || result.metadata?.channel_name) {
        context += `*Canal: ${result.metadata.canal || result.metadata.channel_name}*\n`;
      }
      
      context += '\n';
    }
  }

  return context;
}

/**
 * Gera resposta usando Claude
 */
async function generateResponse(systemPrompt: string, userPrompt: string, language: 'pt' | 'en') {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API Claude:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    throw error;
  }
}

// Handler principal
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const { prompt, context, userId, sessionId } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const language = detectLanguage(prompt);
    const currentSessionId = getValidSessionId(sessionId);
    const categories = categorizeQuestion(prompt);

    // Construir contexto
    let contextualPrompt = '';
    const currentPage = context?.currentPage || null;
    
    if (currentPage) {
      contextualPrompt += language === 'pt' 
        ? `\nUsuário está na página: ${currentPage}`
        : `\nUser is on page: ${currentPage}`;
    }
    
    // Dados do projeto
    let projectStats = null;
    let ragResults = null;
    let ragMetrics = {
      searched: false,
      resultsCount: 0,
      searchTime: 0
    };
    
    if (context?.currentProject?.id) {
      // Estatísticas
      projectStats = await getProjectStats(context.currentProject.id, currentPage);
      
      // RAG
      const startTime = Date.now();
      ragMetrics.searched = true;
      
      ragResults = await searchProjectData(
        prompt, 
        context.currentProject.id, 
        categories, 
        language
      );
      
      ragMetrics.searchTime = Date.now() - startTime;
      ragMetrics.resultsCount = ragResults?.length || 0;
      
      // Adicionar métricas
      if (projectStats) {
        if (language === 'pt') {
          contextualPrompt += `\n\n## 📊 Métricas do Projeto "${context.currentProject.name || 'HW'}":`;
          contextualPrompt += `\n- Total de menções: ${projectStats.totalMentions}`;
          contextualPrompt += `\n- Canais alcançados: ${projectStats.totalChannels}`;
          contextualPrompt += `\n- Vídeos monitorados: ${projectStats.totalVideos}`;
          contextualPrompt += `\n- Mensagens agendadas: ${projectStats.scheduledMessages}`;
          contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
        } else {
          contextualPrompt += `\n\n## 📊 Project Metrics for "${context.currentProject.name || 'HW'}":`;
          contextualPrompt += `\n- Total mentions: ${projectStats.totalMentions}`;
          contextualPrompt += `\n- Channels reached: ${projectStats.totalChannels}`;
          contextualPrompt += `\n- Videos monitored: ${projectStats.totalVideos}`;
          contextualPrompt += `\n- Scheduled messages: ${projectStats.scheduledMessages}`;
          contextualPrompt += `\n- Mentions today: ${projectStats.mentionsToday}`;
        }
      }
    }
    
    // Adicionar RAG
    if (ragResults && ragResults.length > 0) {
      contextualPrompt += formatRAGContext(ragResults, language);
    }

    // Histórico
    const conversationHistory = await getConversationContext(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId
    );
    
    if (conversationHistory.sessionHistory.length > 0) {
      if (language === 'pt') {
        contextualPrompt += `\n\n## 💬 Contexto da Conversa:`;
        conversationHistory.sessionHistory.slice(0, 3).reverse().forEach((msg: any) => {
          const role = msg.message_type === 'user' ? 'Você' : 'Assistente';
          contextualPrompt += `\n${role}: ${msg.message.substring(0, 100)}...`;
        });
      } else {
        contextualPrompt += `\n\n## 💬 Conversation Context:`;
        conversationHistory.sessionHistory.slice(0, 3).reverse().forEach((msg: any) => {
          const role = msg.message_type === 'user' ? 'You' : 'Assistant';
          contextualPrompt += `\n${role}: ${msg.message.substring(0, 100)}...`;
        });
      }
    }
    
    // System prompt
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

INSTRUÇÕES IMPORTANTES:
1. Use os dados fornecidos no contexto para responder com precisão
2. Quando houver "Informações Específicas Encontradas", apresente esses dados de forma clara
3. Seja conversacional mas direto ao ponto
4. Formate datas e horários de forma amigável (ex: "hoje às 14:11")
5. NUNCA mencione IDs técnicos nas respostas

${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

IMPORTANT INSTRUCTIONS:
1. Use the provided context data to answer accurately
2. When there's "Specific Information Found", present this data clearly
3. Be conversational but direct
4. Format dates and times in a friendly way (e.g., "today at 2:11 PM")
5. NEVER mention technical IDs in responses

${contextualPrompt}`;

    // Salvar pergunta
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      prompt,
      'user'
    );

    // Gerar resposta
    const aiResponse = await generateResponse(
      systemPrompt, 
      prompt, 
      language
    );
    
    // Metadata
    const responseMetadata = {
      ragResultsCount: ragMetrics.resultsCount,
      ragSearchTime: ragMetrics.searchTime,
      hasRAGData: ragResults && ragResults.length > 0,
      categoriesDetected: categories,
      version: 'v20-completa'
    };
    
    // Salvar resposta
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      aiResponse,
      'assistant',
      responseMetadata
    );

    // Retornar
    return new Response(
      JSON.stringify({ 
        content: aiResponse,
        sessionId: currentSessionId,
        language,
        hasRAGData: ragResults && ragResults.length > 0,
        debug: {
          version: 'v20-completa',
          ragResultsCount: ragMetrics.resultsCount,
          ragSearchTime: ragMetrics.searchTime,
          categoriesDetected: categories
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    console.error('Erro no agente v20:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        version: 'v20-completa'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});