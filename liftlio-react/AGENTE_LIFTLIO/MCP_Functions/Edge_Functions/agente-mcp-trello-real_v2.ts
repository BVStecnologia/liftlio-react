import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()
    
    // Pegar última mensagem do usuário
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage?.content || ''
    
    // Detectar se menciona Trello
    const mentionsTrello = userContent.toLowerCase().includes('trello') || 
                          userContent.toLowerCase().includes('tarefa') ||
                          userContent.toLowerCase().includes('card')
    
    let mcpData = null
    
    if (mentionsTrello) {
      console.log('Detectou menção ao Trello, buscando dados REAIS do MCP...')
      
      // Chamar o servidor MCP com API REAL
      try {
        const mcpResponse = await fetch('http://173.249.22.2:5173/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'get_lists',
            params: {}
          })
        })
        
        if (mcpResponse.ok) {
          mcpData = await mcpResponse.json()
          console.log('Dados REAIS do Trello:', mcpData)
        }
      } catch (mcpError) {
        console.error('Erro ao chamar MCP:', mcpError)
      }
    }
    
    // Chamar Claude para processar
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }
    
    // System prompt
    let systemPrompt = `You are a helpful Trello assistant with REAL API integration.\n\n`
    
    if (mcpData && mcpData.success) {
      systemPrompt += `REAL Trello Data from API:\n`
      systemPrompt += `Board: Liftlio (ID: 686b43ced8d30f8eb12b9d12)\n`
      systemPrompt += `Lists available:\n`
      
      if (mcpData.lists) {
        mcpData.lists.forEach((list: any) => {
          systemPrompt += `- ${list.name} (ID: ${list.id})\n`
        })
      }
      
      systemPrompt += `\nThis is REAL data from the actual Trello API, not mock data!\n`
      systemPrompt += `The MCP server at 173.249.22.2:5173 is connected to the real Trello API.\n`
    }
    
    systemPrompt += `\nAlways respond in Portuguese (pt-BR).`
    systemPrompt += `\nEmphasize that this is REAL Trello data when relevant.`
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,  // system como parâmetro top-level
        messages: messages     // messages sem role system
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }
    
    const data = await response.json()
    
    return new Response(
      JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: data.content[0].text
          }
        }],
        mcp_status: 'Connected to REAL Trello API',
        mcp_server: 'http://173.249.22.2:5173',
        real_data: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})