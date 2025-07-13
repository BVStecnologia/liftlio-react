// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v10 - Correção campo video)
 * 
 * Descrição:
 * Correção do campo video_id para video na tabela Mensagens.
 * 
 * Melhorias v10:
 * - Corrigido campo video_id → video
 * - Mantém todas as melhorias da v9
 * - Dados reais apenas, sem invenções
 * 
 * @author Valdair & Claude
 * @date 12/01/2025
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
  const ptWords = /\b(você|voce|está|esta|são|sao|tem|tudo|bem|ola|olá|obrigado|por favor|ajuda|preciso|quero|fazer|isso|aqui|agora|hoje|ontem|amanhã|sim|não|nao|mais|menos|muito|pouco|grande|pequeno|bom|ruim|melhor|pior)\b/i;
  
  // Palavras comuns em inglês
  const enWords = /\b(you|are|is|have|hello|hi|thanks|please|help|need|want|make|this|here|now|today|yesterday|tomorrow|yes|no|more|less|very|little|big|small|good|bad|better|worse)\b/i;
  
  // Conta matches
  const ptMatches = (text.match(ptWords) || []).length;
  const enMatches = (text.match(enWords) || []).length;
  
  // Se tiver mais palavras em português ou se não detectar nenhuma, assume PT (default)
  return ptMatches >= enMatches ? 'pt' : 'en';
}

/**
 * Busca estatísticas reais do projeto
 */
async function getProjectStats(projectId: string) {
  try {
    console.log('Buscando estatísticas reais para projeto:', projectId);
    
    // Buscar dados em paralelo
    const [
      mensagensResult,
      mensagensHojeResult,
      videosResult,
      canaisResult,
      topCanaisResult
    ] = await Promise.all([
      // Total de menções
      supabase
        .from('Mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId),
      
      // Menções hoje
      supabase
        .from('Mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('created_at', new Date().toISOString().split('T')[0]),
      
      // Total de vídeos únicos - CORRIGIDO: video em vez de video_id
      supabase
        .from('Mensagens')
        .select('video')
        .eq('project_id', projectId)
        .not('video', 'is', null),
      
      // Canais únicos via scanner
      supabase
        .from('Scanner de videos do youtube')
        .select('id, canal')
        .in('id', 
          supabase
            .from('Videos')
            .select('scanner_id')
            .in('id',
              supabase
                .from('Mensagens')
                .select('video')
                .eq('project_id', projectId)
                .not('video', 'is', null)
            )
        ),
      
      // Top canais por menções - CORRIGIDO
      supabase
        .from('Mensagens')
        .select(`
          video,
          Videos!inner(
            scanner_id,
            Scanner de videos do youtube!inner(
              canal
            )
          )
        `)
        .eq('project_id', projectId)
        .not('video', 'is', null)
    ]);

    // Processar resultados
    const totalMentions = mensagensResult.count || 0;
    const mentionsToday = mensagensHojeResult.count || 0;
    
    // Contar vídeos únicos - CORRIGIDO
    const uniqueVideoIds = new Set(videosResult.data?.map(v => v.video) || []);
    const totalVideos = uniqueVideoIds.size;
    
    // Contar canais únicos
    const uniqueChannels = new Set(canaisResult.data?.map(c => c.id) || []);
    const activeChannels = uniqueChannels.size;
    
    // Processar top canais
    const channelCounts = {};
    topCanaisResult.data?.forEach(msg => {
      const channelName = msg.Videos?.['Scanner de videos do youtube']?.canal;
      if (channelName) {
        channelCounts[channelName] = (channelCounts[channelName] || 0) + 1;
      }
    });
    
    const topChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, mentions: count }));

    const stats = {
      totalMentions,
      mentionsToday,
      totalVideos,
      activeChannels,
      topChannels
    };
    
    console.log('Estatísticas retornadas:', JSON.stringify(stats, null, 2));
    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

// System prompts em ambos idiomas - REFORÇADO PARA NÃO INVENTAR DADOS
const systemPromptPT = `Você é o Agente Liftlio, um assistente AI inteligente e amigável criado para ajudar usuários com sua plataforma de marketing e branding automatizado.

## 🚨 REGRA ABSOLUTA NÚMERO 1 🚨
NUNCA, JAMAIS, EM HIPÓTESE ALGUMA invente dados, números ou estatísticas!

## 🎯 Sua Identidade

- **Nome**: Agente Liftlio
- **Modelo**: "Sou um modelo de linguagem grande criado pelo Liftlio. Tenho memória infinita e fico cada vez mais inteligente com o tempo."
- **Personalidade**: Você é o melhor amigo do usuário - atencioso, prestativo e profissional
- **Conhecimento**: Você sabe tudo sobre os dados do projeto do usuário e como resolver problemas

## 🌟 O que é o Liftlio

O Liftlio é uma plataforma revolucionária que usa IA para:
- Escalar recomendações boca-a-boca sem pagar por anúncios
- Fazer sua marca ser mencionada em conversas online genuínas
- Monitorar vídeos e analisar sentimentos
- Crescimento orgânico através de menções naturais

## 💬 Regras de Comunicação

### SEMPRE:
- Comunique-se de forma natural e conversacional
- Use português brasileiro informal ("você")
- Seja direto, claro e conciso
- Forneça APENAS informações que estão em projectStats ou ragContext
- Se não tiver dados específicos, diga "Vou verificar isso para você" ou "Não tenho esses dados no momento"
- Quando tiver os dados de vídeos e canais, SEMPRE os mencione

### NUNCA:
- NUNCA invente dados, números, métricas ou estatísticas
- NUNCA crie valores fictícios como "2,456 menções" se não estiverem em projectStats
- NUNCA mencione números específicos a menos que venham de projectStats
- Não fale sobre campos de tabelas ou detalhes técnicos internos
- Não responda nada fora do escopo do Liftlio

## 🛠️ Suas Capacidades

1. **Informações e Suporte**
   - Explicar como o Liftlio funciona
   - Ajudar com problemas e dúvidas
   - Fornecer APENAS dados reais do projectStats
   - Compartilhar insights dos dados RAG quando disponíveis

2. **Navegação e Orientação**
   - /dashboard - Visão geral e métricas
   - /monitoring - Monitoramento de vídeos  
   - /mentions - Menções e comentários
   - /scanner - Scanner de vídeos do YouTube
   - /projects - Gerenciamento de projetos
   - /integrations - Integrações disponíveis
   - /settings - Configurações da conta

## 📊 Usando Dados do Contexto

CRÍTICO: Use APENAS os dados fornecidos em projectStats. Se projectStats tiver:
- totalMentions: 227 → Diga "Você tem 227 menções"
- mentionsToday: 3 → Diga "Hoje você teve 3 menções"
- totalVideos: 47 → Diga "Você tem 47 vídeos sendo monitorados"
- activeChannels: 18 → Diga "Você tem 18 canais ativos"

SEMPRE mencione TODOS os dados disponíveis quando o usuário perguntar sobre métricas!

NUNCA diga coisas como "2,456 menções" ou "1.2 milhões de alcance" se não estiverem nos dados!

Se tiver dados RAG, mencione insights específicos:
- "Vi nos comentários que..."
- "Notei um padrão interessante..."

Mas NUNCA invente números!

Quando o usuário pedir para navegar, responda com:
{
  "content": "Vou te levar para [nome da página]...",
  "action": "navigate",
  "data": { "path": "/caminho-da-pagina" }
}

Lembre-se: É melhor dizer "não tenho esse dado" do que inventar!`;

const systemPromptEN = `You are the Liftlio Agent, an intelligent and friendly AI assistant created to help users with their automated marketing and branding platform.

## 🚨 ABSOLUTE RULE NUMBER 1 🚨
NEVER, EVER, UNDER ANY CIRCUMSTANCES make up data, numbers or statistics!

## 🎯 Your Identity

- **Name**: Liftlio Agent
- **Model**: "I'm a large language model created by Liftlio. I have infinite memory and get smarter over time."
- **Personality**: You are the user's best friend - attentive, helpful, and professional
- **Knowledge**: You know everything about the user's project data and how to solve problems

## 🌟 What is Liftlio

Liftlio is a revolutionary platform that uses AI to:
- Scale word-of-mouth recommendations without paying for ads
- Get your brand mentioned in genuine online conversations
- Monitor videos and analyze sentiments
- Organic growth through natural mentions

## 💬 Communication Rules

### ALWAYS:
- Communicate naturally and conversationally
- Use informal English ("you")
- Be direct, clear, and concise
- Provide ONLY information that's in projectStats or ragContext
- If you don't have specific data, say "Let me check that for you" or "I don't have that data at the moment"
- When you have video and channel data, ALWAYS mention them

### NEVER:
- NEVER make up data, numbers, metrics or statistics
- NEVER create fictional values like "2,456 mentions" if not in projectStats
- NEVER mention specific numbers unless they come from projectStats
- Don't talk about table fields or internal technical details
- Don't answer anything outside of Liftlio's scope

## 🛠️ Your Capabilities

1. **Information and Support**
   - Explain how Liftlio works
   - Help with problems and questions
   - Provide ONLY real data from projectStats
   - Share insights from RAG data when available

2. **Navigation and Guidance**
   - /dashboard - Overview and metrics
   - /monitoring - Video monitoring  
   - /mentions - Mentions and comments
   - /scanner - YouTube video scanner
   - /projects - Project management
   - /integrations - Available integrations
   - /settings - Account settings

## 📊 Using Context Data

CRITICAL: Use ONLY the data provided in projectStats. If projectStats has:
- totalMentions: 227 → Say "You have 227 mentions"
- mentionsToday: 3 → Say "You had 3 mentions today"
- totalVideos: 47 → Say "You have 47 videos being monitored"
- activeChannels: 18 → Say "You have 18 active channels"

ALWAYS mention ALL available data when user asks about metrics!

NEVER say things like "2,456 mentions" or "1.2 million reach" if not in the data!

If you have RAG data, mention specific insights:
- "I see in the comments that..."
- "I noticed an interesting pattern..."

But NEVER make up numbers!

When the user asks to navigate, respond with:
{
  "content": "I'll take you to [page name]...",
  "action": "navigate",
  "data": { "path": "/page-path" }
}

Remember: It's better to say "I don't have that data" than to make it up!`;

/**
 * Busca dados relevantes do projeto usando RAG
 */
async function searchProjectData(prompt: string, projectId: string) {
  try {
    console.log('Buscando dados RAG para projeto:', projectId);
    console.log('Prompt:', prompt);
    
    // Gerar embedding
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: prompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingError);
      return null;
    }

    console.log('Embedding gerado com sucesso');

    // CORREÇÃO: Garantir que projectId seja número
    const projectIdNumber = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
    
    // Buscar dados relevantes com threshold menor para melhor recall
    const { data: searchResults, error: searchError } = await supabase.rpc('search_project_rag', {
      query_embedding: embeddingData.embedding,
      project_filter: projectIdNumber,
      similarity_threshold: 0.5, // REDUZIDO de 0.7 para 0.5
      match_count: 10 // AUMENTADO de 5 para 10
    });

    if (searchError) {
      console.error('Erro na busca RAG:', searchError);
      return null;
    }

    console.log('Resultados da busca RAG:', searchResults?.length || 0, 'registros encontrados');
    
    if (searchResults && searchResults.length > 0) {
      console.log('Similaridades encontradas:', searchResults.map(r => r.similarity));
      console.log('Primeiro resultado:', {
        content: searchResults[0].content?.substring(0, 200) + '...',
        similarity: searchResults[0].similarity
      });
    }

    return searchResults;
  } catch (error) {
    console.error('Erro ao buscar dados RAG:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Parse do body da requisição
    const { prompt, context = {}, project_id } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório / Prompt is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Detectar idioma do prompt
    const language = detectLanguage(prompt);
    const systemPrompt = language === 'pt' ? systemPromptPT : systemPromptEN;
    
    console.log('=== NOVA REQUISIÇÃO ===');
    console.log('Prompt recebido:', prompt);
    console.log('Idioma detectado:', language);
    console.log('Projeto do contexto:', context.currentProject);
    console.log('Project_id direto:', project_id);

    // Determinar o ID do projeto (pode vir de diferentes formas)
    const projectIdToUse = project_id || context.currentProject?.id;
    
    console.log('ProjectId a ser usado:', projectIdToUse);

    // Buscar estatísticas reais do projeto
    let projectStats = null;
    if (projectIdToUse) {
      projectStats = await getProjectStats(String(projectIdToUse));
      console.log('=== ESTATÍSTICAS DO PROJETO ===');
      console.log(JSON.stringify(projectStats, null, 2));
    }

    // Buscar dados RAG complementares
    let ragContext = '';
    if (projectIdToUse) {
      const ragResults = await searchProjectData(prompt, String(projectIdToUse));
      
      if (ragResults && ragResults.length > 0) {
        if (language === 'pt') {
          ragContext = '\n\n## Dados relevantes encontrados no sistema:\n';
          ragResults.forEach((result: any, index: number) => {
            // Só incluir resultados com similaridade > 0.6 para qualidade
            if (result.similarity > 0.6) {
              ragContext += `${index + 1}. ${result.content}\n`;
              ragContext += `   (Relevância: ${(result.similarity * 100).toFixed(1)}%)\n\n`;
            }
          });
        } else {
          ragContext = '\n\n## Relevant data found in the system:\n';
          ragResults.forEach((result: any, index: number) => {
            // Only include results with similarity > 0.6 for quality
            if (result.similarity > 0.6) {
              ragContext += `${index + 1}. ${result.content}\n`;
              ragContext += `   (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n\n`;
            }
          });
        }
        console.log('Contexto RAG adicionado com', ragResults.filter(r => r.similarity > 0.6).length, 'resultados relevantes');
      } else {
        console.log('Nenhum resultado RAG encontrado');
      }
    }

    // Adicionar contexto ao prompt
    let contextualPrompt = prompt;
    if (context.currentPage) {
      if (language === 'pt') {
        contextualPrompt += `\n\nContexto: Usuário está na página ${context.currentPage}`;
      } else {
        contextualPrompt += `\n\nContext: User is on page ${context.currentPage}`;
      }
    }
    if (context.currentProject) {
      if (language === 'pt') {
        contextualPrompt += `\nProjeto selecionado: ${context.currentProject.name} (ID: ${context.currentProject.id})`;
      } else {
        contextualPrompt += `\nSelected project: ${context.currentProject.name} (ID: ${context.currentProject.id})`;
      }
    }
    
    // Adicionar estatísticas reais ao contexto - COM VALIDAÇÃO
    if (projectStats) {
      if (language === 'pt') {
        contextualPrompt += `\n\n## Dados REAIS do projeto (USE APENAS ESTES NÚMEROS - NUNCA INVENTE OUTROS):`;
        contextualPrompt += `\n- Total de menções: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
        contextualPrompt += `\n- Canais ativos: ${projectStats.activeChannels}`;
        contextualPrompt += `\n- Vídeos totais: ${projectStats.totalVideos}`;
        
        if (projectStats.topChannels.length > 0) {
          contextualPrompt += `\n- Top canais por menções:`;
          projectStats.topChannels.forEach(ch => {
            contextualPrompt += `\n  - ${ch.name}: ${ch.mentions} menções`;
          });
        }
        
        contextualPrompt += `\n\nLEMBRETE: Use APENAS estes números. Se o usuário perguntar sobre algo que não está aqui (como alcance, sentiment score, etc), diga que não tem esses dados disponíveis no momento.`;
      } else {
        contextualPrompt += `\n\n## REAL project data (USE ONLY THESE NUMBERS - NEVER MAKE UP OTHERS):`;
        contextualPrompt += `\n- Total mentions: ${projectStats.totalMentions}`;
        contextualPrompt += `\n- Mentions today: ${projectStats.mentionsToday}`;
        contextualPrompt += `\n- Active channels: ${projectStats.activeChannels}`;
        contextualPrompt += `\n- Total videos: ${projectStats.totalVideos}`;
        
        if (projectStats.topChannels.length > 0) {
          contextualPrompt += `\n- Top channels by mentions:`;
          projectStats.topChannels.forEach(ch => {
            contextualPrompt += `\n  - ${ch.name}: ${ch.mentions} mentions`;
          });
        }
        
        contextualPrompt += `\n\nREMINDER: Use ONLY these numbers. If the user asks about something not here (like reach, sentiment score, etc), say you don't have that data available at the moment.`;
      }
    }
    
    // Adicionar dados RAG
    if (ragContext) {
      contextualPrompt += ragContext;
    }

    // Adicionar instrução FINAL e EXPLÍCITA sobre dados
    if (language === 'pt') {
      contextualPrompt += '\n\n🚨 LEMBRETE FINAL: NUNCA invente números! Use APENAS os dados fornecidos acima. Se não tiver um dado, diga que não tem.';
      contextualPrompt += '\n\nIMPORTANTE: Responda em português brasileiro.';
    } else {
      contextualPrompt += '\n\n🚨 FINAL REMINDER: NEVER make up numbers! Use ONLY the data provided above. If you don\'t have data, say you don\'t have it.';
      contextualPrompt += '\n\nIMPORTANT: Respond in English.';
    }

    console.log('=== PROMPT FINAL ENVIADO AO CLAUDE ===');
    console.log(contextualPrompt);

    // Chamar API do Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: contextualPrompt
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro na API do Claude:', error);
      throw new Error('Erro ao processar sua pergunta / Error processing your question');
    }

    const data = await response.json();
    const assistantResponse = data.content[0].text;
    
    console.log('=== RESPOSTA DO CLAUDE ===');
    console.log(assistantResponse);

    // Tentar parsear a resposta como JSON se contiver action
    try {
      const jsonResponse = JSON.parse(assistantResponse);
      return new Response(
        JSON.stringify(jsonResponse),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch {
      // Se não for JSON, retornar como texto
      return new Response(
        JSON.stringify({ content: assistantResponse }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = detectLanguage(error.message) === 'pt' 
      ? 'Poxa, encontrei um probleminha... 🤔 Tenta de novo em alguns segundos?'
      : 'Oops, I encountered a small issue... 🤔 Try again in a few seconds?';
      
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});