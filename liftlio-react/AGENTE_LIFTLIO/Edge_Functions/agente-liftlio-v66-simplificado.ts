/**
 * Edge Function: Agente Liftlio v66 - SIMPLIFICADO
 * 
 * Abordagem minimalista:
 * - Detecta apenas intenções MUITO óbvias
 * - Deixa Claude resolver o resto com sua inteligência natural
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

// Sistema MUITO mais simples
const SIMPLE_INTENTS = {
  // Se menciona "ferramentas" ou "capacidades", mostra ferramentas
  show_tools: (text: string) => /ferrament|capacidad|o que (você|vc) (pode|faz|sabe)/i.test(text),
  
  // Se menciona "canais", lista canais
  list_channels: (text: string) => /canal|canais/i.test(text) && !text.includes('performance'),
  
  // Se menciona "performance" ou "desempenho", mostra performance
  performance: (text: string) => /performance|desempenho/i.test(text),
  
  // Se menciona "engajamento", "curtidas" ou "vídeos populares"
  engagement: (text: string) => /engajamento|curtidas|comentários|vídeos? (populares|com mais)/i.test(text),
  
  // Saudações curtas sempre mostram status
  daily_status: (text: string) => text.length < 15 && /^(oi|olá|e aí|bom dia|boa tarde|boa noite)/i.test(text)
};

// Função única que chama Claude com contexto específico do Liftlio
async function processWithClaude(prompt: string, projectId: number): Promise<string> {
  const lowerPrompt = prompt.toLowerCase();
  
  // Verificar intenções simples primeiro
  if (SIMPLE_INTENTS.show_tools(lowerPrompt)) {
    return `🛠️ **Minhas ferramentas específicas:**
• 📊 **Estatísticas do projeto** - Status completo e métricas
• 📺 **Análise de canais** - Performance por canal
• 🎯 **Métricas de vídeos** - Engajamento detalhado
• ⏰ **Horários otimizados** - Melhores momentos para postar
• 📋 **Listagem de canais** - Todos os canais monitorados`;
  }
  
  // Se for saudação curta, buscar status
  if (SIMPLE_INTENTS.daily_status(lowerPrompt)) {
    const { data } = await supabase.rpc('get_complete_project_stats', { 
      p_project_id: projectId 
    });
    
    if (data) {
      return `📊 **Resumo de hoje:**
↑ **Posts realizados**: ${data.total_mentions || 0}
📅 **Agendados**: ${data.scheduled_mentions || 0}
📺 **Canais ativos**: ${data.active_channels || 0}
🎬 **Vídeos monitorados**: ${data.videos_monitored || 0}`;
    }
  }
  
  // Se menciona canais, listar
  if (SIMPLE_INTENTS.list_channels(lowerPrompt)) {
    const { data } = await supabase.rpc('list_all_channels', { 
      p_project_id: projectId 
    });
    
    if (data && data.length > 0) {
      const channels = data.slice(0, 10).map(ch => 
        `• **${ch.channel_name}** (${(ch.subscriber_count/1000).toFixed(0)}K subs)`
      );
      return `📺 **${data.length} canais monitorados:**\n${channels.join('\n')}`;
    }
  }
  
  // Se menciona performance, mostrar
  if (SIMPLE_INTENTS.performance(lowerPrompt)) {
    const { data } = await supabase.rpc('channel_performance_analysis', { 
      p_project_id: projectId,
      p_days_back: 30
    });
    
    if (data && data.length > 0) {
      const top = data.slice(0, 3).map(ch =>
        `• **${ch.channel_name}**: ${ch.performance_score}% score`
      );
      return `📈 **Top 3 Performance (30 dias):**\n${top.join('\n')}`;
    }
  }
  
  // Se menciona engajamento, mostrar vídeos populares
  if (SIMPLE_INTENTS.engagement(lowerPrompt)) {
    const { data } = await supabase.rpc('video_engagement_metrics', { 
      p_project_id: projectId,
      p_limit: 10,
      p_min_comments: 0
    });
    
    if (data && data.length > 0) {
      const topVideos = data.slice(0, 3).map(v =>
        `• **${v.video_title?.substring(0, 40)}...**: ${v.engagement_rate}% eng.`
      );
      return `💫 **Top 3 Vídeos por Engajamento:**\n${topVideos.join('\n')}`;
    }
  }
  
  // Para TUDO MAIS, usar Claude com contexto Liftlio
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
      system: `Você é o assistente AI do Liftlio, especializado em monitoramento de vídeos e análise de sentimentos.
      
CONTEXTO: O usuário está usando o sistema Liftlio para monitorar canais do YouTube e analisar performance.

Suas capacidades incluem:
- Ver estatísticas do projeto
- Listar canais monitorados  
- Analisar performance de canais
- Métricas de engajamento de vídeos
- Sugerir horários otimizados

Seja EXTREMAMENTE conciso (máximo 3 linhas). Use markdown. Vá direto ao ponto.

Se o usuário perguntar sobre dados específicos que você não tem, sugira usar uma das ferramentas mencionadas acima.`
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

// Handler principal SIMPLIFICADO
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
    
    // Processar com Claude (que já inclui verificações simples)
    const response = await processWithClaude(prompt, projectId);
    
    return new Response(
      JSON.stringify({ response }),
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