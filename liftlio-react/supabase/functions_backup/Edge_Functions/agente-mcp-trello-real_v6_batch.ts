import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Timeout dinâmico baseado na complexidade da operação
const calculateTimeout = (operations: string[]): number => {
  const baseTimeout = 30000 // 30 segundos base
  const perOperationTimeout = 15000 // 15 segundos por operação
  const maxTimeout = 390000 // 6.5 minutos (deixando margem do limite de 6.6min)
  
  const calculatedTimeout = baseTimeout + (operations.length * perOperationTimeout)
  return Math.min(calculatedTimeout, maxTimeout)
}

// Executar múltiplas operações MCP em paralelo
const executeMCPBatch = async (operations: any[]) => {
  const promises = operations.map(async (op) => {
    try {
      const response = await fetch('http://173.249.22.2:5173/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op)
      })
      
      if (response.ok) {
        const data = await response.json()
        return { success: true, operation: op.method, data }
      } else {
        return { success: false, operation: op.method, error: `Status ${response.status}` }
      }
    } catch (error) {
      return { success: false, operation: op.method, error: error.message }
    }
  })
  
  return await Promise.all(promises)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Criar AbortController para timeout dinâmico
  const controller = new AbortController()
  
  try {
    const { messages } = await req.json()
    
    // Pegar última mensagem do usuário
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage?.content || ''
    const lowerContent = userContent.toLowerCase()
    
    // Detectar tipo de operação e complexidade
    const operations = []
    let targetListId = null
    
    // Detectar menções a pessoas
    if (lowerContent.includes('stev')) {
      targetListId = '686b440c1850daf5c7b67d47' // Steve To Do Items
    } else if (lowerContent.includes('valdair')) {
      targetListId = '686b4422d297ee28b3d92163' // Valdair
    }
    
    // Sempre buscar listas se menciona Trello
    if (lowerContent.includes('trello') || lowerContent.includes('card') || lowerContent.includes('tarefa')) {
      operations.push({
        method: 'get_lists',
        params: {}
      })
    }
    
    // Buscar cards se tem lista alvo
    if (targetListId) {
      operations.push({
        method: 'get_cards_by_list',
        params: { listId: targetListId }
      })
    }
    
    // Detectar operações de criação
    if (lowerContent.includes('criar') || lowerContent.includes('adicionar') || lowerContent.includes('novo')) {
      // Extrair quantidades (ex: "criar 4 tarefas")
      const quantityMatch = lowerContent.match(/(\d+)\s*(tarefas?|cards?)/i)
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1
      
      // Adicionar operações de criação
      for (let i = 0; i < Math.min(quantity, 10); i++) { // Limite de 10 por segurança
        operations.push({
          method: 'add_card_to_list',
          params: {
            listId: targetListId || '686b4422d297ee28b3d92163', // Default Valdair
            name: `Task ${i + 1} created by AI`,
            description: `Created at ${new Date().toISOString()}`
          }
        })
      }
    }
    
    // Detectar operações de movimentação
    if (lowerContent.includes('mover') || lowerContent.includes('completar') || lowerContent.includes('finalizar')) {
      // Buscar cards para poder movê-los
      if (!operations.some(op => op.method === 'get_cards_by_list')) {
        operations.push({
          method: 'get_cards_by_list',
          params: { listId: targetListId || '686b4422d297ee28b3d92163' }
        })
      }
    }
    
    // Calcular timeout baseado nas operações
    const timeout = calculateTimeout(operations.map(op => op.method))
    setTimeout(() => controller.abort(), timeout)
    
    console.log(`Executando ${operations.length} operações MCP com timeout de ${timeout}ms`)
    
    // Executar todas as operações em paralelo
    let batchResults = []
    if (operations.length > 0) {
      batchResults = await executeMCPBatch(operations)
    }
    
    // Processar resultados
    const results = {
      lists: null,
      cards: null,
      created: [],
      moved: [],
      errors: []
    }
    
    batchResults.forEach(result => {
      if (result.success) {
        switch (result.operation) {
          case 'get_lists':
            results.lists = result.data.lists
            break
          case 'get_cards_by_list':
            results.cards = result.data.cards
            break
          case 'add_card_to_list':
            results.created.push(result.data.card)
            break
          case 'move_card':
            results.moved.push(result.data.card)
            break
        }
      } else {
        results.errors.push(result)
      }
    })
    
    // Chamar Claude para processar
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }
    
    // System prompt com resultados
    let systemPrompt = `You are a helpful Trello assistant with REAL API integration and BATCH operation capabilities.

CRITICAL RULES:
1. NEVER invent or make up card names, dates, or data
2. ONLY use the real data provided in this prompt
3. Report on operations performed (created, moved, read)
4. Be specific about what was done

BATCH OPERATION RESULTS:
`
    
    if (results.lists) {
      systemPrompt += `\nAvailable Lists (${results.lists.length} total):\n`
      results.lists.forEach((list: any) => {
        systemPrompt += `- ${list.name} (ID: ${list.id})\n`
      })
    }
    
    if (results.cards && results.cards.length > 0) {
      systemPrompt += `\nCards Found (${results.cards.length} total):\n`
      const sortedCards = results.cards.sort((a: any, b: any) => 
        new Date(b.dateLastActivity).getTime() - new Date(a.dateLastActivity).getTime()
      )
      sortedCards.slice(0, 10).forEach((card: any, index: number) => {
        systemPrompt += `${index + 1}. "${card.name}"\n`
      })
    }
    
    if (results.created.length > 0) {
      systemPrompt += `\nCards Created (${results.created.length} total):\n`
      results.created.forEach((card: any) => {
        systemPrompt += `- "${card.name}" (ID: ${card.id})\n`
      })
    }
    
    if (results.moved.length > 0) {
      systemPrompt += `\nCards Moved (${results.moved.length} total):\n`
      results.moved.forEach((card: any) => {
        systemPrompt += `- "${card.name}" moved to ${card.idList}\n`
      })
    }
    
    if (results.errors.length > 0) {
      systemPrompt += `\nErrors (${results.errors.length}):\n`
      results.errors.forEach((error: any) => {
        systemPrompt += `- ${error.operation}: ${error.error}\n`
      })
    }
    
    systemPrompt += `
\nOPERATION SUMMARY:
- Total operations: ${operations.length}
- Successful: ${batchResults.filter(r => r.success).length}
- Failed: ${batchResults.filter(r => !r.success).length}
- Execution time window: ${timeout}ms

Always respond in Portuguese (pt-BR).
Report what was done clearly and concisely.
If multiple cards were created, list them.
If cards were moved, say which ones and where.
`
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // SEMPRE usar Claude Sonnet 4
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages
      }),
      signal: controller.signal
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
        mcp_status: 'Batch operations completed',
        mcp_server: 'http://173.249.22.2:5173',
        real_data: true,
        model_used: 'claude-sonnet-4-20250514',
        batch_info: {
          total_operations: operations.length,
          successful: batchResults.filter(r => r.success).length,
          failed: batchResults.filter(r => !r.success).length,
          timeout_ms: timeout,
          cards_created: results.created.length,
          cards_moved: results.moved.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error:', error)
    
    // Verificar se foi timeout
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ 
          error: 'Operation timeout - too many operations requested',
          suggestion: 'Try requesting fewer operations at once'
        }),
        { 
          status: 408,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})