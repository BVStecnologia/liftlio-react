/**
 * Browser Webhook Edge Function
 *
 * Receives callbacks from Browser Agent when tasks complete.
 * Used for async task completion (long-running tasks).
 *
 * The Browser Agent calls this webhook with:
 * - taskId: UUID of the task
 * - success: boolean
 * - result: string (final result)
 * - iterations: number
 * - actions: array of actions taken
 * - data: any scraped/queried data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('BROWSER_WEBHOOK_SECRET') || 'liftlio-browser-webhook-2025'

interface WebhookPayload {
  taskId: string
  success: boolean
  result: string
  iterations?: number
  actions?: string[]
  data?: any
  error?: string
}

Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify webhook secret (simple auth)
    const authHeader = req.headers.get('X-Webhook-Secret')
    if (authHeader !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const payload: WebhookPayload = await req.json()

    // Validate required fields
    if (!payload.taskId) {
      return new Response(JSON.stringify({ error: 'taskId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Received webhook for task ${payload.taskId}: success=${payload.success}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Update the task with results
    const { error: updateError } = await supabase
      .from('browser_tasks')
      .update({
        status: payload.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        response: {
          result: payload.result,
          success: payload.success,
          data: payload.data || null
        },
        iterations_used: payload.iterations || 0,
        actions_taken: payload.actions || [],
        error_message: payload.success ? null : (payload.error || payload.result)
      })
      .eq('id', payload.taskId)

    if (updateError) {
      console.error('Error updating task:', updateError)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Task ${payload.taskId} updated successfully`)

    return new Response(JSON.stringify({
      success: true,
      message: `Task ${payload.taskId} updated`,
      status: payload.success ? 'completed' : 'failed'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
