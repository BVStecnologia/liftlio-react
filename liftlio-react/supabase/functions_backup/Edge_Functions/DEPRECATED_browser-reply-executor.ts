// =============================================
// Edge Function: browser-reply-executor
// Descrição: Executa reply via Browser Agent (Sistema 2)
// Versão: 3 - Fire-and-forget pattern
// Criado: 2025-12-27
// Atualizado: 2025-12-28 - Fire-and-forget + passa taskId
//
// FLUXO v3 (Fire-and-forget):
// 1. Recebe task_id, project_id, video_id, reply_text, etc.
// 2. Marca browser_tasks como 'running'
// 3. Dispara requisição para Browser Agent SEM ESPERAR resposta
// 4. Retorna imediatamente para evitar timeout (60s)
// 5. Browser Agent atualiza Supabase quando termina (callback)
//
// IMPORTANTE:
// - Edge Function tem timeout de 60s
// - Tasks humanizadas levam 4-5 minutos
// - Por isso usamos fire-and-forget
// - Browser Agent é responsável por atualizar:
//   - browser_tasks.status/response
//   - Settings messages posts.status = 'posted'
//   - Mensagens.respondido = true
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

    // Call Browser Agent - FIRE AND FORGET!
    // Não esperamos a resposta pois task humanizada leva 4-5 min
    // Browser Agent vai atualizar Supabase quando terminar
    const agentUrl = `${browser_url}/agent/task`
    console.log(`[browser-reply-executor] Fire-and-forget call to ${agentUrl}`)

    // Fire-and-forget: don't await, let it run in background
    fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: reply_prompt,
        taskId: task_id,  // Browser Agent will use this to update Supabase
        metadata: {
          settings_post_id: settings_post_id,
          mensagem_id: mensagem_id,
          project_id: project_id,
          tipo_resposta: tipo_resposta
        }
      })
    }).catch(err => {
      // Log error but don't fail - fire and forget
      console.error(`[browser-reply-executor] Fire-and-forget error (ignored):`, err.message)
    })

    console.log(`[browser-reply-executor] Task dispatched, returning immediately (fire-and-forget)`)

    // Return immediately - Browser Agent will update DB when done
    return new Response(
      JSON.stringify({
        success: true,
        task_id,
        message: 'Task dispatched to Browser Agent (fire-and-forget)',
        note: 'Browser Agent will update database when task completes'
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
