// =============================================
// Edge Function: browser-reply-executor
// Descrição: Executa reply via Browser Agent (Sistema 2)
// Criado: 2025-12-27
//
// FLUXO:
// 1. Recebe task_id, project_id, video_id, reply_text, etc.
// 2. Chama Browser Agent com prompt humanizado
// 3. Quando agente completa, atualiza:
//    - browser_tasks.response
//    - Settings messages posts.status = 'posted'
//    - Mensagens.respondido = true
//    - customers.Mentions-- (se tipo='produto')
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReplyRequest {
  task_id: string
  project_id: number
  video_id: string
  parent_comment_id: string
  reply_text: string
  mensagem_id: number
  settings_post_id: number
  tipo_resposta: string
  browser_url: string
  reply_prompt: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: ReplyRequest = await req.json()
    const {
      task_id,
      project_id,
      video_id,
      parent_comment_id,
      reply_text,
      mensagem_id,
      settings_post_id,
      tipo_resposta,
      browser_url,
      reply_prompt
    } = body

    console.log(`[browser-reply-executor] Starting reply task ${task_id} for project ${project_id}`)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update task status to 'running'
    await supabase
      .from('browser_tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', task_id)

    // Call Browser Agent
    const agentUrl = `${browser_url}/agent/task`
    console.log(`[browser-reply-executor] Calling agent at ${agentUrl}`)

    const agentResponse = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: reply_prompt
      })
    })

    const agentResult = await agentResponse.json()
    console.log(`[browser-reply-executor] Agent response:`, JSON.stringify(agentResult).substring(0, 500))

    // Determine success based on response
    const resultText = agentResult.result || agentResult.response || ''
    const isSuccess = resultText.includes('REPLY:SUCCESS') ||
                      resultText.includes('SUCCESS') ||
                      (agentResult.success === true)
    const likeSuccess = !resultText.includes('LIKE:FAILED')

    // Update browser_tasks with result
    await supabase
      .from('browser_tasks')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        response: {
          success: isSuccess,
          like_success: likeSuccess,
          result: resultText,
          agent_response: agentResult
        }
      })
      .eq('id', task_id)

    if (isSuccess) {
      console.log(`[browser-reply-executor] Reply successful, updating tables...`)

      // 1. Update Settings messages posts
      await supabase
        .from('Settings messages posts')
        .update({
          status: 'posted',
          postado: new Date().toISOString()
        })
        .eq('id', settings_post_id)

      // 2. Update Mensagens
      await supabase
        .from('Mensagens')
        .update({
          respondido: true
          // Note: youtube_comment_id não é retornado pelo browser agent
          // pois ele não tem acesso ao ID interno do YouTube
        })
        .eq('id', mensagem_id)

      // 3. Decrement Mentions (only for tipo='produto')
      if (tipo_resposta === 'produto') {
        // Get user_id from project
        const { data: project } = await supabase
          .from('Projeto')
          .select('User id')
          .eq('id', project_id)
          .single()

        if (project && project['User id']) {
          await supabase.rpc('decrement_mentions', {
            p_user_id: project['User id']
          })
          console.log(`[browser-reply-executor] Mentions decremented for project ${project_id}`)
        }
      }

      console.log(`[browser-reply-executor] All updates completed successfully`)
    } else {
      console.log(`[browser-reply-executor] Reply failed: ${resultText}`)

      // Update Settings messages posts with failure
      await supabase
        .from('Settings messages posts')
        .update({
          status: 'failed',
          postado: new Date().toISOString()
        })
        .eq('id', settings_post_id)
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        task_id,
        message: isSuccess ? 'Reply posted successfully' : 'Reply failed',
        result: resultText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[browser-reply-executor] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
