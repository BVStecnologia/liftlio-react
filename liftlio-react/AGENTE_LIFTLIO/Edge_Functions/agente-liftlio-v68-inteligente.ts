/**
 * Edge Function: Agente Liftlio v68 - INTELIGÊNCIA NATURAL
 * 
 * - Claude decide qual ferramenta usar
 * - Responde sempre na mesma língua
 * - Sem palavras-gatilho
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

// Mapeamento das ferramentas disponíveis
const AVAILABLE_TOOLS = {
  get_stats: async (projectId: number) => {
    const { data } = await supabase.rpc('get_complete_project_stats', { 
      p_project_id: projectId 
    });
    return data;
  },
  
  list_channels: async (projectId: number) => {
    const { data } = await supabase.rpc('list_all_channels', { 
      p_project_id: projectId 
    });
    return data;
  },
  
  get_performance: async (projectId: number) => {
    const { data } = await supabase.rpc('channel_performance_analysis', { 
      p_project_id: projectId,
      p_days_back: 30
    });
    return data;
  },
  
  get_engagement: async (projectId: number) => {
    const { data } = await supabase.rpc('video_engagement_metrics', { 
      p_project_id: projectId,
      p_limit: 10,
      p_min_comments: 0
    });
    return data;
  }
};

// Função principal que usa Claude
async function processRequest(prompt: string, projectId: number): Promise<string> {
  // Primeiro, perguntar ao Claude qual ferramenta usar
  const toolDecisionResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `You are the Liftlio AI assistant. Analyze the user's question and decide which tool to use.

Available tools:
- get_stats: Get project statistics (posts, channels, videos)
- list_channels: List all monitored YouTube channels
- get_performance: Analyze channel performance metrics
- get_engagement: Show video engagement metrics
- none: Answer without using tools

Respond with ONLY the tool name or "none". Nothing else.`
    })
  });
  
  const toolDecision = await toolDecisionResponse.json();
  const selectedTool = toolDecision.content[0].text.trim();
  
  // Executar a ferramenta se necessário
  let toolData = null;
  if (selectedTool !== 'none' && AVAILABLE_TOOLS[selectedTool]) {
    try {
      toolData = await AVAILABLE_TOOLS[selectedTool](projectId);
    } catch (error) {
      console.error('Tool execution error:', error);
    }
  }
  
  // Agora responder ao usuário
  const finalResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `You are the Liftlio AI assistant, specialized in YouTube channel monitoring and sentiment analysis.

CRITICAL RULES:
1. ALWAYS respond in the SAME LANGUAGE as the user's question
2. If user writes in Portuguese, respond in Portuguese
3. If user writes in English, respond in English
4. Be EXTREMELY concise (max 3-4 lines)
5. Use markdown formatting
6. Go straight to the point

${toolData ? `Here's the data from the system:\n${JSON.stringify(toolData, null, 2)}` : ''}

Context: The user is using Liftlio to monitor YouTube channels and analyze performance.

Your capabilities:
- View project statistics
- List monitored channels  
- Analyze channel performance
- Video engagement metrics
- Suggest optimal posting times

If you don't have specific data, suggest which capability could help.`
    })
  });
  
  const finalData = await finalResponse.json();
  return finalData.content[0].text;
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
    
    // Processar com Claude
    const response = await processRequest(prompt, projectId);
    
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
        response: "Desculpe, ocorreu um erro. Tente novamente. / Sorry, an error occurred. Please try again."
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});