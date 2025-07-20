import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0';

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
 * Formata data/hora no timezone de Brasília
 */
function formatDateTimeBrazil(dateString: string, language: 'pt' | 'en'): string {
  try {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    if (language === 'pt') {
      return date.toLocaleString('pt-BR', options);
    } else {
      return date.toLocaleString('en-US', options);
    }
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

/**
 * Converte string para UUID válido ou gera novo
 * v26 - Correção para tipos UUID
 */
function ensureValidUUID(value: string | undefined): string {
  if (!value) {
    return uuidv4();
  }
  
  // Regex para validar UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(value)) {
    return value.toLowerCase();
  }
  
  // Se não for um UUID válido, gerar um novo baseado no hash da string
  // Isso garante que a mesma string sempre gerará o mesmo UUID
  const hash = Array.from(value).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  
  // Criar um UUID v4 determinístico baseado no hash
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c, i) => {
    const r = (hash + i) & 0xf;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  return uuid;
}

/**
 * Sistema de Memória Aprimorado - v26
 * Mantém contexto completo da conversa e extrai informações importantes
 */
interface MemoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedInfo?: {
    userName?: string;
    userCompany?: string;
    userRole?: string;
    projectDetails?: string[];
    keyTopics?: string[];
  };
}

/**
 * Extrai informações importantes de uma mensagem
 */
function extractImportantInfo(message: string, language: 'pt' | 'en'): any {
  const extracted: any = {};
  
  // Padrões para nome
  const namePatterns = language === 'pt' 
    ? [/meu nome é (\w+\s*\w*)/i, /me chamo (\w+\s*\w*)/i, /sou (\w+\s*\w*)/i]
    : [/my name is (\w+\s*\w*)/i, /i'm (\w+\s*\w*)/i, /i am (\w+\s*\w*)/i];
  
  // Padrões para empresa
  const companyPatterns = language === 'pt'
    ? [/trabalho na (\w+\s*\w*)/i, /empresa (\w+\s*\w*)/i, /da (\w+\s*\w*)/i]
    : [/work at (\w+\s*\w*)/i, /company (\w+\s*\w*)/i, /from (\w+\s*\w*)/i];
  
  // Extrair nome
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match) {
      extracted.userName = match[1].trim();
      break;
    }
  }
  
  // Extrair empresa
  for (const pattern of companyPatterns) {
    const match = message.match(pattern);
    if (match) {
      extracted.userCompany = match[1].trim();
      break;
    }
  }
  
  // Extrair tópicos importantes (campanhas, produtos, etc)
  const topicPatterns = language === 'pt'
    ? [/campanha (?:de |da |do )?(\w+)/i, /analisando (?:a |o )?(\w+)/i, /projeto (\w+)/i]
    : [/campaign (?:of |for )?(\w+)/i, /analyzing (?:the )?(\w+)/i, /project (\w+)/i];
  
  const topics = [];
  for (const pattern of topicPatterns) {
    const matches = message.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      if (match[1]) topics.push(match[1]);
    }
  }
  if (topics.length > 0) extracted.keyTopics = topics;
  
  return Object.keys(extracted).length > 0 ? extracted : null;
}

/**
 * Salva uma conversa com extração de informações importantes
 * v26 - Com conversão correta de UUIDs
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
    // Converter para UUIDs válidos
    const validUserId = ensureValidUUID(userId);
    const validSessionId = ensureValidUUID(sessionId);
    
    console.log('Salvando conversa:', {
      userId: validUserId,
      sessionId: validSessionId,
      messageType,
      messagePreview: message.substring(0, 50)
    });
    
    // Extrair informações importantes se for mensagem do usuário
    let extractedInfo = null;
    if (messageType === 'user') {
      const language = detectLanguage(message);
      extractedInfo = extractImportantInfo(message, language);
    }
    
    const { data, error } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: validUserId,
        project_id: projectId ? parseInt(projectId) : null,
        session_id: validSessionId,
        message,
        message_type: messageType,
        metadata: {
          ...metadata,
          extracted_info: extractedInfo,
          original_user_id: userId,
          original_session_id: sessionId
        }
      })
      .select();

    if (error) {
      console.error('Erro ao salvar conversa:', error);
      throw error;
    }
    
    console.log('Conversa salva com sucesso:', data?.[0]?.id);
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
  }
}

/**
 * Busca contexto de conversas anteriores - v26
 * Com suporte correto para UUIDs
 */
async function getConversationContext(userId: string, projectId: string | null, sessionId: string) {
  try {
    const validUserId = ensureValidUUID(userId);
    const validSessionId = ensureValidUUID(sessionId);
    
    console.log('Buscando contexto:', {
      userId: validUserId,
      sessionId: validSessionId,
      projectId
    });
    
    // 1. Buscar TODA a sessão atual (sem limite)
    const { data: sessionHistory, error: sessionError } = await supabase
      .from('agent_conversations')
      .select('message, message_type, created_at, metadata')
      .eq('session_id', validSessionId)
      .order('created_at', { ascending: true });
    
    if (sessionError) {
      console.error('Erro ao buscar histórico da sessão:', sessionError);
    }
    
    console.log('Histórico da sessão:', sessionHistory?.length || 0, 'mensagens');
    
    // 2. Buscar últimas conversas do usuário no projeto
    let userHistory = null;
    if (projectId) {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('message, message_type, created_at, metadata')
        .eq('user_id', validUserId)
        .eq('project_id', parseInt(projectId))
        .neq('session_id', validSessionId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Erro ao buscar histórico do usuário:', error);
      } else {
        userHistory = data;
      }
    }
    
    // 3. Extrair informações importantes acumuladas
    const extractedInfo: any = {
      userName: null,
      userCompany: null,
      userRole: null,
      projectDetails: [],
      keyTopics: new Set()
    };
    
    // Processar todo o histórico para extrair informações
    const allHistory = [...(sessionHistory || []), ...(userHistory || [])];
    for (const msg of allHistory) {
      if (msg.metadata?.extracted_info) {
        const info = msg.metadata.extracted_info;
        if (info.userName && !extractedInfo.userName) {
          extractedInfo.userName = info.userName;
        }
        if (info.userCompany && !extractedInfo.userCompany) {
          extractedInfo.userCompany = info.userCompany;
        }
        if (info.keyTopics) {
          info.keyTopics.forEach((topic: string) => extractedInfo.keyTopics.add(topic));
        }
      }
    }
    
    // Converter Set para Array
    extractedInfo.keyTopics = Array.from(extractedInfo.keyTopics);
    
    return {
      sessionHistory: sessionHistory || [],
      userHistory: userHistory || [],
      extractedInfo
    };
  } catch (error) {
    console.error('Erro ao buscar contexto:', error);
    return { sessionHistory: [], userHistory: [], extractedInfo: {} };
  }
}

/**
 * Formata histórico para o prompt - MELHORADO v26
 * Inclui TODO o contexto relevante sem truncar
 */
function formatConversationHistory(
  sessionHistory: any[], 
  userHistory: any[], 
  extractedInfo: any,
  language: 'pt' | 'en'
): string {
  let context = '';
  
  // 1. Informações do usuário extraídas
  if (extractedInfo.userName || extractedInfo.userCompany) {
    if (language === 'pt') {
      context += '\n## 👤 Informações do Usuário:\n';
      if (extractedInfo.userName) context += `- Nome: ${extractedInfo.userName}\n`;
      if (extractedInfo.userCompany) context += `- Empresa: ${extractedInfo.userCompany}\n`;
      if (extractedInfo.keyTopics?.length > 0) {
        context += `- Tópicos discutidos: ${extractedInfo.keyTopics.join(', ')}\n`;
      }
    } else {
      context += '\n## 👤 User Information:\n';
      if (extractedInfo.userName) context += `- Name: ${extractedInfo.userName}\n`;
      if (extractedInfo.userCompany) context += `- Company: ${extractedInfo.userCompany}\n`;
      if (extractedInfo.keyTopics?.length > 0) {
        context += `- Topics discussed: ${extractedInfo.keyTopics.join(', ')}\n`;
      }
    }
  }
  
  // 2. Histórico completo da sessão atual
  if (sessionHistory.length > 0) {
    context += language === 'pt' 
      ? '\n## 💬 Conversa Atual Completa:\n'
      : '\n## 💬 Complete Current Conversation:\n';
    
    // Incluir TODAS as mensagens sem truncar
    sessionHistory.forEach((msg: any) => {
      const role = msg.message_type === 'user' 
        ? (language === 'pt' ? 'Usuário' : 'User')
        : (language === 'pt' ? 'Assistente' : 'Assistant');
      
      const time = formatDateTimeBrazil(msg.created_at, language);
      context += `\n[${time}] ${role}: ${msg.message}\n`;
    });
  }
  
  // 3. Contexto de conversas anteriores (resumido)
  if (userHistory && userHistory.length > 0) {
    context += language === 'pt'
      ? '\n## 📋 Conversas Anteriores (resumo):\n'
      : '\n## 📋 Previous Conversations (summary):\n';
    
    userHistory.slice(0, 5).forEach((msg: any) => {
      if (msg.message_type === 'user') {
        const time = formatDateTimeBrazil(msg.created_at, language);
        context += `- [${time}] ${msg.message.substring(0, 100)}...\n`;
      }
    });
  }
  
  return context;
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
 * Busca estatísticas reais do projeto
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
    
    console.log('=== RAG v26 DEBUG ===');
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

    // Se não tiver embedding, criar um vetor vazio
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

    // Formatar resultados
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
          const formatted = formatDateTimeBrazil(result.metadata.scheduled_for, language);
          context += `   📅 ${language === 'pt' ? 'Agendado para' : 'Scheduled for'}: ${formatted} (Horário de Brasília)\n`;
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
 * Processa contexto de tela - NOVO v26
 */
function processScreenContext(context: any, language: 'pt' | 'en'): string {
  if (!context?.visibleData) return '';
  
  let screenContext = language === 'pt'
    ? '\n## 🖥️ Dados Visíveis na Tela:\n'
    : '\n## 🖥️ Visible Screen Data:\n';
  
  const data = context.visibleData;
  
  // Processar dados estruturados
  if (data.totalMentions !== undefined) {
    screenContext += language === 'pt' 
      ? `- Total de menções: ${data.totalMentions}\n`
      : `- Total mentions: ${data.totalMentions}\n`;
  }
  
  if (data.sentimentScore !== undefined) {
    screenContext += language === 'pt'
      ? `- Score de sentimento: ${data.sentimentScore}%\n`
      : `- Sentiment score: ${data.sentimentScore}%\n`;
  }
  
  if (data.reach !== undefined) {
    screenContext += language === 'pt'
      ? `- Alcance: ${data.reach.toLocaleString()}\n`
      : `- Reach: ${data.reach.toLocaleString()}\n`;
  }
  
  if (data.topVideos && data.topVideos.length > 0) {
    screenContext += language === 'pt'
      ? `- Top vídeos: ${data.topVideos.join(', ')}\n`
      : `- Top videos: ${data.topVideos.join(', ')}\n`;
  }
  
  // Adicionar outros campos dinamicamente
  Object.entries(data).forEach(([key, value]) => {
    if (!['totalMentions', 'sentimentScore', 'reach', 'topVideos'].includes(key)) {
      screenContext += `- ${key}: ${JSON.stringify(value)}\n`;
    }
  });
  
  return screenContext;
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
    const currentSessionId = ensureValidUUID(sessionId);
    const categories = categorizeQuestion(prompt);

    // Log para debug
    console.log('=== AGENTE v26 UUID FIX ===');
    console.log('Prompt:', prompt);
    console.log('SessionID original:', sessionId);
    console.log('SessionID UUID:', currentSessionId);
    console.log('UserID original:', userId);
    console.log('UserID UUID:', ensureValidUUID(userId));
    console.log('Categorias:', categories);
    console.log('Contexto de tela:', context?.visibleData);

    // 1. Buscar histórico completo e informações extraídas
    const { sessionHistory, userHistory, extractedInfo } = await getConversationContext(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId
    );
    
    console.log('Histórico da sessão:', sessionHistory.length, 'mensagens');
    console.log('Informações extraídas:', extractedInfo);

    // 2. Construir contexto completo
    let contextualPrompt = '';
    const currentPage = context?.currentPage || null;
    
    // Adicionar página atual
    if (currentPage) {
      contextualPrompt += language === 'pt' 
        ? `\nUsuário está na página: ${currentPage}`
        : `\nUser is on page: ${currentPage}`;
    }
    
    // 3. Adicionar contexto de tela
    if (context?.visibleData) {
      contextualPrompt += processScreenContext(context, language);
    }
    
    // 4. Adicionar histórico completo formatado
    contextualPrompt += formatConversationHistory(
      sessionHistory, 
      userHistory, 
      extractedInfo, 
      language
    );
    
    // 5. Buscar dados do projeto e RAG
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
      console.log('Stats obtidas:', projectStats);
      
      // RAG
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
      
      // Adicionar métricas do projeto
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
    
    // 6. Adicionar resultados RAG
    if (ragResults && ragResults.length > 0) {
      contextualPrompt += formatRAGContext(ragResults, language);
    }
    
    // 7. System prompt aprimorado
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

INSTRUÇÕES CRÍTICAS DE MEMÓRIA:
1. SEMPRE considere TODO o histórico da conversa fornecido
2. Se o usuário se apresentou (nome, empresa, etc), SEMPRE lembre e use essas informações
3. Mantenha continuidade - referencie informações mencionadas anteriormente
4. Use os dados visíveis na tela quando disponíveis
5. Seja consistente com informações já discutidas
6. Para mensagens agendadas, mencione SEMPRE o número exato fornecido
7. Formate datas e horários de forma amigável (horário de Brasília)
8. NUNCA diga que não tem informações se elas foram mencionadas antes

VOCÊ DEVE DEMONSTRAR MEMÓRIA PERFEITA!

${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

CRITICAL MEMORY INSTRUCTIONS:
1. ALWAYS consider ALL conversation history provided
2. If the user introduced themselves (name, company, etc), ALWAYS remember and use this info
3. Maintain continuity - reference previously mentioned information
4. Use visible screen data when available
5. Be consistent with already discussed information
6. For scheduled messages, ALWAYS mention the exact number provided
7. Format dates and times in a friendly way (Brazil Time)
8. NEVER say you don't have information if it was mentioned before

YOU MUST DEMONSTRATE PERFECT MEMORY!

${contextualPrompt}`;

    // 8. Salvar pergunta
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      prompt,
      'user',
      { categories, language, hasScreenContext: !!context?.visibleData }
    );

    // 9. Gerar resposta
    const aiResponse = await generateResponse(
      systemPrompt, 
      prompt
    );

    // 10. Salvar resposta
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
        language: language,
        hadMemoryContext: sessionHistory.length > 0
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
          ragSearchTime: ragMetrics.searchTime,
          memoryItems: sessionHistory.length,
          hasUserInfo: !!extractedInfo.userName
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