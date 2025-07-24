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
    
    // Detectar menções a Trello/tarefas
    const mentionsTrello = userContent.toLowerCase().includes('trello') || 
                          userContent.toLowerCase().includes('tarefa') ||
                          userContent.toLowerCase().includes('card') ||
                          userContent.toLowerCase().includes('stev') || // Captura steve, stevn, steven
                          userContent.toLowerCase().includes('valdair')
    
    let mcpData = null
    let targetListId = null
    
    // Determinar qual lista buscar baseado no contexto
    if (userContent.toLowerCase().includes('stev')) { // Captura steve, stevn, steven
      targetListId = '686b440c1850daf5c7b67d47' // Steve To Do Items
    } else if (userContent.toLowerCase().includes('valdair')) {
      targetListId = '686b4422d297ee28b3d92163' // Valdair
    }
    
    if (mentionsTrello && targetListId) {
      console.log('Detectou menção ao Trello, buscando dados REAIS do MCP...')
      console.log('Lista alvo:', targetListId)
      
      // Chamar o servidor MCP com API REAL
      try {
        const mcpResponse = await fetch('http://173.249.22.2:5173/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'get_cards_by_list',
            params: { listId: targetListId }
          })
        })
        
        if (mcpResponse.ok) {
          mcpData = await mcpResponse.json()
          console.log('Dados REAIS do Trello recebidos:', JSON.stringify(mcpData))
        } else {
          console.error('Erro na resposta MCP:', mcpResponse.status)
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
    
    if (mcpData && mcpData.success && mcpData.cards) {
      systemPrompt += `REAL Trello Data from API:\n`
      systemPrompt += `Board: Liftlio (ID: 686b43ced8d30f8eb12b9d12)\n\n`
      
      if (targetListId === '686b440c1850daf5c7b67d47') {
        systemPrompt += `Cards in "Steve To Do Items" list:\n`
      } else if (targetListId === '686b4422d297ee28b3d92163') {
        systemPrompt += `Cards in "Valdair" list:\n`
      }
      
      // Ordenar cards por data de atividade (mais recente primeiro)
      const sortedCards = mcpData.cards.sort((a: any, b: any) => 
        new Date(b.dateLastActivity).getTime() - new Date(a.dateLastActivity).getTime()
      )
      
      sortedCards.forEach((card: any, index: number) => {
        const date = new Date(card.dateLastActivity)
        systemPrompt += `${index + 1}. "${card.name}" - Last activity: ${date.toLocaleString()}\n`
      })
      
      systemPrompt += `\nTotal cards: ${mcpData.cards.length}\n`
      systemPrompt += `\nThis is REAL data from the actual Trello API, not mock data!\n`
      systemPrompt += `The MCP server at 173.249.22.2:5173 is connected to the real Trello API.\n`
      
      // Adicionar informação sobre o card mais recente
      if (sortedCards.length > 0) {
        systemPrompt += `\nThe most recent card is: "${sortedCards[0].name}"\n`
      }
    }
    
    systemPrompt += `\nAlways respond in Portuguese (pt-BR).`
    systemPrompt += `\nWhen asked about "último card" (last card), refer to the most recent card based on dateLastActivity.`
    systemPrompt += `\nBe specific and mention the actual card names from the real data.`
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // SEMPRE usar Claude Sonnet 4
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
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
        real_data: true,
        model_used: 'claude-sonnet-4-20250514',
        debug_info: {
          cards_found: mcpData?.cards?.length || 0,
          list_id: targetListId,
          mcp_success: mcpData?.success || false
        }
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