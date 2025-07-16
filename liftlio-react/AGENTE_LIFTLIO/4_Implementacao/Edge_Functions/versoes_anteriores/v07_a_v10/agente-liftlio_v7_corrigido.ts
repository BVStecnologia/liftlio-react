// @ts-nocheck
/**
 * Edge Function: agente-liftlio (v7 - Correção de tipos)
 * 
 * Descrição:
 * Versão corrigida do assistente AI do Liftlio com integração RAG funcionando.
 * 
 * Correções v7:
 * - Corrigido problema de conversão de tipos no search_project_rag
 * - Melhor tratamento de erros na busca RAG
 * - Logs mais detalhados para debug
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
      
      // Total de vídeos únicos
      supabase
        .from('Mensagens')
        .select('video_id')
        .eq('project_id', projectId)
        .not('video_id', 'is', null),
      
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
                .select('video_id')
                .eq('project_id', projectId)
                .not('video_id', 'is', null)
            )
        ),
      
      // Top canais por menções
      supabase
        .from('Mensagens')
        .select(`
          video_id,
          Videos!inner(
            scanner_id,
            Scanner de videos do youtube!inner(
              canal
            )
          )
        `)
        .eq('project_id', projectId)
        .not('video_id', 'is', null)
    ]);

    // Processar resultados
    const totalMentions = mensagensResult.count || 0;
    const mentionsToday = mensagensHojeResult.count || 0;
    
    // Contar vídeos únicos
    const uniqueVideoIds = new Set(videosResult.data?.map(v => v.video_id) || []);
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

    return {
      totalMentions,
      mentionsToday,
      totalVideos,
      activeChannels,
      topChannels
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

const systemPrompt = `Você é o Agente Liftlio, um assistente AI inteligente e amigável criado para ajudar usuários com sua plataforma de marketing e branding automatizado.

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
- Forneça informações específicas do projeto quando disponível
- Use APENAS os dados fornecidos no contexto, NUNCA invente números
- Se não tiver dados específicos, diga que precisa verificar

### NUNCA:
- Invente dados ou estatísticas
- Fale sobre campos de tabelas ou detalhes técnicos internos
- Responda nada fora do escopo do Liftlio
- Use jargão técnico desnecessário
- Seja prolixo ou robótico
- Exponha informações sensíveis (senhas, tokens, etc.)

## 🛠️ Suas Capacidades

1. **Informações e Suporte**
   - Explicar como o Liftlio funciona
   - Ajudar com problemas e dúvidas
   - Fornecer dados específicos do projeto do usuário
   - Guiar o usuário pelas funcionalidades

2. **Navegação e Orientação**
   - /dashboard - Visão geral e métricas
   - /monitoring - Monitoramento de vídeos  
   - /mentions - Menções e comentários
   - /scanner - Scanner de vídeos do YouTube
   - /projects - Gerenciamento de projetos
   - /integrations - Integrações disponíveis
   - /settings - Configurações da conta

## 📊 Usando Dados do Contexto

IMPORTANTE: Use APENAS os dados fornecidos no contexto projectStats. NUNCA invente números!

Se tiver os dados, responda naturalmente:
- "Vejo que você tem X menções totais..."
- "Hoje você teve X novas menções..."
- "Seus X canais ativos estão monitorando Y vídeos..."

Se NÃO tiver os dados:
- "Deixe-me verificar os dados do seu projeto..."
- "Preciso acessar o painel para ver essas informações..."

Quando o usuário pedir para navegar, responda com:
{
  "content": "Vou te levar para [nome da página]...",
  "action": "navigate",
  "data": { "path": "/caminho-da-pagina" }
}

Lembre-se: Você não é apenas um assistente, você é o melhor amigo do usuário no mundo do marketing digital!`;

/**
 * Busca dados relevantes do projeto usando RAG
 */
async function searchProjectData(prompt: string, projectId: string) {
  try {
    console.log('Buscando dados RAG para projeto:', projectId);
    console.log('Tipo do projectId:', typeof projectId, 'Valor:', projectId);
    
    // Gerar embedding
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: prompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('Erro ao gerar embedding:', embeddingError);
      return null;
    }

    console.log('Embedding gerado com sucesso, tamanho:', embeddingData.embedding.length);

    // CORREÇÃO: Garantir que projectId seja número
    const projectIdNumber = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
    
    console.log('Chamando search_project_rag com projectId:', projectIdNumber, 'tipo:', typeof projectIdNumber);

    // Buscar dados relevantes
    const { data: searchResults, error: searchError } = await supabase.rpc('search_project_rag', {
      query_embedding: embeddingData.embedding,
      project_filter: projectIdNumber, // CORREÇÃO: usar project_filter em vez de project_id_param
      similarity_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('Erro na busca RAG:', searchError);
      console.error('Detalhes:', JSON.stringify(searchError, null, 2));
      return null;
    }

    console.log('Resultados da busca RAG:', searchResults?.length || 0, 'registros encontrados');
    
    if (searchResults && searchResults.length > 0) {
      console.log('Amostra do primeiro resultado:', {
        content: searchResults[0].content?.substring(0, 100) + '...',
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
        JSON.stringify({ error: 'Prompt é obrigatório' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Prompt recebido:', prompt);
    console.log('Projeto do contexto:', context.currentProject);
    console.log('Project_id direto:', project_id);

    // Determinar o ID do projeto (pode vir de diferentes formas)
    const projectIdToUse = project_id || context.currentProject?.id;
    
    console.log('ProjectId a ser usado:', projectIdToUse, 'tipo:', typeof projectIdToUse);

    // Buscar estatísticas reais do projeto
    let projectStats = null;
    if (projectIdToUse) {
      projectStats = await getProjectStats(String(projectIdToUse));
      console.log('Estatísticas do projeto:', projectStats);
    }

    // Buscar dados RAG complementares
    let ragContext = '';
    if (projectIdToUse) {
      const ragResults = await searchProjectData(prompt, String(projectIdToUse));
      
      if (ragResults && ragResults.length > 0) {
        ragContext = '\n\n## Dados complementares do projeto (via RAG):\n';
        ragResults.forEach((result: any, index: number) => {
          ragContext += `${index + 1}. ${result.content}\n`;
          ragContext += `   (Relevância: ${(result.similarity * 100).toFixed(1)}%)\n\n`;
        });
        console.log('Contexto RAG adicionado:', ragResults.length, 'resultados');
      } else {
        console.log('Nenhum resultado RAG encontrado');
      }
    }

    // Adicionar contexto ao prompt
    let contextualPrompt = prompt;
    if (context.currentPage) {
      contextualPrompt += `\n\nContexto: Usuário está na página ${context.currentPage}`;
    }
    if (context.currentProject) {
      contextualPrompt += `\nProjeto selecionado: ${context.currentProject.name} (ID: ${context.currentProject.id})`;
    }
    
    // Adicionar estatísticas reais ao contexto
    if (projectStats) {
      contextualPrompt += `\n\n## Dados REAIS do projeto (use APENAS estes números):`;
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
    }
    
    // Adicionar dados RAG
    if (ragContext) {
      contextualPrompt += ragContext;
    }

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
      throw new Error('Erro ao processar sua pergunta');
    }

    const data = await response.json();
    const assistantResponse = data.content[0].text;

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
    return new Response(
      JSON.stringify({ 
        error: 'Poxa, encontrei um probleminha... 🤔 Tenta de novo em alguns segundos?',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});