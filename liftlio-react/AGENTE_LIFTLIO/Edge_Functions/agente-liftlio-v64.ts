/**
 * Edge Function: Agente Liftlio v64 - AJUSTE FINAL
 * 
 * Correções dos 3 problemas encontrados:
 * 1. "me mostre os canais" → adicionar no pattern
 * 2. "quantos canais?" → criar pattern específico
 * 3. "como está o desempenho?" → adicionar no pattern performance
 */

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

// Mapeamento de intenções para funções RPC
const INTENT_TO_RPC = {
  'daily_status': 'get_complete_project_stats',
  'list_channels': 'list_all_channels',
  'show_tools': null,
  'performance': 'channel_performance_analysis',
  'engagement': 'video_engagement_metrics',
  'today_posts': null,
  'scheduled_posts': null
};

// Padrões CORRIGIDOS com os 3 ajustes
const INTENT_PATTERNS = {
  // Saudações e status
  daily_status: /oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|como estamos|status hoje|resumo do dia|como está|briefing|e aí|eai/i,
  
  // Ferramentas
  show_tools: /ferramentas|ferramenta|capacidades|o que você pode|o que vc pode|funcionalidades|suas funções|tools|comandos/i,
  
  // AJUSTE 1 e 2: Adicionar "me mostre" e "quantos canais"
  list_channels: /listar canais|liste os canais|todos os canais|quais canais|mostrar canais|canais monitorados|me mostre os canais|quantos canais/i,
  
  // AJUSTE 3: Adicionar "como está o desempenho"
  performance: /performance|desempenho|análise|métricas|estatísticas|como está o desempenho/i,
  
  engagement: /engajamento|curtidas|comentários|visualizações|views/i,
  today_posts: /posts de hoje|postagens hoje|o que foi postado|postado hoje/i,
  scheduled_posts: /posts agendados|agendamentos|próximos posts|vai postar/i
};

// Detecta intenção do usuário
function detectIntent(prompt: string): { intent: string; confidence: number } {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // Prioridade 1: Saudações curtas sempre mostram daily_status
  if (lowerPrompt.length <= 15 && /^(oi|olá|ola|e aí|eai|bom dia|boa tarde|boa noite)/.test(lowerPrompt)) {
    return { intent: 'daily_status', confidence: 0.95 };
  }
  
  // Prioridade 2: Verificar patterns específicos
  // IMPORTANTE: Verificar performance ANTES de daily_status para evitar conflito com "como está"
  if (INTENT_PATTERNS.performance.test(lowerPrompt)) {
    return { intent: 'performance', confidence: 0.9 };
  }
  
  // Depois verificar os outros patterns
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (intent !== 'performance' && pattern.test(lowerPrompt)) {
      return { intent, confidence: 0.9 };
    }
  }
  
  // Prioridade 3: Se pergunta curta com "?" e não foi pego acima, assume daily_status
  // MAS apenas se não contiver palavras-chave específicas
  if (lowerPrompt.length < 20 && lowerPrompt.includes('?') && 
      !lowerPrompt.includes('canais') && 
      !lowerPrompt.includes('ferramentas') &&
      !lowerPrompt.includes('desempenho')) {
    return { intent: 'daily_status', confidence: 0.7 };
  }
  
  return { intent: 'general', confidence: 0.5 };
}

// Formata resposta baseada nos dados
function formatResponse(intent: string, data: any, projectId: number): string {
  switch (intent) {
    case 'daily_status':
      if (data && typeof data === 'object') {
        const stats = data.get_complete_project_stats || data;
        return `📊 **Resumo de hoje:**
↑ **Posts realizados**: ${stats.total_mentions || 0}
📅 **Agendados**: ${stats.scheduled_mentions || 0}
📺 **Canais ativos**: ${stats.active_channels || 0}
🎬 **Vídeos monitorados**: ${stats.videos_monitored || 0}`;
      }
      break;
      
    case 'show_tools':
      return `🛠️ **Minhas ferramentas específicas:**
• 📊 **Estatísticas do projeto** - Status completo e métricas
• 📺 **Análise de canais** - Performance por canal
• 🎯 **Métricas de vídeos** - Engajamento detalhado
• ⏰ **Horários otimizados** - Melhores momentos para postar
• 📋 **Listagem de canais** - Todos os canais monitorados`;
      
    case 'list_channels':
      if (Array.isArray(data)) {
        const header = `📺 **${data.length} canais monitorados:**`;
        const channels = data.slice(0, 10).map(ch => 
          `• **${ch.channel_name}** (${(ch.subscriber_count/1000).toFixed(0)}K subs) - ${ch.response_rate}% resposta`
        );
        return `${header}\n${channels.join('\n')}`;
      }
      break;
      
    case 'performance':
      if (Array.isArray(data) && data.length > 0) {
        const topChannels = data.slice(0, 3).map(ch =>
          `• **${ch.channel_name}**: ${ch.performance_score}% score`
        );
        return `📈 **Top 3 Performance (30 dias):**\n${topChannels.join('\n')}`;
      }
      break;
      
    case 'engagement':
      if (Array.isArray(data) && data.length > 0) {
        const topVideos = data.slice(0, 3).map(v =>
          `• **${v.video_title?.substring(0, 40)}...**: ${v.engagement_rate}% eng.`
        );
        return `💫 **Top 3 Vídeos por Engajamento:**\n${topVideos.join('\n')}`;
      }
      break;
      
    case 'today_posts':
      return `📝 **Posts de hoje ainda não implementado**
Função em desenvolvimento.`;
      
    case 'scheduled_posts':
      return `📅 **Agendamentos ainda não implementado**
Função em desenvolvimento.`;
  }
  
  return `Não consegui processar os dados. Tente novamente.`;
}

// Handler principal
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, context } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    const projectId = context?.currentProject?.id ? parseInt(context.currentProject.id) : 58;
    
    // Detectar intenção
    const { intent, confidence } = detectIntent(prompt);
    console.log('Intent:', intent, 'Confidence:', confidence);
    
    let response: string;
    
    // Se detectou intenção com alta confiança, processar
    if (confidence > 0.6 && intent !== 'general') {
      
      // Caso especial: show_tools não precisa de RPC
      if (intent === 'show_tools') {
        response = formatResponse(intent, null, projectId);
      } 
      // Casos que precisam de RPC
      else {
        const rpcName = INTENT_TO_RPC[intent];
        
        if (rpcName) {
          try {
            // Preparar parâmetros baseados na função
            let params: any = {};
            
            switch (rpcName) {
              case 'get_complete_project_stats':
                params = { p_project_id: projectId };
                break;
              case 'list_all_channels':
                params = { p_project_id: projectId };
                break;
              case 'channel_performance_analysis':
                params = { p_project_id: projectId, p_days_back: 30 };
                break;
              case 'video_engagement_metrics':
                params = { p_project_id: projectId, p_limit: 10, p_min_comments: 0 };
                break;
            }
            
            console.log(`Calling RPC ${rpcName} with params:`, params);
            
            // Chamar RPC
            const { data, error } = await supabase.rpc(rpcName, params);
            
            if (error) {
              console.error('RPC error:', error);
              throw error;
            }
            
            console.log('RPC result:', data);
            
            // Formatar resposta
            response = formatResponse(intent, data, projectId);
          } catch (error) {
            console.error('Error executing RPC:', error);
            response = `Erro ao buscar dados. Verifique se o projeto ${projectId} existe.`;
          }
        } else {
          // Implementações diretas (today_posts, scheduled_posts)
          response = formatResponse(intent, null, projectId);
        }
      }
    } else {
      // Usar Claude para perguntas gerais
      response = await callClaude(prompt);
    }
    
    return new Response(
      JSON.stringify({ 
        response,
        intent,
        confidence
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Desculpe, ocorreu um erro. Tente novamente."
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});

// Função auxiliar para chamar Claude
async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `Você é o assistente AI do Liftlio. Seja EXTREMAMENTE conciso.
Máximo 3 linhas. Use markdown. Vá direto ao ponto.`
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}