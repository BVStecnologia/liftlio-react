// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v22 - RAG Backend Otimizado)
 * 
 * Descrição:
 * Versão com busca RAG movida para o backend Supabase via RPC.
 * Resolve problemas de mensagens agendadas e melhora performance.
 * 
 * Melhorias v22:
 * - RAG via RPC search_rag_enhanced
 * - Busca correta em Settings messages posts
 * - Performance otimizada no backend
 * - Suporte a múltiplas estratégias de busca
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

/**
 * Detecta o idioma do texto
 */
function detectLanguage(text: string): 'pt' | 'en' {
  const ptWords = /\b(você|voce|está|esta|são|sao|tem|tudo|bem|ola|olá|obrigado|por favor|ajuda|preciso|quero|fazer|isso|aqui|agora|hoje|ontem|amanhã|sim|não|nao|mais|menos|muito|pouco|grande|pequeno|bom|ruim|melhor|pior|quantas|quantos|quais|mensagens|postadas|vídeos|canais|menções|menção|agendadas?)\b/i;
  const enWords = /\b(you|are|is|have|hello|hi|thanks|please|help|need|want|make|this|here|now|today|yesterday|tomorrow|yes|no|more|less|very|little|big|small|good|bad|better|worse|how|many|which|messages|posted|videos|channels|mentions|mention|scheduled)\b/i;
  
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
  
  if (/\b(quantos?|quantas?|total|número|estatísticas?|métricas?|how many|total|number|statistics|metrics)\b/i.test(prompt)) {
    categories.push('metrics');
  }
  
  if (/\b(mensagens?|comentários?|vídeos?|canais?|posts?|postadas?|menções?|messages?|comments?|videos?|channels?|posted|mentions?)\b/i.test(prompt)) {
    categories.push('content');
  }
  
  if (/\b(hoje|ontem|semana|mês|quando|data|horário|today|yesterday|week|month|when|date|time)\b/i.test(prompt)) {
    categories.push('temporal');
  }
  
  if (/\b(status|estado|situação|como está|como estão|pendente|agendado|how is|how are|pending|scheduled)\b/i.test(prompt)) {
    categories.push('status');
  }
  
  if (/\b(agendad[ao]s?|scheduled|próxima postagem|proxima postagem|vão ser postadas?|vai ser postado)\b/i.test(prompt)) {
    categories.push('scheduled');
  }
  
  return categories;
}

/**
 * Busca estatísticas reais do projeto (v22 - Corrigida para Settings messages posts)
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

    // 2. Buscar mensagens agendadas diretamente em Settings messages posts
    const { count: scheduledCount } = await supabase
      .from('Settings messages posts')
      .select('*', { count: 'exact', head: true })
      .eq('Projeto', parseInt(projectId))
      .not('proxima_postagem', 'is', null)
      .gt('proxima_postagem', new Date().toISOString());

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
 * Busca RAG otimizada via RPC backend
 */
async function searchProjectDataBackend(
  prompt: string, 
  projectId: string, 
  categories: string[], 
  language: 'pt' | 'en'
) {
  try {
    const projectIdNumber = parseInt(projectId);
    
    // Gerar embedding
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: prompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingError);
      // Continuar mesmo sem embedding, usando apenas busca por keywords
    }

    // Chamar RPC com embedding e parâmetros
    const { data: searchResults, error: searchError } = await supabase.rpc('search_rag_enhanced', {
      p_query_embedding: embeddingData?.embedding || null,
      p_project_id: projectIdNumber,
      p_search_text: prompt,
      p_categories: categories,
      p_limit: 20,
      p_min_similarity: 0.4
    });

    if (searchError) {
      console.error('Erro na busca RAG:', searchError);
      return null;
    }

    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Formatar resultados (campos com prefixo result_)
    return searchResults.map((result: any) => ({
      table: result.result_source_table,
      content: result.result_content,
      similarity: result.result_similarity,
      metadata: result.result_metadata,
      relevance: result.result_relevance_score
    }));

  } catch (error) {
    console.error('Erro na busca RAG backend:', error);
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
    'Settings messages posts': language === 'pt' ? 'Postagens Agendadas' : 'Scheduled Posts',
    'Settings_messages_posts': language === 'pt' ? 'Postagens Agendadas' : 'Scheduled Posts',
    'rag_embeddings': language === 'pt' ? 'Conteúdo' : 'Content'
  };

  let context = language === 'pt' 
    ? '\n\n## 🔍 Informações Específicas Encontradas:\n' 
    : '\n\n## 🔍 Specific Information Found:\n';

  // Agrupar por tabela
  const grouped = ragResults.reduce((acc: any, result: any) => {
    const type = tableTranslations[result.table] || result.table;
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});

  // Formatar cada grupo
  for (const [type, results] of Object.entries(grouped)) {
    context += `\n### ${type}:\n`;
    
    for (const result of results as any[]) {
      // Tratamento especial para mensagens agendadas
      if (result.table.includes('Settings') && result.metadata?.scheduled_for) {
        const scheduledDate = new Date(result.metadata.scheduled_for);
        const formattedDate = language === 'pt' 
          ? scheduledDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : scheduledDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        context += `\n**📅 Agendada para ${formattedDate}**\n`;
      }
      
      // Conteúdo principal
      const content = result.content.length > 200 
        ? result.content.substring(0, 200) + '...' 
        : result.content;
      context += `${content}\n`;
      
      // Metadata adicional
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

    // Log para debug
    console.log('=== AGENTE v22 DEBUG ===');
    console.log('Prompt:', prompt);
    console.log('Categorias detectadas:', categories);
    console.log('Projeto:', context?.currentProject?.id);

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
      console.log('Stats obtidas:', {
        scheduled: projectStats?.scheduledMessages,
        total: projectStats?.totalMentions
      });
      
      // RAG via Backend
      const startTime = Date.now();
      ragMetrics.searched = true;
      
      ragResults = await searchProjectDataBackend(
        prompt, 
        context.currentProject.id, 
        categories, 
        language
      );
      
      ragMetrics.searchTime = Date.now() - startTime;
      ragMetrics.resultsCount = ragResults?.length || 0;
      console.log('RAG resultados:', ragMetrics.resultsCount);
      
      // Adicionar métricas
      if (projectStats) {
        if (language === 'pt') {
          contextualPrompt += `\n\n## 📊 Métricas do Projeto "${context.currentProject.name || 'HW'}":\n`;
          contextualPrompt += `- Total de menções: ${projectStats.totalMentions}\n`;
          contextualPrompt += `- Canais alcançados: ${projectStats.totalChannels}\n`;
          contextualPrompt += `- Vídeos monitorados: ${projectStats.totalVideos}\n`;
          contextualPrompt += `- **Mensagens agendadas: ${projectStats.scheduledMessages}**\n`;
          contextualPrompt += `- Menções hoje: ${projectStats.mentionsToday}`;
        } else {
          contextualPrompt += `\n\n## 📊 Project Metrics for "${context.currentProject.name || 'HW'}":\n`;
          contextualPrompt += `- Total mentions: ${projectStats.totalMentions}\n`;
          contextualPrompt += `- Channels reached: ${projectStats.totalChannels}\n`;
          contextualPrompt += `- Videos monitored: ${projectStats.totalVideos}\n`;
          contextualPrompt += `- **Scheduled messages: ${projectStats.scheduledMessages}**\n`;
          contextualPrompt += `- Mentions today: ${projectStats.mentionsToday}`;
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
        contextualPrompt += `\n\n## 💬 Contexto da Conversa:\n`;
        conversationHistory.sessionHistory.slice(0, 3).reverse().forEach((msg: any) => {
          const role = msg.message_type === 'user' ? 'Você' : 'Assistente';
          contextualPrompt += `${role}: ${msg.message.substring(0, 100)}...\n`;
        });
      } else {
        contextualPrompt += `\n\n## 💬 Conversation Context:\n`;
        conversationHistory.sessionHistory.slice(0, 3).reverse().forEach((msg: any) => {
          const role = msg.message_type === 'user' ? 'You' : 'Assistant';
          contextualPrompt += `${role}: ${msg.message.substring(0, 100)}...\n`;
        });
      }
    }
    
    // System prompt
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

INSTRUÇÕES IMPORTANTES:
1. Use os dados fornecidos no contexto para responder com precisão
2. Quando houver "Informações Específicas Encontradas", apresente esses dados de forma clara
3. Para mensagens agendadas, mencione SEMPRE o número exato fornecido nas métricas
4. Seja conversacional mas direto ao ponto
5. Formate datas e horários de forma amigável
6. NUNCA mencione IDs técnicos nas respostas

${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

IMPORTANT INSTRUCTIONS:
1. Use the provided context data to answer accurately
2. When there's "Specific Information Found", present this data clearly
3. For scheduled messages, ALWAYS mention the exact number provided in the metrics
4. Be conversational but direct
5. Format dates and times in a friendly way
6. NEVER mention technical IDs in responses

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
      version: 'v22-rag-backend',
      scheduledMessages: projectStats?.scheduledMessages || 0
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
          version: 'v22-rag-backend',
          ragResultsCount: ragMetrics.resultsCount,
          ragSearchTime: ragMetrics.searchTime,
          categoriesDetected: categories,
          scheduledMessages: projectStats?.scheduledMessages || 0
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
    console.error('Erro no agente v22:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        version: 'v22-rag-backend'
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