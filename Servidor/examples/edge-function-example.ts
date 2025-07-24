// Exemplo de Edge Function Supabase usando o MCP Trello
// Este é um exemplo de como SERIA se o MCP estivesse funcionando

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Permitir CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { action, params } = await req.json()

    // Chamar MCP Trello no servidor
    const mcpResponse = await fetch('http://173.249.22.2:5173/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: action,
        params: params
      })
    })

    const result = await mcpResponse.json()

    // Exemplos de uso:
    switch(action) {
      case 'create_epic_card':
        // Criar card espetacular
        const card = await fetch('http://173.249.22.2:5173/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'add_card_to_list',
            params: {
              listId: '686b4422d297ee28b3d92163',
              name: `🚀 ${params.title.toUpperCase()} - REVOLUTIONARY UPDATE!`,
              description: `# ${params.title}\n\n## 🎯 What's New\n${params.description}\n\n## 💫 Impact\n- 10X faster performance\n- Zero configuration needed\n- Works like magic!\n\n---\n*Created by Liftlio AI Agent*`
            }
          })
        })
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Epic card created!',
          card: card
        }), {
          headers: { 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

/* COMO USAR:

1. Deploy no Supabase:
   supabase functions deploy trello-mcp-agent

2. Chamar da sua aplicação:
   const response = await supabase.functions.invoke('trello-mcp-agent', {
     body: {
       action: 'create_epic_card',
       params: {
         title: 'New AI Feature',
         description: 'We just launched amazing AI capabilities!'
       }
     }
   })

3. Outras ações disponíveis:
   - list_boards
   - get_lists
   - add_card_to_list
   - move_card
   - attach_image_to_card
*/