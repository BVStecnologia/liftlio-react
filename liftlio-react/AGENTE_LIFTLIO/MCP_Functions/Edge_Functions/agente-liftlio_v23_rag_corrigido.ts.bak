import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Detecta o idioma da mensagem
 */
function detectLanguage(text: string): 'pt' | 'en' {
  const ptPatterns = /\b(olá|oi|obrigad|por favor|você|está|são|com|para|mais|pode|ajud|precis|quero|saber|fazer|tem|ter|qual|quais|quando|onde|como|quanto|bom dia|boa tarde|boa noite)\b/i;
  const enPatterns = /\b(hello|hi|thanks|please|you|are|is|with|for|more|can|help|need|want|know|make|have|has|what|which|when|where|how|much|many|good morning|good afternoon|good evening)\b/i;
  
  const ptMatches = (text.match(ptPatterns) || []).length;
  const enMatches = (text.match(enPatterns) || []).length;
  
  return ptMatches > enMatches ? 'pt' : 'en';
}

/**
 * Salva uma conversa
 */
async function saveConversation(
  userId: string,
  projectId: string | null,
  sessionId: string,
  message: string,
  messageType: 'user' | 'assistant',
  metadata?: any
) {
  try {
    const { error } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: userId,
        project_id: projectId ? parseInt(projectId) : null,
        session_id: sessionId,
        message,
        message_type: messageType,
        metadata
      });

    if (error) {
      console.error('Erro ao salvar conversa:', error);
    }
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
  }
}

/**
 * Busca contexto de conversas anteriores
 */
async function getConversationContext(userId: string, projectId: string | null, sessionId: string) {
  try {
    const { data: sessionHistory } = await supabase
      .from('agent_conversations')
      .select('message, message_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: projectHistory } = projectId ? await supabase
      .from('agent_conversations')
      .select('message, message_type, created_at')
      .eq('user_id', userId)
      .eq('project_id', parseInt(projectId))
      .neq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(3) : { data: null };

    return {
      sessionHistory: sessionHistory || [],
      projectHistory: projectHistory || []
    };
  } catch (error) {
    console.error('Erro ao buscar contexto:', error);
    return { sessionHistory: [], projectHistory: [] };
  }
}

/**
 * Categoriza a pergunta
 */
function categorizeQuestion(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const categories = [];
  
  if (/menção|menções|mention|comentário|comment|resposta|reply/.test(lowerPrompt)) {
    categories.push('mentions');
  }
  if (/vídeo|video|canal|channel|youtube/.test(lowerPrompt)) {
    categories.push('videos');
  }
  if (/agendad|scheduled|próxim|next|pendente|pending/.test(lowerPrompt)) {
    categories.push('scheduled');
  }
  if (/métrica|metric|estatística|stats|número|number|quanto|total/.test(lowerPrompt)) {
    categories.push('metrics');
  }
  if (/sentimento|sentiment|positiv|negativ|satisf/.test(lowerPrompt)) {
    categories.push('sentiment');
  }
  
  return categories.length > 0 ? categories : ['general'];
}

/**
 * Gera um session ID válido
 */
function getValidSessionId(sessionId?: string): string {
  if (sessionId && sessionId.length > 10) {
    return sessionId;
  }
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Busca estatísticas reais do projeto (v23 - Mantém correção para Settings messages posts)
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
 * Busca RAG otimizada via RPC backend (v23 - CORRIGIDA)
 */
async function searchProjectDataBackend(
  prompt: string, 
  projectId: string, 
  categories: string[], 
  language: 'pt' | 'en'
) {
  try {
    const projectIdNumber = parseInt(projectId);
    
    console.log('=== RAG v23 DEBUG ===');
    console.log('Prompt:', prompt);
    console.log('ProjectID:', projectIdNumber);
    console.log('Categories:', categories);
    
    // Gerar embedding
    let embedding = null;
    try {
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: prompt }
      });

      if (embeddingError || !embeddingData?.embedding) {
        console.error('Erro ao gerar embedding:', embeddingError);
      } else {
        embedding = embeddingData.embedding;
        console.log('Embedding gerado com sucesso, dimensões:', embedding.length);
      }
    } catch (embError) {
      console.error('Exceção ao gerar embedding:', embError);
    }

    // Se não tiver embedding, criar um vetor vazio de 1536 dimensões
    if (!embedding) {
      console.log('Criando embedding vazio para fallback de keyword search');
      embedding = new Array(1536).fill(0);
    }

    // Chamar RPC com embedding válido
    console.log('Chamando RPC search_rag_enhanced...');
    const { data: searchResults, error: searchError } = await supabase.rpc('search_rag_enhanced', {
      p_query_embedding: embedding,
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

    console.log('Resultados RAG:', searchResults?.length || 0);

    if (!searchResults || searchResults.length === 0) {
      console.log('Nenhum resultado encontrado no RAG');
      return null;
    }

    // Formatar resultados - CORRIGIDO: campos sem prefixo result_
    const formattedResults = searchResults.map((result: any) => {
      console.log('Resultado RAG:', {
        table: result.source_table,
        similarity: result.similarity,
        content_preview: result.content?.substring(0, 100)
      });
      
      return {
        table: result.source_table,
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata,
        relevance: result.relevance_score
      };
    });

    return formattedResults;

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
  Object.entries(grouped).forEach(([type, results]: [string, any]) => {
    context += `\n### ${type}:\n`;
    
    (results as any[]).slice(0, 3).forEach((result: any, index: number) => {
      context += `${index + 1}. ${result.content}\n`;
      
      // Adicionar metadados relevantes
      if (result.metadata) {
        if (result.metadata.scheduled_for) {
          const date = new Date(result.metadata.scheduled_for);
          const formatted = language === 'pt' 
            ? date.toLocaleString('pt-BR') 
            : date.toLocaleString('en-US');
          context += `   📅 ${language === 'pt' ? 'Agendado para' : 'Scheduled for'}: ${formatted}\n`;
        }
        if (result.metadata.channel_name) {
          context += `   📺 Canal: ${result.metadata.channel_name}\n`;
        }
        if (result.metadata.video_title) {
          context += `   🎥 ${language === 'pt' ? 'Vídeo' : 'Video'}: ${result.metadata.video_title}\n`;
        }
      }
      
      context += `   ${language === 'pt' ? 'Relevância' : 'Relevance'}: ${(result.similarity * 100).toFixed(0)}%\n\n`;
    });
  });

  return context;
}

/**
 * Gera resposta usando Claude
 */
async function generateResponse(systemPrompt: string, userPrompt: string) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
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
    console.log('=== AGENTE v23 DEBUG ===');
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
      console.log('RAG métricas:', ragMetrics);
      
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
      prompt
    );

    // Salvar resposta
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      aiResponse,
      'assistant',
      { 
        ragSearched: ragMetrics.searched,
        ragResults: ragMetrics.resultsCount,
        ragTime: ragMetrics.searchTime,
        categories: categories,
        language: language
      }
    );

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        sessionId: currentSessionId,
        metadata: {
          language,
          categories,
          ragSearched: ragMetrics.searched,
          ragResults: ragMetrics.resultsCount,
          ragSearchTime: ragMetrics.searchTime
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
    console.error('Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred',
        details: error.message 
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