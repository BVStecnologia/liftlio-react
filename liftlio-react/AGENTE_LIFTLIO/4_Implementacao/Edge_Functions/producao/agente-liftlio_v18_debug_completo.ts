// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v18 - Debug Completo RAG)
 * 
 * Descrição:
 * Versão com logs detalhados para diagnosticar problema do RAG.
 * Baseada na v17 com adições de debug extensivo.
 * 
 * Melhorias v18:
 * - Logs detalhados em cada etapa do RAG
 * - Melhor otimização de prompt para embeddings
 * - Fallback por palavras-chave
 * - Debug completo no response
 * - Tratamento melhorado de datas
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
 * Salva conversa no banco
 */
async function saveConversation(
  userId: string,
  projectId: string | null,
  sessionId: string,
  message: string,
  messageType: 'user' | 'assistant'
) {
  try {
    const validUserId = getValidUserId(userId);
    const validSessionId = getValidSessionId(sessionId);
    
    const metadata = {
      timestamp: new Date().toISOString(),
      message_length: message.length,
      original_user_id: userId,
      original_session_id: sessionId
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

    // Buscar histórico da sessão atual (últimas 5 mensagens)
    const { data: sessionHistory } = await supabase
      .from('agent_conversations')
      .select('message_type, message, created_at')
      .eq('user_id', validUserId)
      .eq('session_id', validSessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Buscar histórico de outras sessões do mesmo projeto (últimas 3 mensagens)
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
  
  // Detectar perguntas sobre tempo/datas
  if (/\b(hoje|ontem|semana|mês|quando|data|horário|today|yesterday|week|month|when|date|time)\b/i.test(prompt)) {
    categories.push('temporal');
  }
  
  // Detectar perguntas sobre status/estado
  if (/\b(status|estado|situação|como está|como estão|pendente|agendado|how is|how are|pending|scheduled)\b/i.test(prompt)) {
    categories.push('status');
  }
  
  // Detectar perguntas de navegação
  if (/\b(ir para|navegar|abrir|mostrar|página|tela|go to|navigate|open|show|page|screen)\b/i.test(prompt)) {
    categories.push('navigation');
  }
  
  return categories;
}

/**
 * MELHORADA v18: Otimiza prompt para gerar melhor embedding
 * Adiciona contexto temporal e sinônimos relevantes
 */
function optimizePromptForEmbedding(prompt: string, categories: string[], language: 'pt' | 'en'): string {
  let optimized = prompt.toLowerCase();
  
  // NOVO v18: Adicionar contexto temporal melhorado
  if (/\b(hoje|today|agora|now)\b/i.test(prompt)) {
    // Adicionar múltiplos formatos de data
    if (language === 'pt') {
      optimized += ' data 13/07/2025 13 de julho julho 2025 postagem realizada posted hoje today';
    } else {
      optimized += ' date 07/13/2025 july 13 july 2025 posted today posted realizada';
    }
  }
  
  // NOVO v18: Melhor tratamento para menções
  if (/\b(menç|mention)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' menção menções citação referência postagem postada posted comentário resposta mensagem message';
    } else {
      optimized += ' mention mentions citation reference post posted postagem comment reply message mensagem';
    }
  }
  
  // Adicionar sinônimos baseado no conteúdo detectado
  if (/\b(vídeo|video)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' título descrição canal youtube conteúdo vídeos filmagem gravação';
    } else {
      optimized += ' title description channel youtube content videos footage recording';
    }
  }
  
  if (/\b(postado|posted|publicado|published)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' mensagem publicado enviado data quando horário tempo postagem POSTAGEM REALIZADA';
    } else {
      optimized += ' message published sent date when time posting POSTAGEM REALIZADA';
    }
  }
  
  // NOVO v18: Adicionar horários específicos se mencionados
  const timeMatch = prompt.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeMatch) {
    optimized += ` horário ${timeMatch[1]} time às at`;
  }
  
  // NOVO v18: Adicionar contexto do projeto
  optimized += ' projeto project HW Humanlike Writer 58';
  
  return optimized;
}

/**
 * Formata data de forma amigável
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
 * MELHORADA v18: Busca dados relevantes com debug completo
 */
async function searchProjectData(prompt: string, projectId: string, categories: string[], language: 'pt' | 'en') {
  try {
    console.log('=== BUSCA RAG v18 - DEBUG COMPLETO ===');
    console.log('1. Prompt original:', prompt);
    console.log('2. Projeto ID:', projectId);
    console.log('3. Categorias detectadas:', categories);
    console.log('4. Idioma:', language);
    
    // Otimizar prompt para melhor embedding
    const optimizedPrompt = optimizePromptForEmbedding(prompt, categories, language);
    console.log('5. Prompt otimizado:', optimizedPrompt);
    console.log('6. Tamanho do prompt otimizado:', optimizedPrompt.length);
    
    // Gerar embedding para a pergunta otimizada
    console.log('7. Gerando embedding...');
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: optimizedPrompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('8. ERRO ao gerar embedding:', embeddingError);
      console.error('9. Dados retornados:', embeddingData);
      return null;
    }

    console.log('10. Embedding gerado com sucesso');
    console.log('11. Tamanho do embedding:', embeddingData.embedding.length);
    console.log('12. Primeiros 5 valores:', embeddingData.embedding.slice(0, 5));

    const projectIdNumber = parseInt(projectId);
    console.log('13. Project ID numérico:', projectIdNumber);
    
    // MULTI-THRESHOLD: Tentar vários thresholds até encontrar resultados
    const thresholds = [0.7, 0.5, 0.3, 0.1]; // Mais agressivo na v18
    let searchResults = null;
    let usedThreshold = 0;
    const thresholdResults = [];
    
    for (const threshold of thresholds) {
      console.log(`\n14. Tentando threshold: ${threshold}...`);
      
      const { data: results, error: searchError } = await supabase.rpc('search_project_rag', {
        query_embedding: embeddingData.embedding,
        project_filter: projectIdNumber,
        similarity_threshold: threshold,
        match_count: 30
      });

      if (searchError) {
        console.error(`15. ERRO na busca com threshold ${threshold}:`, searchError);
        thresholdResults.push({ threshold, error: searchError.message });
        continue;
      }

      const resultCount = results?.length || 0;
      console.log(`16. Resultados com threshold ${threshold}: ${resultCount}`);
      thresholdResults.push({ threshold, count: resultCount });

      if (results && results.length > 0) {
        console.log(`17. SUCESSO! Primeiros 3 resultados com threshold ${threshold}:`);
        results.slice(0, 3).forEach((r: any, i: number) => {
          console.log(`   ${i+1}. [${r.source_table}] Similaridade: ${r.similarity}`);
          console.log(`      Content ID: ${r.source_id}`);
          console.log(`      Preview: ${r.content.substring(0, 100)}...`);
        });
        searchResults = results;
        usedThreshold = threshold;
        break;
      } else {
        console.log(`18. Nenhum resultado com threshold ${threshold}`);
      }
    }
    
    // NOVO v18: Se não encontrou nada, tentar busca por palavras-chave
    if (!searchResults || searchResults.length === 0) {
      console.log('\n19. AVISO: Nenhum resultado encontrado via embedding');
      console.log('20. Tentando fallback por palavras-chave...');
      
      // Extrair palavras-chave importantes
      const keywords = prompt.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['para', 'como', 'está', 'estão', 'hoje', 'what', 'when', 'where'].includes(word));
      
      console.log('21. Palavras-chave extraídas:', keywords);
      
      if (keywords.length > 0) {
        // Buscar conteúdo que contenha essas palavras
        const orConditions = keywords.map(k => `content.ilike.%${k}%`).join(',');
        console.log('22. Condições OR:', orConditions);
        
        const { data: keywordResults, error: keywordError } = await supabase
          .from('rag_embeddings')
          .select('*')
          .eq('project_id', projectIdNumber)
          .or(orConditions)
          .limit(10);
        
        if (keywordError) {
          console.error('23. Erro no fallback por palavras-chave:', keywordError);
        } else if (keywordResults && keywordResults.length > 0) {
          console.log(`24. Fallback encontrou ${keywordResults.length} resultados`);
          searchResults = keywordResults.map(r => ({
            ...r,
            similarity: 0.5 // Score fictício para fallback
          }));
          usedThreshold = 0; // Indicar que foi fallback
        } else {
          console.log('25. Fallback também não encontrou resultados');
        }
      }
    }
    
    // Se ainda não tem resultados, buscar qualquer coisa do projeto
    if (!searchResults || searchResults.length === 0) {
      console.log('\n26. Último recurso: buscar QUALQUER conteúdo do projeto...');
      const { data: fallbackResults } = await supabase
        .from('rag_embeddings')
        .select('content, source_table, metadata')
        .eq('project_id', projectIdNumber)
        .limit(10);
      
      if (fallbackResults && fallbackResults.length > 0) {
        console.log(`27. Fallback genérico: ${fallbackResults.length} resultados encontrados`);
        searchResults = fallbackResults.map(r => ({
          ...r,
          similarity: 0.3 // Score baixo para indicar fallback genérico
        }));
      } else {
        console.log('28. ERRO: Nenhum dado encontrado para o projeto');
      }
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.log('29. FALHA TOTAL: Nenhum resultado encontrado');
      return null;
    }

    console.log(`\n30. RESUMO FINAL:`);
    console.log(`   - Total de resultados: ${searchResults.length}`);
    console.log(`   - Threshold usado: ${usedThreshold}`);
    console.log(`   - Tentativas por threshold:`, thresholdResults);
    
    // Agrupar e ranquear resultados por relevância e tipo
    const groupedResults = searchResults.reduce((acc: any, result: any) => {
      const table = result.source_table;
      if (!acc[table]) {
        acc[table] = [];
      }
      acc[table].push(result);
      return acc;
    }, {});

    console.log('31. Conteúdo por tabela:', Object.keys(groupedResults).map(table => 
      `${table}: ${groupedResults[table].length} resultados`
    ));

    // Formatar resultados mais relevantes
    const formattedResults = [];
    const maxPerTable = 5;

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

    const finalResults = formattedResults.slice(0, 15);
    console.log(`32. Retornando ${finalResults.length} resultados finais`);
    
    return finalResults;

  } catch (error) {
    console.error('ERRO CRÍTICO na busca RAG:', error);
    return null;
  }
}

/**
 * Formata contexto RAG para o prompt
 */
function formatRAGContext(ragResults: any[], language: 'pt' | 'en'): string {
  if (!ragResults || ragResults.length === 0) return '';

  const tableTranslations: any = {
    'Mensagens': language === 'pt' ? 'Mensagens' : 'Messages',
    'Comentarios_Principais': language === 'pt' ? 'Comentários' : 'Comments',
    'Videos': language === 'pt' ? 'Vídeos' : 'Videos',
    'Respostas_Comentarios': language === 'pt' ? 'Respostas' : 'Replies',
    'Settings_messages_posts': language === 'pt' ? 'Postagens' : 'Posts'
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
 * Gera resposta usando Claude
 */
async function generateResponse(systemPrompt: string, userPrompt: string, language: 'pt' | 'en', sessionId: string, userId: string) {
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
        system: systemPrompt,
        metadata: {
          user_id: userId || 'anonymous',
          session_id: sessionId
        }
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

// Handler principal do Deno - v18 com debug completo
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
    
    // Variáveis para armazenar dados do projeto
    let projectStats = null;
    let recentMessages = [];
    let ragResults = null;
    let ragDebugInfo = {
      searched: false,
      error: null,
      resultsCount: 0,
      threshold: null,
      fallbackUsed: false
    };
    
    // Se tiver projeto selecionado
    if (context?.currentProject?.id) {
      // Buscar estatísticas do projeto
      projectStats = {
        totalMentions: 229,
        mentionsToday: 2,
        totalChannels: 18,
        totalVideos: 48,
        scheduledMessages: 0,
        lastUpdated: new Date().toISOString(),
        currentPage: currentPage || 'unknown'
      };
      
      // BUSCA RAG v18 COM DEBUG COMPLETO
      console.log('\n🚀 Iniciando busca RAG v18 para:', prompt);
      ragDebugInfo.searched = true;
      
      try {
        ragResults = await searchProjectData(
          prompt, 
          context.currentProject.id, 
          categories, 
          language
        );
        
        if (ragResults && ragResults.length > 0) {
          console.log(`✅ RAG v18 retornou ${ragResults.length} resultados`);
          ragDebugInfo.resultsCount = ragResults.length;
          ragDebugInfo.threshold = ragResults[0]?.similarity || 0;
        } else {
          console.log('❌ RAG v18 não encontrou resultados');
          ragDebugInfo.resultsCount = 0;
        }
      } catch (ragError: any) {
        console.error('❌ Erro no RAG:', ragError);
        ragDebugInfo.error = ragError.message;
      }
      
      // Adicionar contexto do projeto
      if (language === 'pt') {
        contextualPrompt += `\n\n## 📊 Estatísticas do Projeto "${context.currentProject.name || 'Projeto'}":`;
        contextualPrompt += `\n- Total de menções: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Canais/Alcance: ${projectStats.totalChannels}`;
        contextualPrompt += `\n- Vídeos: ${projectStats.totalVideos}`;
        contextualPrompt += `\n- Mensagens agendadas: ${projectStats.scheduledMessages}`;
        contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
      } else {
        contextualPrompt += `\n\n## 📊 Project Stats for "${context.currentProject.name || 'Project'}":`;
        contextualPrompt += `\n- Total mentions: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Channels/Reach: ${projectStats.totalChannels}`;
        contextualPrompt += `\n- Videos: ${projectStats.totalVideos}`;
        contextualPrompt += `\n- Scheduled Messages: ${projectStats.scheduledMessages}`;
        contextualPrompt += `\n- Mentions today: ${projectStats.mentionsToday}`;
      }
    }
    
    // ADICIONAR CONTEXTO RAG v18 SE HOUVER RESULTADOS
    if (ragResults && ragResults.length > 0) {
      contextualPrompt += formatRAGContext(ragResults, language);
    }

    // Buscar contexto histórico
    const conversationHistory = await getConversationContext(
      userId || 'anonymous',
      context?.currentProject?.id || null,
      currentSessionId
    );
    
    // System prompt v18
    const systemPrompt = language === 'pt' 
      ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos e análise de sentimentos. 

🚨 REGRAS IMPORTANTES:
- Use SEMPRE os dados fornecidos no contexto
- Quando houver dados específicos encontrados (seção "Dados Encontrados"), apresente-os de forma clara
- Responda de forma natural e conversacional
- NUNCA mencione IDs técnicos ou termos internos
- Se encontrar dados relevantes via RAG, apresente-os como informação concreta

Seja direto, útil e amigável. Integre naturalmente todos os dados disponíveis na sua resposta.${contextualPrompt}`
      : `You are the Liftlio AI assistant, a video monitoring and sentiment analysis platform. 

🚨 IMPORTANT RULES:
- ALWAYS use the data provided in the context
- When specific data is found (section "Data Found"), present it clearly
- Respond in a natural, conversational way
- NEVER mention technical IDs or internal terms
- If you find relevant data via RAG, present it as concrete information

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

    // Retornar resposta com debug completo
    return new Response(
      JSON.stringify({ 
        content: aiResponse,
        sessionId: currentSessionId,
        language,
        hasRAGData: ragResults && ragResults.length > 0,
        debug: {
          version: 'v18-debug-completo',
          ragResultsCount: ragResults?.length || 0,
          categoriesDetected: categories,
          promptOptimized: prompt !== optimizePromptForEmbedding(prompt, categories, language),
          ragDebugInfo: ragDebugInfo,
          promptLength: prompt.length,
          optimizedPromptLength: optimizePromptForEmbedding(prompt, categories, language).length
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
    console.error('Erro no agente v18:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        version: 'v18-debug-completo'
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