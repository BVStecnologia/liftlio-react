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
 * v27 - Mantém compatibilidade v26
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
 * Sistema de Memória Aprimorado - v27
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
    topics?: string[];
  };
}

/**
 * Extrai informações importantes da conversa
 */
function extractUserInfo(history: any[]): any {
  const info: any = {};
  
  history.forEach(item => {
    const content = item.content.toLowerCase();
    
    // Extrair nome
    const nameMatch = content.match(/(?:meu nome é|me chamo|sou o?a?|i am|my name is)\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|,|$)/i);
    if (nameMatch && !info.userName) {
      info.userName = nameMatch[1].trim();
    }
    
    // Extrair empresa
    const companyMatch = content.match(/(?:trabalho na|empresa|company|work at|from)\s+([A-Za-z0-9À-ÿ\s&.-]+?)(?:\.|,|$)/i);
    if (companyMatch && !info.userCompany) {
      info.userCompany = companyMatch[1].trim();
    }
    
    // Extrair tópicos de interesse
    if (content.includes('interessad') || content.includes('interest')) {
      if (!info.topics) info.topics = [];
      info.topics.push(content);
    }
  });
  
  return info;
}

/**
 * Categoriza a pergunta para melhorar a busca
 */
function categorizeQuestion(question: string): string[] {
  const q = question.toLowerCase();
  const categories = [];
  
  if (q.match(/agendad|scheduled|program|próxim|next|quando|when/)) {
    categories.push('scheduled');
  }
  if (q.match(/menç|mention|citaç|cited/)) {
    categories.push('mentions');
  }
  if (q.match(/vídeo|video|canal|channel/)) {
    categories.push('videos');
  }
  if (q.match(/comentário|comment|resposta|reply/)) {
    categories.push('comments');
  }
  if (q.match(/sentiment|emoç|feeling|positiv|negativ/)) {
    categories.push('sentiment');
  }
  if (q.match(/estatística|métrica|número|quantos|how many|metric|statistic/)) {
    categories.push('statistics');
  }
  
  if (categories.length === 0) {
    categories.push('general');
  }
  
  return categories;
}

/**
 * Formata dados da tela visível
 */
function processScreenContext(context: any, language: 'pt' | 'en'): string {
  if (!context?.visibleData) return '';
  
  let screenContext = language === 'pt' 
    ? '\n\n## 📱 Dados Visíveis na Tela:\n'
    : '\n\n## 📱 Visible Screen Data:\n';
  
  const data = context.visibleData;
  
  // Channels info
  if (data.channelsCount !== undefined) {
    screenContext += language === 'pt'
      ? `- Canais: ${data.channelsCount} (${data.activeChannels || 0} ativos)\n`
      : `- Channels: ${data.channelsCount} (${data.activeChannels || 0} active)\n`;
  }
  
  // Videos info
  if (data.videosCount !== undefined) {
    screenContext += language === 'pt'
      ? `- Vídeos: ${data.videosCount}\n`
      : `- Videos: ${data.videosCount}\n`;
  }
  
  // Mentions info
  if (data.totalMentions !== undefined) {
    screenContext += language === 'pt'
      ? `- Total de menções: ${data.totalMentions}\n`
      : `- Total mentions: ${data.totalMentions}\n`;
  }
  
  if (data.todayMentions !== undefined) {
    screenContext += language === 'pt'
      ? `- Menções hoje: ${data.todayMentions}\n`
      : `- Mentions today: ${data.todayMentions}\n`;
  }
  
  // Keywords
  if (data.keywords && data.keywords.length > 0) {
    screenContext += language === 'pt'
      ? `- Palavras-chave: ${data.keywords.join(', ')}\n`
      : `- Keywords: ${data.keywords.join(', ')}\n`;
  }
  
  // Top channels
  if (data.topChannels && data.topChannels.length > 0) {
    screenContext += language === 'pt'
      ? `- Principais canais: ${data.topChannels.slice(0, 3).join(', ')}\n`
      : `- Top channels: ${data.topChannels.slice(0, 3).join(', ')}\n`;
  }
  
  return screenContext;
}

/**
 * Salva conversa no banco - v27
 * Com suporte para UUIDs e melhor tratamento de erros
 */
async function saveConversation(
  userId: string, 
  projectId: string | null, 
  sessionId: string, 
  content: string, 
  role: 'user' | 'assistant',
  metadata?: any
) {
  try {
    const validUserId = ensureValidUUID(userId);
    const validSessionId = ensureValidUUID(sessionId);
    
    const { data, error } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: validUserId,
        project_id: projectId ? parseInt(projectId) : null,
        session_id: validSessionId,
        role: role,
        content: content,
        metadata: metadata || {}
      })
      .select('id');
    
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
 * Busca contexto de conversas anteriores - v27
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
    const sessionQuery = supabase
      .from('agent_conversations')
      .select('*')
      .eq('session_id', validSessionId)
      .order('created_at', { ascending: true });
    
    if (projectId) {
      sessionQuery.eq('project_id', parseInt(projectId));
    }
    
    const { data: sessionHistory, error: sessionError } = await sessionQuery;
    
    if (sessionError) {
      console.error('Erro ao buscar histórico da sessão:', sessionError);
    }
    
    // 2. Buscar últimas conversas do usuário (contexto adicional)
    const userQuery = supabase
      .from('agent_conversations')
      .select('*')
      .eq('user_id', validUserId)
      .neq('session_id', validSessionId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (projectId) {
      userQuery.eq('project_id', parseInt(projectId));
    }
    
    const { data: userHistory, error: userError } = await userQuery;
    
    if (userError) {
      console.error('Erro ao buscar histórico do usuário:', userError);
    }
    
    // 3. Extrair informações importantes
    const allHistory = [...(sessionHistory || []), ...(userHistory || [])];
    const extractedInfo = extractUserInfo(allHistory);
    
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
 * Formata histórico para o prompt - MELHORADO v27
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
    } else {
      context += '\n## 👤 User Information:\n';
      if (extractedInfo.userName) context += `- Name: ${extractedInfo.userName}\n`;
      if (extractedInfo.userCompany) context += `- Company: ${extractedInfo.userCompany}\n`;
    }
  }
  
  // 2. Histórico completo da sessão atual
  if (sessionHistory.length > 0) {
    if (language === 'pt') {
      context += '\n## 💬 Conversa Atual:\n';
    } else {
      context += '\n## 💬 Current Conversation:\n';
    }
    
    sessionHistory.forEach(item => {
      const time = formatDateTimeBrazil(item.created_at, language);
      const role = item.role === 'user' ? 
        (language === 'pt' ? 'Usuário' : 'User') : 
        'Liftlio';
      context += `[${time}] ${role}: ${item.content}\n`;
    });
  }
  
  // 3. Contexto de conversas anteriores (resumido)
  if (userHistory.length > 0) {
    if (language === 'pt') {
      context += '\n## 🕐 Conversas Anteriores:\n';
    } else {
      context += '\n## 🕐 Previous Conversations:\n';
    }
    
    // Agrupar por data
    const byDate = userHistory.reduce((acc: any, item: any) => {
      const date = new Date(item.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
    
    Object.entries(byDate).slice(0, 3).forEach(([date, items]: [string, any]) => {
      context += `📅 ${date}: ${items.length} ${language === 'pt' ? 'mensagens' : 'messages'}\n`;
    });
  }
  
  return context;
}

/**
 * Busca estatísticas do projeto
 */
async function getProjectStats(projectId: string, currentPage: string | null) {
  try {
    const projectIdNumber = parseInt(projectId);
    
    // Buscar várias métricas em paralelo
    const [mentions, videos, channels, scheduled, todayMentions, topChannels] = await Promise.all([
      // Total de menções
      supabase
        .from('Mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectIdNumber),
      
      // Total de vídeos
      supabase.rpc('count_project_videos', { p_project_id: projectIdNumber }),
      
      // Total de canais
      supabase
        .from('Canais do youtube')
        .select('id', { count: 'exact', head: true })
        .eq('Projeto', projectIdNumber),
      
      // Mensagens agendadas
      supabase
        .from('Settings messages posts')
        .select('id', { count: 'exact', head: true })
        .eq('Projeto', projectIdNumber)
        .gte('proxima_postagem', new Date().toISOString()),
      
      // Menções de hoje
      supabase
        .from('Mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectIdNumber)
        .gte('created_at', new Date().toISOString().split('T')[0]),
      
      // Top canais
      supabase
        .from('mentions_led_brand')
        .select('channel_title, total_mentions')
        .eq('project_id', projectIdNumber)
        .order('total_mentions', { ascending: false })
        .limit(5)
    ]);
    
    console.log('Stats resultados:', {
      mentions: mentions.count,
      videos: videos.data,
      channels: channels.count,
      scheduled: scheduled.count,
      todayMentions: todayMentions.count
    });
    
    const topChannelsData = topChannels.data?.map((ch: any) => 
      `${ch.channel_title}: ${ch.total_mentions}`
    ) || [];
    
    return {
      totalMentions: mentions.count || 0,
      totalVideos: videos.data || 0,
      totalChannels: channels.count || 0,
      scheduledMessages: scheduled.count || 0,
      mentionsToday: todayMentions.count || 0,
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
    
    console.log('=== RAG v27 DEBUG ===');
    console.log('Prompt:', prompt);
    console.log('ProjectID:', projectIdNumber);
    console.log('Categories:', categories);
    
    // Gerar embedding do prompt
    const embeddingResponse = await supabase.functions.invoke('generate-embedding', {
      body: { text: prompt }
    });
    
    if (!embeddingResponse.data?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingResponse.error);
      return null;
    }
    
    // Buscar via função RPC melhorada
    const { data: ragResults, error: ragError } = await supabase.rpc('search_rag_enhanced', {
      p_query_embedding: embeddingResponse.data.embedding,
      p_project_id: projectIdNumber,
      p_search_text: prompt,
      p_categories: categories,
      p_limit: 20,
      p_min_similarity: 0.4
    });
    
    if (ragError) {
      console.error('Erro na busca RAG:', ragError);
      return null;
    }
    
    console.log(`RAG encontrou ${ragResults?.length || 0} resultados`);
    
    if (!ragResults || ragResults.length === 0) {
      return null;
    }
    
    // Formatar resultados
    const formattedResults = ragResults.map((result: any) => {
      return {
        content: result.content,
        source: result.source_table,
        similarity: result.similarity,
        metadata: result.metadata || {}
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
    'agent_conversations': language === 'pt' ? 'Conversas do Agente' : 'Agent Conversations',
    'Canais do youtube': language === 'pt' ? 'Canais do YouTube' : 'YouTube Channels',
    'Scanner de videos do youtube': language === 'pt' ? 'Scanner de Vídeos' : 'Video Scanner',
    'Integrações': language === 'pt' ? 'Integrações' : 'Integrations',
    'Notificacoes': language === 'pt' ? 'Notificações' : 'Notifications',
    'Projeto': language === 'pt' ? 'Projeto' : 'Project'
  };
  
  let context = language === 'pt' 
    ? '\n## 🔍 Dados Relevantes Encontrados:\n'
    : '\n## 🔍 Relevant Data Found:\n';
  
  // Agrupar por tipo de fonte
  const bySource = ragResults.reduce((acc: any, result: any) => {
    const source = tableTranslations[result.source] || result.source;
    if (!acc[source]) acc[source] = [];
    acc[source].push(result);
    return acc;
  }, {});
  
  Object.entries(bySource).forEach(([source, items]: [string, any]) => {
    context += `\n### ${source} (${items.length}):\n`;
    items.slice(0, 5).forEach((item: any) => {
      const preview = item.content.substring(0, 200);
      context += `- ${preview}${item.content.length > 200 ? '...' : ''}\n`;
    });
  });
  
  return context;
}

/**
 * Gera resposta usando Claude - v27 com melhor tratamento de erros
 */
async function generateResponse(systemPrompt: string, userPrompt: string) {
  try {
    // Verificar se a API key existe
    if (!claudeApiKey || claudeApiKey === 'undefined') {
      console.error('CLAUDE_API_KEY não configurada');
      throw new Error('Claude API key not configured');
    }

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
    console.log('=== AGENTE v27 ERROR FIX ===');
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
9. Responda SEMPRE em português quando o usuário falar português

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
9. ALWAYS respond in English when the user speaks English

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

    // 9. Gerar resposta com tratamento de erro melhorado
    let aiResponse;
    try {
      aiResponse = await generateResponse(
        systemPrompt, 
        prompt
      );
    } catch (error) {
      console.error('Erro ao chamar Claude:', error);
      
      // Resposta de fallback em caso de erro
      if (language === 'pt') {
        aiResponse = "Desculpe, estou com dificuldades para processar sua solicitação no momento. Por favor, tente novamente em alguns instantes.";
      } else {
        aiResponse = "I apologize, but I'm having trouble processing your request at the moment. Please try again in a few moments.";
      }
    }

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
        metadata: {
          ragSearched: ragMetrics.searched,
          ragResults: ragMetrics.resultsCount,
          categories: categories,
          language: language,
          sessionContinued: sessionHistory.length > 0
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
    
    // Resposta de erro mais amigável
    const errorMessage = error.message || 'An unexpected error occurred';
    const language = 'pt'; // Default para português
    
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred',
        response: language === 'pt' 
          ? "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
          : "Sorry, an error occurred while processing your request. Please try again.",
        details: errorMessage 
      }),
      { 
        status: 200, // Retornar 200 para o frontend tratar
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});