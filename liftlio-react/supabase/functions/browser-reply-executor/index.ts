// =============================================
// Edge Function: browser-reply-executor
// Descrição: Executa reply via Browser Agent (Sistema 2)
// Criado: 2025-12-27
// Atualizado: 2025-12-30 - Detecção de sucesso mais rigorosa
//
// FLUXO:
// 1. Recebe task_id, project_id, video_id, reply_text, etc.
// 2. Chama Browser Agent com prompt humanizado
// 3. Quando agente completa, atualiza:
//    - browser_tasks.response
//    - Settings messages posts.status = 'posted' (APENAS se realmente postou)
//    - Mensagens.respondido = true
//    - customers.Mentions-- (se tipo='produto')
//
// IMPORTANTE: Só marca como SUCCESS se o reply foi VERIFICADO como postado
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

    // Determine success based on response - RIGOROSO!
    const resultText = (agentResult.result || agentResult.response || '').toLowerCase()
    const originalResultText = agentResult.result || agentResult.response || ''

    // ===== DETECÇÃO DE ERROS (verificar PRIMEIRO) =====
    const isVideoError = resultText.includes('video_not_found') ||
                         resultText.includes('unavailable') ||
                         resultText.includes('private video') ||
                         resultText.includes('video is not available')

    const isCommentError = resultText.includes('comment_not_found') ||
                           resultText.includes('which comment') ||
                           resultText.includes('could not find the comment')

    const isLoginError = resultText.includes('login_required') ||
                         resultText.includes('sign in to')

    const isCommentsDisabled = resultText.includes('comments_disabled') ||
                               resultText.includes('comments are turned off')

    const hasError = isVideoError || isCommentError || isLoginError || isCommentsDisabled

    // ===== DETECÇÃO DE SUCESSO REAL (padrões explícitos) =====
    const successPatterns = [
      'reply:success',
      'successfully posted',
      'successfully replied',
      'reply has been successfully',
      'reply was posted',
      'reply has been posted',
      'há 0 segundo',
      'há 1 segundo',
      '0 seconds ago',
      '1 second ago'
    ]

    const hasSuccessMarker = successPatterns.some(pattern => resultText.includes(pattern))

    // Sucesso APENAS se tem marcador explícito E não tem erro
    const isSuccess = hasSuccessMarker && !hasError
    const likeSuccess = !resultText.includes('like:failed')

    // Determinar status e tipo de erro
    let finalStatus = 'completed'
    let errorType: string | null = null

    if (isVideoError) {
      finalStatus = 'failed'
      errorType = 'VIDEO_NOT_FOUND'
    } else if (isCommentError) {
      finalStatus = 'failed'
      errorType = 'COMMENT_NOT_FOUND'
    } else if (isLoginError) {
      finalStatus = 'failed'
      errorType = 'LOGIN_REQUIRED'
    } else if (isCommentsDisabled) {
      finalStatus = 'failed'
      errorType = 'COMMENTS_DISABLED'
    } else if (!isSuccess) {
      finalStatus = 'failed'
      errorType = 'NO_SUCCESS_MARKER'
    }

    console.log(`[browser-reply-executor] Detection: isSuccess=${isSuccess}, hasError=${hasError}, errorType=${errorType}`)

    // Update browser_tasks with result
    await supabase
      .from('browser_tasks')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        response: {
          success: isSuccess,
          like_success: likeSuccess,
          result: originalResultText,
          agent_response: agentResult,
          error_type: errorType
        }
      })
      .eq('id', task_id)

    if (isSuccess) {
      console.log(`[browser-reply-executor] Reply VERIFIED as posted, updating tables...`)

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
        })
        .eq('id', mensagem_id)

      // 3. Decrement Mentions (only for tipo='produto')
      if (tipo_resposta === 'produto') {
        // Get user_id from project
        const { data: project } = await supabase
          .from('Projeto')
          .select('"User id"')
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
      console.log(`[browser-reply-executor] Reply failed (${errorType}): ${originalResultText.substring(0, 200)}`)

      // Update Settings messages posts with appropriate error status
      // VIDEO_NOT_FOUND e COMMENT_NOT_FOUND = erro do conteúdo (não reprocessar)
      // LOGIN_REQUIRED = erro de sessão (pode reprocessar depois)
      const smpStatus = (errorType === 'VIDEO_NOT_FOUND' || errorType === 'COMMENT_NOT_FOUND' || errorType === 'COMMENTS_DISABLED')
        ? 'skipped'   // Não vai aparecer para retry - conteúdo inválido
        : 'error'     // Pode aparecer para retry - erro temporário

      await supabase
        .from('Settings messages posts')
        .update({
          status: smpStatus,
          postado: new Date().toISOString()
        })
        .eq('id', settings_post_id)

      console.log(`[browser-reply-executor] SMP ${settings_post_id} marked as '${smpStatus}'`)
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        task_id,
        message: isSuccess ? 'Reply posted successfully' : `Reply failed: ${errorType}`,
        result: originalResultText,
        error_type: errorType
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
