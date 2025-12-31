import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
console.log('Claude 4 Sonnet Proxy function started');
// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
// Your Claude API key - usando variável de ambiente
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || 'YOUR_CLAUDE_API_KEY_HERE';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    // Verificar se a chave API está configurada
    if (!CLAUDE_API_KEY) {
      throw new Error('API key for Claude is not configured');
    }
    // Log para diagnóstico (removido em produção)
    console.log('CLAUDE_API_KEY configurado:', CLAUDE_API_KEY ? 'Sim (primeiros caracteres: ' + CLAUDE_API_KEY.substring(0, 5) + '...)' : 'Não');
    // Parse the request body
    const { prompt, messages, system, max_tokens = 1024, temperature = 0.7, model = "claude-sonnet-4-5-20250929", textOnly = false } = await req.json();
    // Prepare request data
    let requestBody;
    // Verificar se estamos usando o formato de conversa ou apenas prompt
    if (messages) {
      // Formato de conversa
      requestBody = {
        model: model,
        messages: messages,
        max_tokens: max_tokens,
        temperature: temperature
      };
      // Adicionar system message se fornecido
      if (system) {
        requestBody.system = system;
      }
    } else if (prompt) {
      // Formato de prompt único
      requestBody = {
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: max_tokens,
        temperature: temperature
      };
      // Adicionar system message se fornecido
      if (system) {
        requestBody.system = system;
      }
    } else {
      throw new Error('Either "prompt" or "messages" must be provided');
    }
    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
    // Log para diagnóstico
    console.log('Status da resposta Claude:', claudeResponse.status);
    // Handle API response
    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json();
      throw new Error(`Claude API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    // Return the Claude API response
    const data = await claudeResponse.json();
    // Verificar se o usuário quer apenas o texto ou a resposta completa
    if (textOnly && data.content && data.content.length > 0) {
      // Encontrar o primeiro bloco de texto no conteúdo
      const textContent = data.content.find((item)=>item.type === 'text');
      if (textContent && textContent.text) {
        return new Response(JSON.stringify({
          text: textContent.text
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }
    // Caso contrário, retorna a resposta completa
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    // Handle errors
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
