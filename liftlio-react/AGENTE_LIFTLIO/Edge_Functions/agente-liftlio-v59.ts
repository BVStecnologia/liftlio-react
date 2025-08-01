/**
 * Edge Function: Agente Liftlio v59
 * 
 * Assistente AI do Liftlio com formatação melhorada de respostas
 * 
 * MELHORIAS v59:
 * - Formatação melhorada sem usar ### para melhor legibilidade
 * - Quebras de linha adequadas entre seções
 * - Uso consistente de negrito e listas
 * - Instruções específicas no system prompt sobre formatação
 * - Emojis para categorizar visualmente as informações
 * 
 * Baseado no v32 (v58 em produção) com melhorias de formatação
 * 
 * DEPLOYED: v66 em produção (23/01/2025)
 * 
 * JSON de teste:
 *{
  "prompt": "mostre os agendamentos",
  "context": {
    "currentProject": {
      "id": "58",
      "name": "HW"
    }
  },
  "userId": "test-user",
  "sessionId": "test-session"
}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Detecta o idioma da mensagem
 */
function detectLanguage(text: string): 'pt' | 'en' {
  const ptPatterns = /\b(olá|oi|obrigad|por favor|você|está|são|com|para|mais|pode|ajud|precis|quero|saber|fazer|tem|ter|qual|quais|quando|onde|como|quanto|quantas|agendad|bom dia|boa tarde|boa noite|hoje|ontem|postag|postou|feitas?|foram)\b/i;
  const enPatterns = /\b(hello|hi|thanks|please|you|are|is|with|for|more|can|help|need|want|know|make|have|has|what|which|when|where|how|much|many|good morning|good afternoon|good evening|today|yesterday|post|posted|scheduled)\b/i;
  
  const ptMatches = (text.match(ptPatterns) || []).length;
  const enMatches = (text.match(enPatterns) || []).length;
  
  return ptMatches > enMatches ? 'pt' : 'en';
}

/**
 * Formata data/hora com timezone dinâmico
 */
function formatDateTime(dateString: string, language: 'pt' | 'en', timezone = 'America/Sao_Paulo'): string {
  try {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    // Ajustar locale baseado no timezone
    let locale = language === 'pt' ? 'pt-BR' : 'en-US';
    if (timezone.includes('Europe')) {
      locale = language === 'pt' ? 'pt-PT' : 'en-GB';
    } else if (timezone.includes('Asia')) {
      locale = language === 'pt' ? 'pt-BR' : 'en-IN';
    }
    
    return date.toLocaleString(locale, options);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

/**
 * Converte string para UUID válido ou gera novo
 */
function ensureValidUUID(value?: string): string {
  if (!value) {
    return uuidv4();
  }
  
  // Regex para validar UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(value)) {
    return value.toLowerCase();
  }
  
  // Se não for um UUID válido, gerar um novo baseado no hash da string
  const hash = Array.from(value).reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
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
 * Extrai informações importantes da conversa
 */
function extractUserInfo(history: any[]): any {
  const info: any = {};
  
  history.forEach(item => {
    const content = (item.message || '').toLowerCase();
    
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
  const categories: string[] = [];
  
  // v33: Detectar pedidos para listar TODOS os canais
  if (q.match(/liste todos os canais|list all channels|todos os canais monitorados|all monitored channels|quais são todos os canais|what are all the channels/)) {
    categories.push('list_all_channels');
    categories.push('channels');
  }
  
  // v32: Detectar perguntas sobre postagens de hoje/ontem
  if (q.match(/hoje|today|postagens de hoje|posts today|postou hoje|posted today/)) {
    categories.push('posts_today');
  }
  
  if (q.match(/ontem|yesterday|postagens de ontem|posts yesterday|postou ontem|posted yesterday/)) {
    categories.push('posts_yesterday');
  }
  
  // Detectar perguntas sobre histórico
  if (q.match(/primeira pergunta|primeira vez|o que perguntei|histórico|conversa anterior|última pergunta/)) {
    categories.push('history');
  }
  
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
 * v32: Busca postagens por data específica
 */
async function getPostsByDate(projectId: string, date: 'today' | 'yesterday', timezone: string, language: 'pt' | 'en') {
  try {
    const projectIdNumber = parseInt(projectId);
    
    // Calcular a data baseada no timezone do usuário
    const now = new Date();
    const offset = date === 'yesterday' ? -1 : 0;
    
    // Query para buscar postagens do dia
    const { data, error } = await supabase
      .from('Settings messages posts')
      .select(`
        id,
        created_at,
        postado,
        proxima_postagem,
        status,
        tipo_msg,
        Mensagens(
          id,
          mensagem
        ),
        Videos(
          id,
          video_title,
          VIDEO
        )
      `)
      .eq('Projeto', projectIdNumber)
      .or(`postado.gte.${new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).toISOString()}.and.postado.lt.${new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + 1).toISOString()},proxima_postagem.gte.${new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).toISOString()}.and.proxima_postagem.lt.${new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + 1).toISOString()}`)
      .order('postado', { ascending: false, nullsFirst: false })
      .order('proxima_postagem', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar postagens:', error);
      return null;
    }
    
    // Formatar resultados
    const formattedPosts = data?.map(post => {
      const postTime = post.postado || post.proxima_postagem;
      const formattedTime = formatDateTime(postTime, language, timezone);
      const status = post.status === 'posted' 
        ? (language === 'pt' ? 'Postada' : 'Posted')
        : (language === 'pt' ? 'Agendada' : 'Scheduled');
      
      return {
        id: post.id,
        time: formattedTime,
        status: status,
        message: post.Mensagens?.mensagem || '',
        video: post.Videos ? {
          title: post.Videos.video_title,
          url: post.Videos.VIDEO
        } : null
      };
    }) || [];
    
    return formattedPosts;
  } catch (error) {
    console.error('Erro ao buscar postagens por data:', error);
    return null;
  }
}

/**
 * Formata dados da tela visível
 */
function processScreenContext(context: any, language: 'pt' | 'en'): string {
  if (!context?.visibleData) return '';
  
  let screenContext = language === 'pt' 
    ? '\n\n📱 **Dados Visíveis na Tela:**\n'
    : '\n\n📱 **Visible Screen Data:**\n';
  
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
 * Salva conversa no banco
 */
async function saveConversation(userId: string, projectId: string | null, sessionId: string, content: string, role: 'user' | 'assistant', metadata?: any) {
  try {
    const validUserId = ensureValidUUID(userId);
    const validSessionId = ensureValidUUID(sessionId);
    
    const { data, error } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: validUserId,
        project_id: projectId ? parseInt(projectId) : null,
        session_id: validSessionId,
        message_type: role,
        message: content,
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
 * Busca contexto de conversas anteriores
 */
async function getConversationContext(userId: string, projectId: string | null, sessionId: string, timezone: string) {
  try {
    const validUserId = ensureValidUUID(userId);
    const validSessionId = ensureValidUUID(sessionId);
    
    console.log('Buscando contexto:', {
      userId: validUserId,
      sessionId: validSessionId,
      projectId,
      timezone
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
    return {
      sessionHistory: [],
      userHistory: [],
      extractedInfo: {}
    };
  }
}

/**
 * Formata histórico para o prompt
 */
function formatConversationHistory(sessionHistory: any[], userHistory: any[], extractedInfo: any, language: 'pt' | 'en', timezone: string): string {
  let context = '';
  
  // 1. Informações do usuário extraídas
  if (extractedInfo.userName || extractedInfo.userCompany) {
    if (language === 'pt') {
      context += '\n\n👤 **Informações do Usuário:**\n';
      if (extractedInfo.userName) context += `- Nome: ${extractedInfo.userName}\n`;
      if (extractedInfo.userCompany) context += `- Empresa: ${extractedInfo.userCompany}\n`;
    } else {
      context += '\n\n👤 **User Information:**\n';
      if (extractedInfo.userName) context += `- Name: ${extractedInfo.userName}\n`;
      if (extractedInfo.userCompany) context += `- Company: ${extractedInfo.userCompany}\n`;
    }
  }
  
  // 2. Histórico completo da sessão atual
  if (sessionHistory.length > 0) {
    if (language === 'pt') {
      context += '\n\n💬 **Conversa Atual:**\n';
    } else {
      context += '\n\n💬 **Current Conversation:**\n';
    }
    
    sessionHistory.forEach(item => {
      const time = formatDateTime(item.created_at, language, timezone);
      const role = item.message_type === 'user'
        ? (language === 'pt' ? 'Usuário' : 'User')
        : 'Liftlio';
      
      context += `[${time}] ${role}: ${item.message}\n`;
    });
  }
  
  // 3. Contexto de conversas anteriores (resumido)
  if (userHistory.length > 0) {
    if (language === 'pt') {
      context += '\n\n🕐 **Conversas Anteriores:**\n';
    } else {
      context += '\n\n🕐 **Previous Conversations:**\n';
    }
    
    // Agrupar por data
    const byDate = userHistory.reduce((acc, item) => {
      const date = new Date(item.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(byDate).slice(0, 3).forEach(([date, items]) => {
      context += `📅 ${date}: ${items.length} ${language === 'pt' ? 'mensagens' : 'messages'}\n`;
    });
  }
  
  return context;
}

/**
 * Busca estatísticas do projeto
 */
async function getProjectStats(projectId: string, currentPage?: string) {
  try {
    const projectIdNumber = parseInt(projectId);
    
    const { data, error } = await supabase.rpc('get_complete_project_stats', {
      p_project_id: projectIdNumber
    });
    
    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
    
    console.log('Stats obtidas:', data);
    
    return {
      totalMentions: data.total_mentions || 0,
      postedMentions: data.posted_mentions || 0,
      totalVideos: data.videos_monitored || 0,
      totalChannels: data.active_channels || 0,
      scheduledMessages: data.scheduled_mentions || 0,
      mentionsToday: data.mentions_today || 0,
      topChannels: data.top_channels?.map((ch: any) => `${ch.channel_name}: ${ch.subscriber_count}`) || [],
      lastUpdated: data.last_updated || new Date().toISOString(),
      currentPage: currentPage || 'unknown',
      totalMessages: data.total_messages || 0,
      totalVideosInSystem: data.total_videos || 0,
      keywords: data.scanner_stats?.keywords || []
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

/**
 * Busca RAG otimizada via RPC backend
 */
async function searchProjectDataBackend(prompt: string, projectId: string, categories: string[], language: 'pt' | 'en', timezone: string) {
  try {
    const projectIdNumber = parseInt(projectId);
    
    console.log('=== RAG v32 DEBUG ===');
    console.log('Prompt:', prompt);
    console.log('ProjectID:', projectIdNumber);
    console.log('Categories:', categories);
    
    // Para perguntas sobre histórico, buscar conversas antigas
    if (categories.includes('history')) {
      const { data: conversations, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('project_id', projectIdNumber)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (!error && conversations && conversations.length > 0) {
        return conversations.map(conv => ({
          content: `[${formatDateTime(conv.created_at, language, timezone)}] ${conv.message_type === 'user' ? 'Pergunta' : 'Resposta'}: ${conv.message}`,
          source: 'agent_conversations',
          similarity: 0.9,
          metadata: { conversation_id: conv.id }
        }));
      }
    }
    
    // Gerar embedding do prompt
    const embeddingResponse = await supabase.functions.invoke('generate-embedding', {
      body: { text: prompt }
    });
    
    if (!embeddingResponse.data?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingResponse.error);
      return null;
    }
    
    // Usar função search_rag_for_agent
    const minSimilarity = categories.includes('general') ? 0.2 : 0.4;
    
    const { data: ragResults, error: ragError } = await supabase.rpc('search_rag_for_agent', {
      p_query_embedding: embeddingResponse.data.embedding,
      p_project_id: projectIdNumber,
      p_search_text: prompt,
      p_categories: categories.includes('general') ? null : categories,
      p_limit: 20,
      p_min_similarity: minSimilarity
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
  
  const tableTranslations: Record<string, string> = {
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
    ? '\n\n🔍 **DADOS ENCONTRADOS NO SISTEMA:**\n'
    : '\n\n🔍 **DATA FOUND IN THE SYSTEM:**\n';
  
  // Agrupar por tipo de fonte
  const bySource = ragResults.reduce((acc, result) => {
    const source = tableTranslations[result.source] || result.source;
    if (!acc[source]) acc[source] = [];
    acc[source].push(result);
    return acc;
  }, {} as Record<string, any[]>);
  
  Object.entries(bySource).forEach(([source, items]) => {
    context += `\n**${source} (${items.length} registros):**\n`;
    
    items.forEach((item, index) => {
      context += `\n**Registro ${index + 1}:**\n`;
      context += `${item.content}\n`;
      context += `---\n`;
    });
  });
  
  return context;
}

/**
 * v32: Formata postagens por data
 */
function formatPostsByDate(posts: any[], date: 'today' | 'yesterday', language: 'pt' | 'en'): string {
  if (!posts || posts.length === 0) {
    return language === 'pt' 
      ? `\n\n📅 **Nenhuma postagem ${date === 'today' ? 'hoje' : 'ontem'}.**\n`
      : `\n\n📅 **No posts ${date}.**\n`;
  }
  
  const dateLabel = date === 'today' 
    ? (language === 'pt' ? 'HOJE' : 'TODAY')
    : (language === 'pt' ? 'ONTEM' : 'YESTERDAY');
  
  let context = language === 'pt'
    ? `\n\n📅 **POSTAGENS DE ${dateLabel}:**\n`
    : `\n\n📅 **POSTS FROM ${dateLabel}:**\n`;
  
  // Separar postadas e agendadas
  const posted = posts.filter(p => p.status === (language === 'pt' ? 'Postada' : 'Posted'));
  const scheduled = posts.filter(p => p.status === (language === 'pt' ? 'Agendada' : 'Scheduled'));
  
  if (posted.length > 0) {
    context += language === 'pt' ? '\n**✅ Postadas:**\n' : '\n**✅ Posted:**\n';
    posted.forEach((post, index) => {
      context += `\n${index + 1}. **${post.time}**\n`;
      context += `   📝 ${post.message}\n`;
      if (post.video) {
        context += `   🎥 Vídeo: ${post.video.title}\n`;
        context += `   🔗 ${post.video.url}\n`;
      }
    });
  }
  
  if (scheduled.length > 0) {
    context += language === 'pt' ? '\n**⏰ Agendadas:**\n' : '\n**⏰ Scheduled:**\n';
    scheduled.forEach((post, index) => {
      context += `\n${index + 1}. **${post.time}**\n`;
      context += `   📝 ${post.message}\n`;
      if (post.video) {
        context += `   🎥 Vídeo: ${post.video.title}\n`;
        context += `   🔗 ${post.video.url}\n`;
      }
    });
  }
  
  context += language === 'pt' 
    ? `\n**Total: ${posts.length} postagens**\n`
    : `\n**Total: ${posts.length} posts**\n`;
  
  return context;
}

/**
 * Lista ferramentas disponíveis da tabela agent_tools
 */
async function getAvailableTools(projectId?: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('agent_tools')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar ferramentas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar ferramentas:', error);
    return [];
  }
}

/**
 * Executa uma ferramenta RPC
 */
async function executeRPCTool(toolName: string, projectId: string, params?: any): Promise<any> {
  try {
    console.log(`Executando RPC: ${toolName} com projeto ${projectId}`);
    
    // Parâmetros específicos por ferramenta
    let rpcParams: any = { p_project_id: parseInt(projectId) };
    
    // Adicionar parâmetros extras se necessário
    if (toolName === 'optimal_posting_schedule' && params?.days_back) {
      rpcParams.p_days_back = params.days_back;
    }
    
    const { data, error } = await supabase.rpc(toolName, rpcParams);
    
    if (error) {
      console.error(`Erro ao executar RPC ${toolName}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao executar RPC ${toolName}:`, error);
    return null;
  }
}

/**
 * Seleciona ferramentas baseado no prompt
 */
async function selectTools(prompt: string, categories: string[], availableTools: any[]): Promise<any[]> {
  const selectedTools: any[] = [];
  const promptLower = prompt.toLowerCase();
  
  // v33: Lógica específica para seleção de ferramentas
  
  // 1. Se pediu TODOS os canais, usar list_all_channels
  if (categories.includes('list_all_channels') || 
      promptLower.match(/liste todos os canais|list all channels|todos os canais monitorados|all monitored channels/)) {
    const listAllChannelsTool = availableTools.find(t => t.name === 'list_all_channels');
    if (listAllChannelsTool) {
      selectedTools.push(listAllChannelsTool);
      return selectedTools; // Retorna apenas esta ferramenta
    }
  }
  
  // 2. Análise de performance de canal
  if (promptLower.match(/performance do canal|channel performance|análise do canal|analyze channel/)) {
    const channelTool = availableTools.find(t => t.name === 'channel_performance_analysis');
    if (channelTool) selectedTools.push(channelTool);
  }
  
  // 3. Métricas de engajamento de vídeo
  if (promptLower.match(/engajamento do vídeo|video engagement|métricas do vídeo|video metrics/)) {
    const videoTool = availableTools.find(t => t.name === 'video_engagement_metrics');
    if (videoTool) selectedTools.push(videoTool);
  }
  
  // 4. Melhor horário para postar
  if (promptLower.match(/melhor horário|best time|quando postar|when to post|horário ideal|optimal time/)) {
    const scheduleTool = availableTools.find(t => t.name === 'optimal_posting_schedule');
    if (scheduleTool) selectedTools.push(scheduleTool);
  }
  
  // 5. Estatísticas gerais do projeto
  if (categories.includes('statistics') || promptLower.match(/estatísticas|statistics|métricas|metrics/)) {
    const statsTool = availableTools.find(t => t.name === 'project_stats');
    if (statsTool) selectedTools.push(statsTool);
  }
  
  return selectedTools;
}

/**
 * Formata resultado de ferramenta RPC
 */
function formatRPCResult(toolName: string, result: any, language: 'pt' | 'en'): string {
  if (!result || (Array.isArray(result) && result.length === 0)) {
    return language === 'pt' 
      ? `\n\n🔧 **Nenhum resultado encontrado para ${toolName}**\n`
      : `\n\n🔧 **No results found for ${toolName}**\n`;
  }
  
  let formatted = '';
  
  switch(toolName) {
    case 'list_all_channels':
      if (language === 'pt') {
        formatted = `\n\n📺 **TODOS OS CANAIS MONITORADOS:**\n\n`;
        const byCategory: Record<string, any[]> = {};
        
        // Agrupar por categoria
        result.forEach((channel: any) => {
          const category = channel.channel_category || 'Outros';
          if (!byCategory[category]) byCategory[category] = [];
          byCategory[category].push(channel);
        });
        
        // Listar por categoria
        Object.entries(byCategory).forEach(([category, channels]) => {
          formatted += `\n**${category}:**\n`;
          channels.forEach((ch: any, idx: number) => {
            formatted += `${idx + 1}. **${ch.channel_name}** - ${ch.subscriber_count.toLocaleString('pt-BR')} inscritos\n`;
            formatted += `   - Status: ${ch.is_active ? '✅ Ativo' : '❌ Inativo'}\n`;
            formatted += `   - Vídeos: ${ch.total_videos} (${ch.monitored_videos} monitorados)\n`;
            formatted += `   - Posts: ${ch.total_posts} (${ch.posts_responded} respondidos)\n`;
            formatted += `   - Lead Score médio: ${ch.avg_lead_score}\n`;
            if (ch.last_video_date) {
              formatted += `   - Último vídeo: ${new Date(ch.last_video_date).toLocaleDateString('pt-BR')}\n`;
            }
            formatted += `\n`;
          });
        });
        
        formatted += `\n**Total: ${result.length} canais monitorados**\n`;
      } else {
        formatted = `\n\n📺 **ALL MONITORED CHANNELS:**\n\n`;
        const byCategory: Record<string, any[]> = {};
        
        // Group by category
        result.forEach((channel: any) => {
          const category = channel.channel_category || 'Others';
          if (!byCategory[category]) byCategory[category] = [];
          byCategory[category].push(channel);
        });
        
        // List by category
        Object.entries(byCategory).forEach(([category, channels]) => {
          formatted += `\n**${category}:**\n`;
          channels.forEach((ch: any, idx: number) => {
            formatted += `${idx + 1}. **${ch.channel_name}** - ${ch.subscriber_count.toLocaleString('en-US')} subscribers\n`;
            formatted += `   - Status: ${ch.is_active ? '✅ Active' : '❌ Inactive'}\n`;
            formatted += `   - Videos: ${ch.total_videos} (${ch.monitored_videos} monitored)\n`;
            formatted += `   - Posts: ${ch.total_posts} (${ch.posts_responded} responded)\n`;
            formatted += `   - Average Lead Score: ${ch.avg_lead_score}\n`;
            if (ch.last_video_date) {
              formatted += `   - Last video: ${new Date(ch.last_video_date).toLocaleDateString('en-US')}\n`;
            }
            formatted += `\n`;
          });
        });
        
        formatted += `\n**Total: ${result.length} monitored channels**\n`;
      }
      break;
      
    case 'channel_performance_analysis':
      // Formato similar para outras ferramentas...
      formatted = language === 'pt'
        ? `\n\n📊 **Análise de Performance dos Canais:**\n`
        : `\n\n📊 **Channel Performance Analysis:**\n`;
      break;
      
    default:
      // Formato genérico
      formatted = `\n\n🔧 **${toolName} results:**\n`;
      formatted += '```json\n' + JSON.stringify(result, null, 2) + '\n```\n';
  }
  
  return formatted;
}

/**
 * Gera resposta usando Claude
 */
async function generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
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
        messages: [{
          role: 'user',
          content: userPrompt
        }],
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const { prompt, context, userId, sessionId } = await req.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Capturar timezone do contexto
    const userTimezone = context?.userTimezone || 'America/Sao_Paulo';
    const language = detectLanguage(prompt);
    const currentSessionId = ensureValidUUID(sessionId);
    const categories = categorizeQuestion(prompt);
    
    // Log para debug
    console.log('=== AGENTE v32 - POSTS BY DATE ===');
    console.log('Prompt:', prompt);
    console.log('SessionID:', currentSessionId);
    console.log('Categorias:', categories);
    console.log('Timezone:', userTimezone);
    
    // 1. Buscar histórico completo e informações extraídas
    const { sessionHistory, userHistory, extractedInfo } = await getConversationContext(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      userTimezone
    );
    
    console.log('Histórico da sessão:', sessionHistory.length, 'mensagens');
    
    // 2. Construir contexto completo
    let contextualPrompt = '';
    const currentPage = context?.currentPage || null;
    
    // Adicionar informações de timezone e hora atual
    const currentTime = formatDateTime(new Date().toISOString(), language, userTimezone);
    if (language === 'pt') {
      contextualPrompt += `\n\n⏰ **Informações de Tempo:**\n`;
      contextualPrompt += `- Timezone: ${userTimezone}\n`;
      contextualPrompt += `- Horário atual: ${currentTime}\n`;
    } else {
      contextualPrompt += `\n\n⏰ **Time Information:**\n`;
      contextualPrompt += `- Timezone: ${userTimezone}\n`;
      contextualPrompt += `- Current time: ${currentTime}\n`;
    }
    
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
      language,
      userTimezone
    );
    
    // 5. Buscar dados do projeto
    let projectStats = null;
    let ragResults = null;
    let todayPosts = null;
    let yesterdayPosts = null;
    let toolResults: any[] = [];
    let ragMetrics = {
      searched: false,
      resultsCount: 0,
      searchTime: 0
    };
    
    if (context?.currentProject?.id) {
      // v33: Buscar e executar ferramentas RPC
      const availableTools = await getAvailableTools(context.currentProject.id);
      const selectedTools = await selectTools(prompt, categories, availableTools);
      
      console.log('=== FERRAMENTAS v33 ===');
      console.log('Ferramentas disponíveis:', availableTools.map(t => t.name));
      console.log('Ferramentas selecionadas:', selectedTools.map(t => t.name));
      
      // Executar ferramentas selecionadas
      for (const tool of selectedTools) {
        if (tool.type === 'rpc') {
          const result = await executeRPCTool(tool.name, context.currentProject.id);
          if (result) {
            toolResults.push({
              toolName: tool.name,
              toolDescription: tool.description,
              result: result
            });
          }
        }
      }
      
      // Estatísticas (sempre buscar, exceto se já temos via tool)
      if (!selectedTools.find(t => t.name === 'project_stats')) {
        projectStats = await getProjectStats(context.currentProject.id, currentPage);
        console.log('Stats obtidas:', projectStats);
      }
      
      // v32: Buscar postagens de hoje/ontem se necessário
      if (categories.includes('posts_today')) {
        todayPosts = await getPostsByDate(
          context.currentProject.id, 
          'today', 
          userTimezone, 
          language
        );
        console.log('Postagens de hoje:', todayPosts?.length || 0);
      }
      
      if (categories.includes('posts_yesterday')) {
        yesterdayPosts = await getPostsByDate(
          context.currentProject.id, 
          'yesterday', 
          userTimezone, 
          language
        );
        console.log('Postagens de ontem:', yesterdayPosts?.length || 0);
      }
      
      // RAG para outras buscas (não fazer se já temos dados de ferramentas específicas)
      if (!categories.includes('posts_today') && 
          !categories.includes('posts_yesterday') && 
          !categories.includes('list_all_channels') &&
          toolResults.length === 0) {
        const startTime = Date.now();
        ragMetrics.searched = true;
        
        ragResults = await searchProjectDataBackend(
          prompt,
          context.currentProject.id,
          categories,
          language,
          userTimezone
        );
        
        ragMetrics.searchTime = Date.now() - startTime;
        ragMetrics.resultsCount = ragResults?.length || 0;
        console.log('RAG métricas:', ragMetrics);
      }
      
      // Adicionar métricas do projeto
      if (projectStats) {
        if (language === 'pt') {
          contextualPrompt += `\n\n📊 **MÉTRICAS OFICIAIS DO PROJETO "${context.currentProject.name || 'HW'}":**\n`;
          contextualPrompt += `- Total de menções no sistema: ${projectStats.totalMentions}\n`;
          contextualPrompt += `- Menções já postadas: ${projectStats.postedMentions}\n`;
          contextualPrompt += `- Canais alcançados: ${projectStats.totalChannels}\n`;
          contextualPrompt += `- Vídeos monitorados: ${projectStats.totalVideos}\n`;
          contextualPrompt += `- **MENSAGENS AGENDADAS FUTURAS: ${projectStats.scheduledMessages}**\n`;
          contextualPrompt += `- Menções hoje: ${projectStats.mentionsToday}\n`;
          contextualPrompt += `- Total de mensagens: ${projectStats.totalMessages}\n`;
          contextualPrompt += `- Total de vídeos no sistema: ${projectStats.totalVideosInSystem}`;
        } else {
          contextualPrompt += `\n\n📊 **OFFICIAL PROJECT METRICS for "${context.currentProject.name || 'HW'}":**\n`;
          contextualPrompt += `- Total mentions in system: ${projectStats.totalMentions}\n`;
          contextualPrompt += `- Posted mentions: ${projectStats.postedMentions}\n`;
          contextualPrompt += `- Channels reached: ${projectStats.totalChannels}\n`;
          contextualPrompt += `- Videos monitored: ${projectStats.totalVideos}\n`;
          contextualPrompt += `- **FUTURE SCHEDULED MESSAGES: ${projectStats.scheduledMessages}**\n`;
          contextualPrompt += `- Mentions today: ${projectStats.mentionsToday}\n`;
          contextualPrompt += `- Total messages: ${projectStats.totalMessages}\n`;
          contextualPrompt += `- Total videos in system: ${projectStats.totalVideosInSystem}`;
        }
      }
    }
    
    // 6. Adicionar postagens de hoje/ontem se buscadas
    if (todayPosts) {
      contextualPrompt += formatPostsByDate(todayPosts, 'today', language);
    }
    
    if (yesterdayPosts) {
      contextualPrompt += formatPostsByDate(yesterdayPosts, 'yesterday', language);
    }
    
    // 7. Adicionar resultados de ferramentas RPC
    if (toolResults.length > 0) {
      toolResults.forEach(toolResult => {
        contextualPrompt += formatRPCResult(
          toolResult.toolName,
          toolResult.result,
          language
        );
      });
    }
    
    // 8. Adicionar resultados RAG se houver
    if (ragResults && ragResults.length > 0) {
      contextualPrompt += formatRAGContext(ragResults, language);
    }
    
    // 9. System prompt v59 com regras de formatação
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

REGRAS CRÍTICAS (ORDEM DE PRIORIDADE):

1. Para LISTAR TODOS OS CANAIS - use SEMPRE a seção "TODOS OS CANAIS MONITORADOS"
   - Se o usuário pedir "liste todos os canais" → Use os dados completos dessa seção
   - NÃO invente canais ou use apenas os top 5 das métricas
   - Mostre TODOS os canais com suas estatísticas completas

2. Para QUANTIDADES, NÚMEROS ou CONTAGENS - use SEMPRE as "MÉTRICAS OFICIAIS DO PROJETO"
   - Quantas mensagens agendadas? → Use "MENSAGENS AGENDADAS FUTURAS" das MÉTRICAS OFICIAIS
   - Quantas mensagens postadas? → Use "Menções já postadas" das MÉTRICAS OFICIAIS
   - Quantos vídeos/canais/menções? → Use os números das MÉTRICAS OFICIAIS
   - NÃO conte registros do RAG para responder sobre quantidades

3. Para POSTAGENS DE HOJE/ONTEM - use as seções "POSTAGENS DE HOJE" ou "POSTAGENS DE ONTEM"
   - Estas seções já têm todas as postagens formatadas por horário
   - Mostre claramente quais foram postadas e quais estão agendadas
   - Inclua o conteúdo das mensagens e informações dos vídeos

4. Para DETALHES ou CONTEÚDO - use os "DADOS ENCONTRADOS NO SISTEMA" (RAG)
   - Quais mensagens estão agendadas? → Liste do RAG
   - O que dizem os comentários? → Mostre conteúdo do RAG
   
5. Use APENAS os dados fornecidos no contexto
6. Se não tiver informação, diga que não tem acesso
7. Seja preciso e direto nas respostas
8. Mantenha continuidade da conversa
9. Sempre considere o timezone do usuário ao mencionar horários

REGRAS DE FORMATAÇÃO (IMPORTANTE):
- NUNCA use ### para títulos ou seções
- Use **texto em negrito** para destacar informações importantes
- Separe seções com quebras de linha duplas
- Use listas numeradas (1., 2., 3.) ou com bullet points (•) 
- Para categorias/seções, use: **Nome da Seção:**
- Exemplo correto:
  **Canais Ativos:**
  
  • Canal 1 - descrição
  • Canal 2 - descrição
  
  **Estatísticas:**
  
  1. Total de vídeos: 100
  2. Menções postadas: 50

${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

CRITICAL RULES (PRIORITY ORDER):

1. To LIST ALL CHANNELS - ALWAYS use the "ALL MONITORED CHANNELS" section
   - If user asks "list all channels" → Use complete data from this section
   - DO NOT make up channels or use only top 5 from metrics
   - Show ALL channels with their complete statistics

2. For QUANTITIES, NUMBERS or COUNTS - ALWAYS use "OFFICIAL PROJECT METRICS"
   - How many scheduled messages? → Use "FUTURE SCHEDULED MESSAGES" from OFFICIAL METRICS
   - How many posted messages? → Use "Posted mentions" from OFFICIAL METRICS
   - How many videos/channels/mentions? → Use numbers from OFFICIAL METRICS
   - DO NOT count RAG records to answer about quantities

3. For TODAY/YESTERDAY POSTS - use "POSTS FROM TODAY" or "POSTS FROM YESTERDAY" sections
   - These sections already have all posts formatted by time
   - Clearly show which were posted and which are scheduled
   - Include message content and video information

4. For DETAILS or CONTENT - use "DATA FOUND IN THE SYSTEM" (RAG)
   - What messages are scheduled? → List from RAG
   - What do the comments say? → Show content from RAG
   
5. Use ONLY the data provided in the context
6. If you don't have information, say you don't have access
7. Be precise and direct in responses
8. Maintain conversation continuity
9. Always consider the user's timezone when mentioning times

FORMATTING RULES (IMPORTANT):
- NEVER use ### for titles or sections
- Use **bold text** to highlight important information
- Separate sections with double line breaks
- Use numbered lists (1., 2., 3.) or bullet points (•)
- For categories/sections, use: **Section Name:**
- Correct example:
  **Active Channels:**
  
  • Channel 1 - description
  • Channel 2 - description
  
  **Statistics:**
  
  1. Total videos: 100
  2. Posted mentions: 50

${contextualPrompt}`;
    
    // 10. Salvar pergunta
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      prompt,
      'user',
      {
        categories,
        language,
        hasScreenContext: !!context?.visibleData,
        timezone: userTimezone,
        searchedToday: categories.includes('posts_today'),
        searchedYesterday: categories.includes('posts_yesterday'),
        toolsUsed: toolResults.map(t => t.toolName)
      }
    );
    
    // 11. Gerar resposta
    let aiResponse: string;
    try {
      aiResponse = await generateResponse(systemPrompt, prompt);
    } catch (error) {
      console.error('Erro ao chamar Claude:', error);
      
      // Resposta de fallback em caso de erro
      if (language === 'pt') {
        aiResponse = "Desculpe, estou com dificuldades para processar sua solicitação no momento. Por favor, tente novamente em alguns instantes.";
      } else {
        aiResponse = "I apologize, but I'm having trouble processing your request at the moment. Please try again in a few moments.";
      }
    }
    
    // 12. Salvar resposta
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
        hadMemoryContext: sessionHistory.length > 0,
        timezone: userTimezone,
        todayPostsCount: todayPosts?.length || 0,
        yesterdayPostsCount: yesterdayPosts?.length || 0,
        toolsUsed: toolResults.map(t => t.toolName),
        toolResultsCount: toolResults.length
      }
    );
    
    return new Response(JSON.stringify({
      response: aiResponse,
      metadata: {
        ragSearched: ragMetrics.searched,
        ragResults: ragMetrics.resultsCount,
        categories: categories,
        language: language,
        sessionContinued: sessionHistory.length > 0,
        timezone: userTimezone,
        todayPostsSearched: categories.includes('posts_today'),
        yesterdayPostsSearched: categories.includes('posts_yesterday'),
        toolsUsed: toolResults.map(t => t.toolName)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Erro geral:', error);
    
    // Resposta de erro mais amigável
    const errorMessage = error.message || 'An unexpected error occurred';
    const language = 'pt'; // Default para português
    
    return new Response(JSON.stringify({
      error: 'An error occurred',
      response: language === 'pt' 
        ? "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
        : "Sorry, an error occurred while processing your request. Please try again.",
      details: errorMessage
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});