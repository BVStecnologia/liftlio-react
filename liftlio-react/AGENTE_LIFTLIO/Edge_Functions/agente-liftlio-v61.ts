/**
 * Edge Function: Agente Liftlio v61
 * 
 * Assistente AI inteligente e conciso com sistema de tools
 * 
 * MELHORIAS v61:
 * - Sistema de tools com funções específicas
 * - Detecção inteligente de intenções
 * - Respostas concisas e contextualizadas
 * - Formatação consistente
 * - Performance otimizada
 * - Modelo Claude Sonnet 4 (claude-sonnet-4-20250514)
 * 
 * JSON de teste:
 * {
 *   "prompt": "como estamos hoje?",
 *   "context": {
 *     "currentProject": {
 *       "id": "58",
 *       "name": "HW"
 *     }
 *   },
 *   "userId": "test-user",
 *   "sessionId": "test-session"
 * }
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

// Interface para tools
interface AgentTool {
  name: string;
  function_name: string;
  category: string;
  parameters: any[];
}

// Interface para intenção detectada
interface DetectedIntent {
  intent: string;
  confidence: number;
  tool?: AgentTool;
  parameters?: Record<string, any>;
}

/**
 * Sistema de detecção de intenções
 */
class IntentDetector {
  private patterns = {
    // Status e resumos
    daily_status: /como estamos|status hoje|resumo do dia|situação atual|como está|briefing/i,
    project_status: /status do projeto|informações do projeto|dados do projeto/i,
    
    // Listagens
    list_channels: /listar canais|todos os canais|quais canais|mostrar canais|canais monitorados/i,
    today_posts: /posts de hoje|postagens hoje|o que foi postado hoje|publicações de hoje/i,
    scheduled_posts: /posts agendados|agendamentos|próximos posts|vai postar quando/i,
    
    // Análises
    performance: /performance|desempenho|análise|métricas|estatísticas|resultados/i,
    engagement: /engajamento|curtidas|comentários|visualizações|interações/i,
    
    // Contagens
    count_items: /quantos|quantas|número de|total de|quantidade/i,
    
    // Navegação
    navigation: /ir para|navegar|abrir|mostrar página|levar para/i,
    
    // Ajuda
    help: /ajuda|help|o que você pode|comandos|instruções/i
  };

  detect(prompt: string, language: 'pt' | 'en'): DetectedIntent {
    const lowerPrompt = prompt.toLowerCase();
    
    // Verificar cada padrão
    for (const [intent, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(lowerPrompt)) {
        return {
          intent,
          confidence: 0.8,
          parameters: this.extractParameters(lowerPrompt, intent)
        };
      }
    }
    
    // Se não encontrou padrão específico, tentar inferir
    if (lowerPrompt.length < 20 && lowerPrompt.includes('?')) {
      return { intent: 'daily_status', confidence: 0.6 };
    }
    
    return { intent: 'general', confidence: 0.5 };
  }

  private extractParameters(prompt: string, intent: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extrair datas
    const hoje = /hoje|today/i.test(prompt);
    const ontem = /ontem|yesterday/i.test(prompt);
    if (hoje) params.date = new Date().toISOString().split('T')[0];
    if (ontem) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      params.date = yesterday.toISOString().split('T')[0];
    }
    
    // Extrair números
    const numberMatch = prompt.match(/(\d+)/);
    if (numberMatch) {
      params.limit = parseInt(numberMatch[1]);
    }
    
    return params;
  }
}

/**
 * Sistema de execução de tools
 */
class ToolExecutor {
  async execute(toolName: string, params: Record<string, any>): Promise<any> {
    try {
      // Buscar informações da tool
      const { data: tool, error: toolError } = await supabase
        .from('agent_tools')
        .select('*')
        .eq('name', toolName)
        .single();
      
      if (toolError || !tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      
      // Executar função SQL correspondente
      const { data, error } = await supabase.rpc(tool.function_name, params);
      
      if (error) throw error;
      
      // Registrar uso
      await supabase.rpc('log_tool_usage', {
        p_tool_name: toolName,
        p_user_id: params.userId || 'anonymous',
        p_project_id: params.project_id,
        p_params: params,
        p_execution_time: 0,
        p_success: true
      });
      
      return data;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }
}

/**
 * Formatador de respostas concisas
 */
class ResponseFormatter {
  format(data: any, intent: string, language: 'pt' | 'en'): string {
    switch (intent) {
      case 'daily_status':
        return this.formatDailyBriefing(data, language);
      
      case 'list_channels':
        return this.formatChannelList(data, language);
      
      case 'today_posts':
        return this.formatPostsList(data, language);
      
      case 'performance':
        return this.formatPerformance(data, language);
      
      case 'engagement':
        return this.formatEngagement(data, language);
      
      default:
        return this.formatGeneric(data, language);
    }
  }

  private formatDailyBriefing(data: any[], language: 'pt' | 'en'): string {
    if (!data || data.length === 0) {
      return language === 'pt' 
        ? "Ainda não há atividade hoje." 
        : "No activity yet today.";
    }
    
    const lines = data.map(item => 
      `${item.trend} **${item.metric_name}**: ${item.value}`
    );
    
    const header = language === 'pt' 
      ? "📊 **Resumo de hoje:**" 
      : "📊 **Today's summary:**";
    
    return `${header}\n${lines.join('\n')}`;
  }

  private formatChannelList(data: any[], language: 'pt' | 'en'): string {
    if (!data || data.length === 0) {
      return language === 'pt' 
        ? "Nenhum canal encontrado." 
        : "No channels found.";
    }
    
    const header = language === 'pt'
      ? `📺 **${data.length} canais monitorados:**`
      : `📺 **${data.length} monitored channels:**`;
    
    const channels = data.slice(0, 10).map(ch => 
      `• **${ch.channel_name}** (${ch.subscriber_count} subs, ${ch.avg_views} views)`
    );
    
    if (data.length > 10) {
      channels.push(language === 'pt' 
        ? `... e mais ${data.length - 10} canais`
        : `... and ${data.length - 10} more channels`
      );
    }
    
    return `${header}\n${channels.join('\n')}`;
  }

  private formatPostsList(data: any[], language: 'pt' | 'en'): string {
    if (!data || data.length === 0) {
      return language === 'pt' 
        ? "Nenhum post hoje." 
        : "No posts today.";
    }
    
    const posted = data.filter(p => p.post_status === '✅');
    const scheduled = data.filter(p => p.post_status === '📅');
    
    let response = language === 'pt' 
      ? `📝 **Posts de hoje:**\n` 
      : `📝 **Today's posts:**\n`;
    
    if (posted.length > 0) {
      response += language === 'pt' ? '\n**Postados:**\n' : '\n**Posted:**\n';
      response += posted.map(p => 
        `${p.post_time} - ${p.channel_name}: "${p.post_content}"`
      ).join('\n');
    }
    
    if (scheduled.length > 0) {
      response += language === 'pt' ? '\n\n**Agendados:**\n' : '\n\n**Scheduled:**\n';
      response += scheduled.map(p => 
        `${p.post_time} - ${p.channel_name}: "${p.post_content}"`
      ).join('\n');
    }
    
    return response;
  }

  private formatPerformance(data: any[], language: 'pt' | 'en'): string {
    const header = language === 'pt' 
      ? "📈 **Análise de Performance:**" 
      : "📈 **Performance Analysis:**";
    
    const metrics = data.map(item => 
      `• **${item.metric}**: ${item.value} (${item.insight})`
    );
    
    return `${header}\n${metrics.join('\n')}`;
  }

  private formatEngagement(data: any[], language: 'pt' | 'en'): string {
    const header = language === 'pt' 
      ? "💫 **Métricas de Engajamento:**" 
      : "💫 **Engagement Metrics:**";
    
    const metrics = data.map(item => 
      `${item.emoji} **${item.engagement_type}**: ${item.total_count.toLocaleString()} (${item.percentage})`
    );
    
    return `${header}\n${metrics.join('\n')}`;
  }

  private formatGeneric(data: any, language: 'pt' | 'en'): string {
    if (typeof data === 'string') return data;
    if (Array.isArray(data) && data.length === 0) {
      return language === 'pt' ? "Nenhum resultado encontrado." : "No results found.";
    }
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Detecta o idioma da mensagem
 */
function detectLanguage(text: string): 'pt' | 'en' {
  const ptPatterns = /\b(olá|oi|obrigad|por favor|você|está|são|com|para|mais|pode|ajud|precis|quero|saber|fazer|tem|ter|qual|quais|quando|onde|como|quanto|hoje|ontem|postag)\b/i;
  return ptPatterns.test(text) ? 'pt' : 'en';
}

/**
 * Gera resposta usando Claude com prompt otimizado
 */
async function generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Modelo mais recente
        max_tokens: 500, // Limitado para respostas concisas
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        system: systemPrompt
      })
    });
    
    if (!response.ok) {
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, context, userId, sessionId } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    const projectId = context?.currentProject?.id;
    const language = detectLanguage(prompt);
    
    // Sistema de detecção de intenções
    const intentDetector = new IntentDetector();
    const detectedIntent = intentDetector.detect(prompt, language);
    console.log('Intent detected:', detectedIntent);
    
    // Sistema de execução de tools
    const toolExecutor = new ToolExecutor();
    const formatter = new ResponseFormatter();
    
    let response: string;
    
    // Se tem alta confiança na intenção, usar tool específica
    if (detectedIntent.confidence > 0.7 && detectedIntent.intent !== 'general') {
      try {
        // Mapear intenção para tool
        const toolMap: Record<string, string> = {
          'daily_status': 'daily_briefing',
          'list_channels': 'list_channels',
          'today_posts': 'today_posts',
          'scheduled_posts': 'scheduled_posts',
          'performance': 'performance_analysis',
          'engagement': 'engagement_metrics'
        };
        
        const toolName = toolMap[detectedIntent.intent];
        if (toolName) {
          // Preparar parâmetros
          const params = {
            project_id: projectId,
            ...detectedIntent.parameters
          };
          
          // Executar tool
          const toolResult = await toolExecutor.execute(toolName, params);
          
          // Formatar resposta
          response = formatter.format(toolResult, detectedIntent.intent, language);
        } else {
          // Usar Claude para intenções sem tool específica
          const systemPrompt = language === 'pt'
            ? `Você é o assistente AI do Liftlio. Seja EXTREMAMENTE conciso e direto. 
               Máximo 3-4 linhas. Use formatação markdown. Foque apenas no essencial.`
            : `You are Liftlio's AI assistant. Be EXTREMELY concise and direct. 
               Maximum 3-4 lines. Use markdown formatting. Focus only on essentials.`;
          
          response = await generateResponse(systemPrompt, prompt);
        }
      } catch (toolError) {
        console.error('Tool execution error:', toolError);
        // Fallback para Claude
        response = await generateResponse(
          language === 'pt' 
            ? "Responda de forma concisa em no máximo 3 linhas." 
            : "Answer concisely in maximum 3 lines.",
          prompt
        );
      }
    } else {
      // Usar Claude para perguntas gerais
      const systemPrompt = language === 'pt'
        ? `Você é o assistente AI do Liftlio, uma plataforma de monitoramento de vídeos.
           REGRA PRINCIPAL: Seja EXTREMAMENTE conciso. Máximo 3-4 linhas.
           Use markdown para formatação. Vá direto ao ponto.`
        : `You are Liftlio's AI assistant, a video monitoring platform.
           MAIN RULE: Be EXTREMELY concise. Maximum 3-4 lines.
           Use markdown for formatting. Get straight to the point.`;
      
      response = await generateResponse(systemPrompt, prompt);
    }
    
    // Salvar conversa
    if (userId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        project_id: projectId,
        session_id: sessionId,
        message: prompt,
        response: response,
        intent: detectedIntent.intent,
        language: language
      });
    }
    
    return new Response(
      JSON.stringify({ 
        response,
        intent: detectedIntent.intent,
        confidence: detectedIntent.confidence
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in agente-liftlio v61:', error);
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