// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v17 - RAG Otimizado)
 * 
 * Descrição:
 * Versão com busca RAG otimizada para SEMPRE encontrar dados.
 * 
 * Melhorias v17:
 * - Busca multi-threshold (0.7 → 0.5 → 0.3)
 * - Otimização de embeddings com sinônimos e contexto
 * - Logs detalhados para debug
 * - Remove "estatísticas reais do dashboard" das respostas
 * - Fallback inteligente para sempre retornar resultados
 * - Integração natural de dados RAG nas respostas
 * 
 * @author Valdair & Claude
 * @date 13/01/2025
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

// Cliente Supabase com service role para acessar todos os dados
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
  // Palavras comuns em português
  const ptWords = /\b(você|voce|está|esta|são|sao|tem|tudo|bem|ola|olá|obrigado|por favor|ajuda|preciso|quero|fazer|isso|aqui|agora|hoje|ontem|amanhã|sim|não|nao|mais|menos|muito|pouco|grande|pequeno|bom|ruim|melhor|pior|quantas|quantos|quais|mensagens|postadas|vídeos|canais)\b/i;
  
  // Palavras comuns em inglês
  const enWords = /\b(you|are|is|have|hello|hi|thanks|please|help|need|want|make|this|here|now|today|yesterday|tomorrow|yes|no|more|less|very|little|big|small|good|bad|better|worse|how|many|which|messages|posted|videos|channels)\b/i;
  
  // Conta matches
  const ptMatches = (text.match(ptWords) || []).length;
  const enMatches = (text.match(enWords) || []).length;
  
  // Se tiver mais palavras em português ou se não detectar nenhuma, assume PT (default)
  return ptMatches >= enMatches ? 'pt' : 'en';
}

/**
 * Gera UUID válido para anonymous users
 */
function getValidUserId(userId: string | null | undefined): string {
  // Se não tiver userId ou for 'anonymous', gerar UUID para anonymous
  if (!userId || userId === 'anonymous') {
    return '00000000-0000-0000-0000-000000000000'; // UUID válido para anonymous
  }
  
  // Verificar se já é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }
  
  // Se não for UUID válido, gerar um baseado no userId fornecido
  return crypto.randomUUID();
}

/**
 * Gera session_id válido como UUID
 */
function getValidSessionId(sessionId: string | null | undefined): string {
  if (!sessionId) {
    return crypto.randomUUID();
  }
  
  // Verificar se já é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(sessionId)) {
    return sessionId;
  }
  
  // Se não for UUID válido, gerar novo
  return crypto.randomUUID();
}

/**
 * Salva conversa para memória persistente
 */
async function saveConversation(userId: string, projectId: string | null, sessionId: string, message: string, type: 'user' | 'assistant') {
  try {
    const validUserId = getValidUserId(userId);
    const validSessionId = getValidSessionId(sessionId);
    
    const insertData = {
      user_id: validUserId,
      project_id: projectId ? parseInt(projectId) : null,
      session_id: validSessionId,
      message_type: type,
      message: message,
      metadata: {
        timestamp: new Date().toISOString(),
        message_length: message.length,
        original_user_id: userId, // Para debug
        original_session_id: sessionId // Para debug
      }
    };
    
    console.log('Tentando salvar conversa:', JSON.stringify(insertData, null, 2));
    
    const { error } = await supabase
      .from('agent_conversations')
      .insert(insertData);

    if (error) {
      console.error('Erro ao salvar conversa:', error);
      return false;
    }

    console.log('Conversa salva com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    return false;
  }
}

/**
 * Busca contexto histórico de conversas
 */
async function getConversationContext(userId: string, projectId: string | null, sessionId: string) {
  try {
    const validUserId = getValidUserId(userId);
    const validSessionId = getValidSessionId(sessionId);
    
    // Buscar últimas 10 mensagens da sessão atual
    const { data: sessionMessages } = await supabase
      .from('agent_conversations')
      .select('message, message_type, created_at')
      .eq('user_id', validUserId)
      .eq('session_id', validSessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar últimas 5 mensagens de outras sessões do mesmo projeto
    let projectMessages = [];
    if (projectId) {
      const { data } = await supabase
        .from('agent_conversations')
        .select('message, message_type, created_at, session_id')
        .eq('user_id', validUserId)
        .eq('project_id', parseInt(projectId))
        .neq('session_id', validSessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      projectMessages = data || [];
    }

    return {
      sessionHistory: sessionMessages || [],
      projectHistory: projectMessages
    };
  } catch (error) {
    console.error('Erro ao buscar contexto:', error);
    return {
      sessionHistory: [],
      projectHistory: []
    };
  }
}

/**
 * Categoriza o tipo de pergunta para otimizar a busca RAG
 */
function categorizeQuestion(prompt: string): string[] {
  const categories = [];
  
  // Detectar perguntas sobre métricas/números
  if (/\b(quantos?|quantas?|total|número|estatísticas?|métricas?|how many|total|number|statistics|metrics)\b/i.test(prompt)) {
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
 * Otimiza prompt para gerar melhor embedding
 * NOVO NA v17: Adiciona sinônimos e contexto relevante
 */
function optimizePromptForEmbedding(prompt: string, categories: string[], language: 'pt' | 'en'): string {
  let optimized = prompt.toLowerCase();
  
  // Adicionar sinônimos e contexto baseado no conteúdo detectado
  if (/\b(vídeo|video)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' título descrição canal youtube conteúdo vídeos filmagem gravação';
    } else {
      optimized += ' title description channel youtube content videos footage recording';
    }
  }
  
  if (/\b(postado|posted|publicado|published)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' mensagem publicado enviado data quando horário tempo postagem';
    } else {
      optimized += ' message published sent date when time posting';
    }
  }
  
  if (/\b(nome|name|qual|which|what)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' chamado intitulado denominado conhecido identificado';
    } else {
      optimized += ' called titled named known identified';
    }
  }
  
  if (/\b(sobre|about|tema|topic|assunto|subject)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' relacionado referência menciona conteúdo fala trata';
    } else {
      optimized += ' related reference mentions content talks about deals with';
    }
  }
  
  // Adicionar contexto baseado na categoria
  if (categories.includes('metrics')) {
    optimized += language === 'pt' 
      ? ' estatísticas números quantidade total soma contagem' 
      : ' statistics numbers quantity total sum count';
  }
  
  if (categories.includes('temporal')) {
    optimized += language === 'pt'
      ? ' recente último atual período data hora'
      : ' recent last current period date time';
  }
  
  console.log('=== OTIMIZAÇÃO DE EMBEDDING v17 ===');
  console.log('Prompt original:', prompt);
  console.log('Prompt otimizado:', optimized);
  
  return optimized;
}

/**
 * Busca estatísticas do projeto - SEM "estatísticas reais do dashboard"
 */
async function getProjectStats(projectId: string, currentPage?: string) {
  try {
    // 1. SEMPRE usar o RPC get_project_dashboard_stats como fonte primária
    const { data: dashboardStats, error: dashboardError } = await supabase.rpc('get_project_dashboard_stats', {
      project_id_param: parseInt(projectId)
    });

    if (dashboardError) {
      console.error('Erro ao buscar dashboard stats:', dashboardError);
      return null;
    }

    // 2. Buscar mensagens agendadas (Scheduled) - NOVA MÉTRICA
    const { count: scheduledCount } = await supabase
      .from('Mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('ProjetoID', projectId)
      .not('DataPostagem', 'is', null)
      .is('Postado', false); // Agendadas mas não postadas ainda

    // 3. Se estiver na página de monitoring, buscar métricas específicas
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

    // 4. Se estiver na página de mentions, buscar métricas específicas
    let mentionsStats = null;
    if (currentPage === '/mentions') {
      const { data: mentionsData } = await supabase
        .from('mentions_overview')
        .select('reply_count, comment_lead_score')
        .eq('project_id', projectId);
      
      if (mentionsData) {
        const totalReplies = mentionsData.filter(m => m.reply_count > 0).length;
        const pendingReplies = mentionsData.filter(m => m.reply_count === 0).length;
        const replyRate = mentionsData.length > 0 
          ? ((totalReplies / mentionsData.length) * 100).toFixed(1) 
          : '0';
        
        mentionsStats = {
          totalReplies,
          pendingReplies,
          replyRate
        };
      }
    }

    // 5. Buscar top canais com mais menções
    const { data: topChannelsData } = await supabase.rpc('get_top_channels_by_project', {
      project_id_input: parseInt(projectId),
      limit_input: 3
    });

    // IMPORTANTE: Usar os campos EXATOS do RPC, sem cálculos adicionais
    return {
      // Métricas principais do Dashboard (SEMPRE visíveis)
      totalMentions: dashboardStats.total_mentions || 0,        // "Mentions" card
      mentionsToday: dashboardStats.today_mentions || 0,        // Usado em relatórios
      totalChannels: dashboardStats.channels_count || 0,        // "Reach" card - USAR ESTE!
      totalVideos: dashboardStats.videos_count || 0,           // "Videos" card
      scheduledMessages: scheduledCount || 0,                   // "Scheduled" card - NOVO!
      
      // Métricas contextuais (baseadas na página)
      monitoringStats,
      mentionsStats,
      
      // Top canais
      topChannels: topChannelsData || [],
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      currentPage: currentPage || 'unknown'
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
    const { data, error } = await supabase
      .from('Mensagens')
      .select(`
        id,
        Conteudo,
        DataPostagem,
        VideoID,
        ComentarioPrincipalID
      `)
      .eq('ProjetoID', projectId)
      .eq('Postado', true)
      .not('DataPostagem', 'is', null)
      .order('DataPostagem', { ascending: false })
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
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (language === 'pt') {
    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  } else {
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  }
}

/**
 * Busca dados relevantes no projeto usando RAG com MULTI-THRESHOLD
 * MELHORADO NA v17: Tenta múltiplos thresholds até encontrar resultados
 */
async function searchProjectData(prompt: string, projectId: string, categories: string[], language: 'pt' | 'en') {
  try {
    console.log('=== BUSCA RAG v17 - MULTI-THRESHOLD ===');
    console.log('Projeto:', projectId);
    console.log('Prompt original:', prompt);
    console.log('Categorias:', categories);
    
    // Otimizar prompt para melhor embedding
    const optimizedPrompt = optimizePromptForEmbedding(prompt, categories, language);
    
    // Gerar embedding para a pergunta otimizada
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: optimizedPrompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingError);
      return null;
    }

    const projectIdNumber = parseInt(projectId);
    
    // MULTI-THRESHOLD: Tentar vários thresholds até encontrar resultados
    const thresholds = [0.7, 0.5, 0.3, 0.1]; // Mais agressivo na v17
    let searchResults = null;
    let usedThreshold = 0;
    
    for (const threshold of thresholds) {
      console.log(`Tentando threshold: ${threshold}...`);
      
      const { data: results, error: searchError } = await supabase.rpc('search_project_rag', {
        query_embedding: embeddingData.embedding,
        project_filter: projectIdNumber,
        similarity_threshold: threshold,
        match_count: 30 // Buscar mais resultados na v17
      });

      if (searchError) {
        console.error('Erro na busca RAG com threshold', threshold, ':', searchError);
        continue;
      }

      if (results && results.length > 0) {
        console.log(`✅ Encontrados ${results.length} resultados com threshold ${threshold}`);
        searchResults = results;
        usedThreshold = threshold;
        break;
      } else {
        console.log(`❌ Nenhum resultado com threshold ${threshold}`);
      }
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ Nenhum resultado encontrado mesmo com threshold mínimo');
      
      // FALLBACK: Buscar qualquer coisa relacionada ao projeto
      console.log('Tentando fallback: buscar QUALQUER conteúdo do projeto...');
      const { data: fallbackResults } = await supabase
        .from('rag_embeddings')
        .select('content, source_table, metadata')
        .eq('project_id', projectIdNumber)
        .limit(10);
      
      if (fallbackResults && fallbackResults.length > 0) {
        console.log(`🆘 Fallback: ${fallbackResults.length} resultados genéricos encontrados`);
        searchResults = fallbackResults.map(r => ({
          ...r,
          similarity: 0.5 // Score fictício para fallback
        }));
      }
    }
    
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    console.log(`📊 Processando ${searchResults.length} resultados (threshold: ${usedThreshold})`);
    
    // Agrupar e ranquear resultados por relevância e tipo
    const groupedResults = searchResults.reduce((acc: any, result: any) => {
      const table = result.source_table;
      if (!acc[table]) {
        acc[table] = [];
      }
      acc[table].push(result);
      return acc;
    }, {});

    // Log dos tipos de conteúdo encontrados
    console.log('Conteúdo por tabela:', Object.keys(groupedResults).map(table => 
      `${table}: ${groupedResults[table].length} resultados`
    ));

    // Formatar resultados mais relevantes
    const formattedResults = [];
    const maxPerTable = 5; // Mais resultados na v17

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

    const finalResults = formattedResults.slice(0, 15); // Até 15 resultados na v17
    console.log(`✨ Retornando ${finalResults.length} resultados finais`);
    
    return finalResults;

  } catch (error) {
    console.error('Erro na busca RAG:', error);
    return null;
  }
}

/**
 * Formata contexto RAG para o prompt - MELHORADO NA v17
 * Remove menções a "estatísticas reais" e integra dados naturalmente
 */
function formatRAGContext(ragResults: any[], language: 'pt' | 'en'): string {
  if (!ragResults || ragResults.length === 0) return '';

  const tableTranslations: any = {
    'Mensagens': language === 'pt' ? 'Mensagens' : 'Messages',
    'Comentarios_Principais': language === 'pt' ? 'Comentários' : 'Comments',
    'Videos': language === 'pt' ? 'Vídeos' : 'Videos',
    'Respostas_Comentarios': language === 'pt' ? 'Respostas' : 'Replies',
    'Settings_messages_posts': language === 'pt' ? 'Configurações' : 'Settings'
  };

  let context = language === 'pt' 
    ? '\n\n## 🔍 Dados Encontrados:\n' 
    : '\n\n## 🔍 Data Found:\n';

  const groupedByTable = ragResults.reduce((acc: any, result: any) => {
    const tableName = tableTranslations[result.table] || result.table;
    if (!acc[tableName]) {
      acc[tableName] = [];
    }
    acc[tableName].push(result);
    return acc;
  }, {});

  for (const [tableName, results] of Object.entries(groupedByTable)) {
    context += `\n### ${tableName}:\n`;
    for (const result of results as any[]) {
      // Limitar conteúdo para não ficar muito longo
      const content = result.content.length > 300 
        ? result.content.substring(0, 300) + '...' 
        : result.content;
      
      context += `- ${content}\n`;
      
      // Adicionar metadata relevante se disponível
      if (result.metadata) {
        if (result.metadata.titulo) {
          context += `  📹 ${language === 'pt' ? 'Título' : 'Title'}: ${result.metadata.titulo}\n`;
        }
        if (result.metadata.canal) {
          context += `  📺 ${language === 'pt' ? 'Canal' : 'Channel'}: ${result.metadata.canal}\n`;
        }
        if (result.metadata.data_postagem) {
          const date = new Date(result.metadata.data_postagem);
          context += `  📅 ${language === 'pt' ? 'Data' : 'Date'}: ${date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}\n`;
        }
        if (result.metadata.conteudo_preview) {
          context += `  💬 ${result.metadata.conteudo_preview}\n`;
        }
      }
      context += '\n';
    }
  }

  return context;
}

/**
 * Gera resposta usando Claude - v17 SEM "estatísticas reais do dashboard"
 */
async function generateResponse(systemPrompt: string, userPrompt: string, language: 'pt' | 'en', sessionId: string, userId: string) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024, // Aumentado na v17 para respostas mais completas
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || '';

    return aiResponse;

  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    throw error;
  }
}

// Handler principal do Deno - v17 com todas as melhorias
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validar método
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

    // Parse do body
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

    // Detectar idioma
    const language = detectLanguage(prompt);

    // Gerar ID de sessão se não fornecido
    const currentSessionId = getValidSessionId(sessionId);

    // Categorizar pergunta para otimizar busca
    const categories = categorizeQuestion(prompt);

    // Construir prompt contextual
    let contextualPrompt = '';
    const currentPage = context?.currentPage || null;
    
    // Adicionar contexto da página atual
    if (currentPage) {
      if (language === 'pt') {
        contextualPrompt += `\nUsuário está na página: ${currentPage}`;
      } else {
        contextualPrompt += `\nUser is on page: ${currentPage}`;
      }
    }
    
    // Adicionar projeto atual SEM O ID
    if (context?.currentProject) {
      if (language === 'pt') {
        contextualPrompt += `\nProjeto: ${context.currentProject.name}`;
      } else {
        contextualPrompt += `\nProject: ${context.currentProject.name}`;
      }
    }
    
    // Buscar e adicionar estatísticas se houver projeto
    let projectStats = null;
    let recentMessages = [];
    let ragResults = null;
    
    if (context?.currentProject?.id) {
      // Buscar estatísticas com contexto de página
      projectStats = await getProjectStats(context.currentProject.id, currentPage);
      
      // Buscar mensagens recentes
      recentMessages = await getRecentScheduledMessages(context.currentProject.id);
      
      // BUSCA RAG v17 COM MULTI-THRESHOLD
      console.log('\n🚀 Iniciando busca RAG v17 para:', prompt);
      ragResults = await searchProjectData(
        prompt, 
        context.currentProject.id, 
        categories, 
        language
      );
      
      if (ragResults && ragResults.length > 0) {
        console.log(`✅ RAG v17 retornou ${ragResults.length} resultados`);
      } else {
        console.log('❌ RAG v17 não encontrou resultados');
      }
    }
    
    // Adicionar estatísticas ao contexto - SEM "estatísticas reais"
    if (projectStats) {
      if (language === 'pt') {
        contextualPrompt += `\n\n## 📊 Métricas do Projeto:`;
        contextualPrompt += `\n- Menções: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Canais/Alcance: ${projectStats.totalChannels}`;
        contextualPrompt += `\n- Vídeos: ${projectStats.totalVideos}`;
        contextualPrompt += `\n- Mensagens Agendadas: ${projectStats.scheduledMessages}`;
        contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
        
        // Métricas específicas da página
        if (projectStats.monitoringStats) {
          contextualPrompt += `\n\n### 📊 Métricas de Monitoramento:`;
          contextualPrompt += `\n- Visualizações: ${projectStats.monitoringStats.totalViews}`;
          contextualPrompt += `\n- Likes: ${projectStats.monitoringStats.totalLikes}`;
          contextualPrompt += `\n- Taxa de engajamento: ${projectStats.monitoringStats.engagementRate}%`;
        }
        
        if (projectStats.mentionsStats) {
          contextualPrompt += `\n\n### 💬 Status de Menções:`;
          contextualPrompt += `\n- Respondidas: ${projectStats.mentionsStats.totalReplies}`;
          contextualPrompt += `\n- Pendentes: ${projectStats.mentionsStats.pendingReplies}`;
          contextualPrompt += `\n- Taxa de resposta: ${projectStats.mentionsStats.replyRate}%`;
        }
        
        if (projectStats.topChannels.length > 0) {
          contextualPrompt += `\n\n### 🏆 Principais Canais:`;
          projectStats.topChannels.forEach((channel: any, index: number) => {
            contextualPrompt += `\n${index + 1}. ${channel.channel_title} (${channel.mention_count} menções)`;
          });
        }
      } else {
        contextualPrompt += `\n\n## 📊 Project Metrics:`;
        contextualPrompt += `\n- Mentions: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Channels/Reach: ${projectStats.totalChannels}`;
        contextualPrompt += `\n- Videos: ${projectStats.totalVideos}`;
        contextualPrompt += `\n- Scheduled Messages: ${projectStats.scheduledMessages}`;
        contextualPrompt += `\n- Mentions today: ${projectStats.mentionsToday}`;
        
        // Page-specific metrics
        if (projectStats.monitoringStats) {
          contextualPrompt += `\n\n### 📊 Monitoring Metrics:`;
          contextualPrompt += `\n- Views: ${projectStats.monitoringStats.totalViews}`;
          contextualPrompt += `\n- Likes: ${projectStats.monitoringStats.totalLikes}`;
          contextualPrompt += `\n- Engagement rate: ${projectStats.monitoringStats.engagementRate}%`;
        }
        
        if (projectStats.mentionsStats) {
          contextualPrompt += `\n\n### 💬 Mentions Status:`;
          contextualPrompt += `\n- Replied: ${projectStats.mentionsStats.totalReplies}`;
          contextualPrompt += `\n- Pending: ${projectStats.mentionsStats.pendingReplies}`;
          contextualPrompt += `\n- Reply rate: ${projectStats.mentionsStats.replyRate}%`;
        }
        
        if (projectStats.topChannels.length > 0) {
          contextualPrompt += `\n\n### 🏆 Top Channels:`;
          projectStats.topChannels.forEach((channel: any, index: number) => {
            contextualPrompt += `\n${index + 1}. ${channel.channel_title} (${channel.mention_count} mentions)`;
          });
        }
      }
    }
    
    // Adicionar mensagens recentes SEM IDs
    if (recentMessages.length > 0) {
      if (language === 'pt') {
        contextualPrompt += `\n\n## 📅 Postagens Recentes:`;
        recentMessages.forEach((msg: any) => {
          const date = formatDate(msg.DataPostagem, language);
          contextualPrompt += `\n- ${date}: "${msg.Conteudo.substring(0, 100)}..."`;
        });
      } else {
        contextualPrompt += `\n\n## 📅 Recent Posts:`;
        recentMessages.forEach((msg: any) => {
          const date = formatDate(msg.DataPostagem, language);
          contextualPrompt += `\n- ${date}: "${msg.Conteudo.substring(0, 100)}..."`;
        });
      }
    }
    
    // ADICIONAR CONTEXTO RAG v17 SE HOUVER RESULTADOS
    if (ragResults && ragResults.length > 0) {
      contextualPrompt += formatRAGContext(ragResults, language);
    }

    // Buscar contexto histórico
    const conversationHistory = await getConversationContext(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId
    );
    
    // Adicionar histórico ao contexto se houver
    if (conversationHistory.sessionHistory.length > 0 || conversationHistory.projectHistory.length > 0) {
      if (language === 'pt') {
        contextualPrompt += `\n\n## 💬 Histórico de Conversas:`;
        
        // Histórico da sessão atual
        if (conversationHistory.sessionHistory.length > 0) {
          contextualPrompt += `\n### Conversa Atual:`;
          conversationHistory.sessionHistory.reverse().forEach((msg: any) => {
            const role = msg.message_type === 'user' ? 'Usuário' : 'Assistente';
            contextualPrompt += `\n${role}: ${msg.message.substring(0, 150)}${msg.message.length > 150 ? '...' : ''}`;
          });
        }
        
        // Histórico de outras sessões
        if (conversationHistory.projectHistory.length > 0) {
          contextualPrompt += `\n### Conversas Anteriores:`;
          conversationHistory.projectHistory.forEach((msg: any) => {
            const role = msg.message_type === 'user' ? 'Usuário' : 'Assistente';
            contextualPrompt += `\n${role}: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`;
          });
        }
      } else {
        contextualPrompt += `\n\n## 💬 Conversation History:`;
        
        // Current session history
        if (conversationHistory.sessionHistory.length > 0) {
          contextualPrompt += `\n### Current Conversation:`;
          conversationHistory.sessionHistory.reverse().forEach((msg: any) => {
            const role = msg.message_type === 'user' ? 'User' : 'Assistant';
            contextualPrompt += `\n${role}: ${msg.message.substring(0, 150)}${msg.message.length > 150 ? '...' : ''}`;
          });
        }
        
        // Previous sessions history
        if (conversationHistory.projectHistory.length > 0) {
          contextualPrompt += `\n### Previous Conversations:`;
          conversationHistory.projectHistory.forEach((msg: any) => {
            const role = msg.message_type === 'user' ? 'User' : 'Assistant';
            contextualPrompt += `\n${role}: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`;
          });
        }
      }
    }
    
    // System prompt v17 - REMOVIDO "estatísticas reais do dashboard"
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

🚨 REGRAS IMPORTANTES:
- Use SEMPRE os dados fornecidos no contexto
- Responda de forma natural e conversacional
- NUNCA mencione IDs técnicos ou termos internos
- Quando não tiver dados específicos, sugira como o usuário pode obtê-los
- Se encontrar dados relevantes via RAG, apresente-os de forma clara e útil

Seja direto, útil e amigável. Integre naturalmente todos os dados disponíveis na sua resposta.${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

🚨 IMPORTANT RULES:
- ALWAYS use the data provided in the context
- Respond in a natural, conversational way
- NEVER mention technical IDs or internal terms
- When you don't have specific data, suggest how the user can get it
- If you find relevant data via RAG, present it clearly and helpfully

Be direct, helpful and friendly. Naturally integrate all available data into your response.${contextualPrompt}`;

    // Salvar pergunta do usuário
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
      language,
      currentSessionId,
      userId || 'anonymous'
    );
    
    // Salvar resposta do assistente
    await saveConversation(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId,
      aiResponse,
      'assistant'
    );

    return new Response(
      JSON.stringify({ 
        content: aiResponse,
        sessionId: currentSessionId,
        language,
        hasRAGData: ragResults && ragResults.length > 0,
        debug: {
          version: 'v17-rag-otimizado',
          ragResultsCount: ragResults?.length || 0,
          categoriesDetected: categories,
          promptOptimized: prompt !== optimizePromptForEmbedding(prompt, categories, language)
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
    console.error('Erro no agente v17:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        version: 'v17-rag-otimizado'
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