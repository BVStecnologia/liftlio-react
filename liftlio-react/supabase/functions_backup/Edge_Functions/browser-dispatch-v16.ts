/**
 * Browser Dispatch Edge Function v16
 *
 * Called by pg_cron to dispatch pending browser tasks to the Browser Agent.
 * Runs every minute to check for pending tasks.
 *
 * Flow:
 * 1. CHECK OAUTH TOKEN STATUS (v15)
 * 2. Check if there's already a running task (if yes, skip)
 * 3. Query browser_tasks WHERE status = 'pending'
 *    - PRIORITY: Fresh tasks (next_retry_at IS NULL) first
 *    - Then: Eligible retries (next_retry_at <= NOW() AND retry_count < 3)
 * 4. Get browser_mcp_url from Projeto table
 * 5. Call Browser Agent HTTP API
 * 6. Update task status and result
 * 7. Handle ONLY unique callbacks (browser_logins, Mentions)
 *
 * CALLBACK ARCHITECTURE (v16 - NO DUPLICATION):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ TRIGGER SQL (update_settings_post_on_task_complete):       │
 * │   → Updates SMP.status                                     │
 * │   → Updates Mensagens.respondido                           │
 * │                                                             │
 * │ THIS EDGE FUNCTION (browser-dispatch):                     │
 * │   → Updates browser_logins (UNIQUE - only place that does) │
 * │   → Decrements Mentions (UNIQUE - only place that does)    │
 * │   → Does NOT touch SMP or Mensagens (trigger handles it)   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * RETRY SYSTEM (v13):
 * - retry_count: tracks attempts (max 3)
 * - next_retry_at: when task can retry (5 min delay)
 * - Fresh tasks have priority over retries
 * - After 3 failures: permanently failed with reason
 *
 * v14: Fixed callback detection
 * v15: Added OAuth token validation
 * v16: REMOVED duplicate callbacks - SMP/Mensagens now ONLY via Trigger SQL
 *
 * IMPORTANT: verify_jwt = false because this is called by pg_cron internally
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_BROWSER_HOST = '173.249.22.2';
const DEFAULT_BROWSER_PORT = '10101';
const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = 5;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // ========== CHECK OAUTH TOKEN STATUS (v15) ==========
    const { data: oauthConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'browser_oauth_token')
      .single();

    if (oauthConfig?.value?.status === 'expired') {
      console.log('[browser-dispatch] OAuth token EXPIRED - skipping dispatch');
      return new Response(JSON.stringify({
        message: 'OAuth token expired - dispatch paused',
        tokenStatus: 'expired',
        action: 'Renew token on VPS'
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    // ========== END OAUTH CHECK ==========

    // ========== CHECK IF ALREADY RUNNING ==========
    const { data: runningTasks } = await supabase
      .from('browser_tasks')
      .select('id, project_id, task_type, started_at')
      .eq('status', 'running')
      .gte('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (runningTasks && runningTasks.length > 0) {
      console.log(`Skipping: ${runningTasks.length} task(s) already running`);
      return new Response(JSON.stringify({
        message: 'Task already running, skipping',
        runningTasks: runningTasks.map(t => ({ id: t.id, type: t.task_type }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ========== GET NEXT PENDING TASK (FRESH FIRST, THEN RETRIES) ==========
    const now = new Date().toISOString();

    // First try: Get fresh tasks (next_retry_at IS NULL) with priority
    let { data: tasks, error: fetchError } = await supabase
      .from('browser_tasks')
      .select(`
        id,
        task,
        task_type,
        priority,
        metadata,
        project_id,
        retry_count,
        next_retry_at,
        Projeto!inner(id, browser_mcp_url)
      `)
      .eq('status', 'pending')
      .is('next_retry_at', null)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);

    // If no fresh tasks, try to get eligible retry tasks
    if (!tasks || tasks.length === 0) {
      const retryResult = await supabase
        .from('browser_tasks')
        .select(`
          id,
          task,
          task_type,
          priority,
          metadata,
          project_id,
          retry_count,
          next_retry_at,
          Projeto!inner(id, browser_mcp_url)
        `)
        .eq('status', 'pending')
        .lt('retry_count', MAX_RETRIES)
        .lte('next_retry_at', now)
        .order('next_retry_at', { ascending: true })
        .limit(1);

      tasks = retryResult.data;
      fetchError = retryResult.error;
    }

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending tasks', processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const task = tasks[0];
    const isRetry = task.retry_count > 0;
    console.log(`Processing task ${task.id} (${task.task_type})${isRetry ? ` [retry ${task.retry_count}/${MAX_RETRIES}]` : ' [fresh]'}`);

    try {
      const projeto = task.Projeto as any;
      let agentUrl = projeto?.browser_mcp_url
        ? (projeto.browser_mcp_url.endsWith('/agent/task')
            ? projeto.browser_mcp_url
            : `${projeto.browser_mcp_url}/agent/task`)
        : `http://${DEFAULT_BROWSER_HOST}:${DEFAULT_BROWSER_PORT}/agent/task`;

      // Mark as running
      await supabase
        .from('browser_tasks')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', task.id);

      // Dispatch to Browser Agent
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.task,
          taskId: task.id,
          maxIterations: 30,
          verbose: false
        })
      });

      // ========== HANDLE 409 - ANOTHER TASK RUNNING ==========
      if (agentResponse.status === 409) {
        console.log(`Agent returned 409 - scheduling retry`);
        await scheduleRetry(supabase, task, '409 - Agent busy with another task');

        return new Response(JSON.stringify({
          message: 'Agent busy, task scheduled for retry',
          taskId: task.id,
          retryCount: (task.retry_count || 0) + 1
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!agentResponse.ok) {
        const errorText = await agentResponse.text();
        throw new Error(`Agent returned ${agentResponse.status}: ${errorText}`);
      }

      const agentResult = await agentResponse.json();

      // Update task with result
      await supabase
        .from('browser_tasks')
        .update({
          status: agentResult.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          response: {
            result: agentResult.result,
            success: agentResult.success,
            duration: agentResult.duration
          },
          iterations_used: agentResult.iterations,
          actions_taken: agentResult.actions,
          behavior_used: agentResult.behaviorUsed || {},
          error_message: agentResult.success ? null : agentResult.result,
          // Reset retry fields on success
          retry_count: agentResult.success ? 0 : task.retry_count,
          next_retry_at: null
        })
        .eq('id', task.id);

      await handleTaskCallback(supabase, task, agentResult);

      return new Response(JSON.stringify({
        message: 'Task processed',
        taskId: task.id,
        success: agentResult.success
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (taskError) {
      console.error(`Error dispatching task ${task.id}:`, taskError);

      // Check if it's a 409 in the error message
      if (taskError.message?.includes('409')) {
        console.log('409 in error, scheduling retry');
        await scheduleRetry(supabase, task, '409 - Agent busy');

        return new Response(JSON.stringify({
          message: 'Agent busy (409), task scheduled for retry',
          taskId: task.id,
          retryCount: (task.retry_count || 0) + 1
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // For other errors, also use retry system
      await scheduleRetry(supabase, task, taskError.message);

      return new Response(JSON.stringify({
        message: 'Task error, scheduled for retry',
        taskId: task.id,
        error: taskError.message,
        retryCount: (task.retry_count || 0) + 1
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Dispatch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Schedule a task for retry or mark as permanently failed
 */
async function scheduleRetry(supabase: any, task: any, errorMessage: string): Promise<void> {
  const currentRetryCount = task.retry_count || 0;
  const newRetryCount = currentRetryCount + 1;

  if (newRetryCount >= MAX_RETRIES) {
    console.log(`Task ${task.id} exceeded max retries (${MAX_RETRIES}), marking as failed`);
    await supabase
      .from('browser_tasks')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `[PERMANENT] After ${MAX_RETRIES} attempts: ${errorMessage}`,
        retry_count: newRetryCount,
        next_retry_at: null
      })
      .eq('id', task.id);
  } else {
    const nextRetryAt = new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000);
    console.log(`Task ${task.id} scheduled for retry ${newRetryCount}/${MAX_RETRIES} at ${nextRetryAt.toISOString()}`);
    await supabase
      .from('browser_tasks')
      .update({
        status: 'pending',
        started_at: null,
        error_message: `[Retry ${newRetryCount}/${MAX_RETRIES}] ${errorMessage}`,
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt.toISOString()
      })
      .eq('id', task.id);
  }
}

/**
 * Analyze result text to determine if reply was REALLY successful
 * Used for Mentions decrement decision (not for SMP update - trigger handles that)
 */
function isRealSuccess(resultText: string): boolean {
  const lower = resultText.toLowerCase();

  // Check for explicit failure patterns FIRST
  const failurePatterns = [
    'error:', 'video_not_found', 'comment_not_found', 'comments_disabled',
    'login_required', 'reply_blocked', 'error_max_turns',
    'which comment would you like', 'which comment should i',
    'i can see several comments', 'i can see comments from',
    'err_tunnel', 'err_connection', 'sem conexão', 'no internet'
  ];

  if (failurePatterns.some(pattern => lower.includes(pattern))) {
    return false;
  }

  // Check for explicit success patterns
  const successPatterns = [
    'reply:success', 'successfully posted', 'successfully replied',
    'reply has been posted', 'reply was posted', 'posted successfully',
    'há 0 segundo', 'há 1 segundo', '0 seconds ago', '1 second ago'
  ];

  return successPatterns.some(pattern => lower.includes(pattern));
}

/**
 * Handle callbacks for UNIQUE operations only
 *
 * v16: REMOVED duplicate callbacks for SMP and Mensagens
 *      - SMP.status and Mensagens.respondido are now handled ONLY by Trigger SQL
 *      - This function ONLY handles: browser_logins + customers.Mentions
 */
async function handleTaskCallback(supabase: any, task: any, agentResult: any): Promise<void> {
  const resultText = agentResult.result || '';
  const metadata = task.metadata || {};

  // ========================================
  // BROWSER_LOGINS: Handle disconnection/connection status
  // (UNIQUE - Trigger SQL does NOT do this)
  // ========================================
  if (resultText.includes('DISCONNECTED')) {
    console.log(`[Callback v16] Session disconnected for project ${task.project_id}`);
    await supabase
      .from('browser_logins')
      .update({
        is_connected: false,
        last_error: 'Session disconnected',
        last_error_at: new Date().toISOString()
      })
      .eq('projeto_id', task.project_id)
      .eq('platform_name', 'youtube');
  }

  if (task.task_type === 'login' || task.task_type === 'verify') {
    if (resultText.includes('LOGIN_SUCCESS') || resultText.includes('ALREADY_LOGGED') || resultText.includes('VERIFIED')) {
      console.log(`[Callback v16] Login/verify success for project ${task.project_id}`);
      await supabase
        .from('browser_logins')
        .update({
          is_connected: true,
          connected_at: new Date().toISOString(),
          last_error: null
        })
        .eq('projeto_id', task.project_id);
    }
  }

  // ========================================
  // MENTIONS DECREMENT: Only for successful youtube_reply with tipo='produto'
  // (UNIQUE - Trigger SQL does NOT do this)
  // ========================================
  if (task.task_type === 'youtube_reply') {
    const tipoResposta = metadata.tipo_resposta || 'produto';

    if (isRealSuccess(resultText) && tipoResposta === 'produto') {
      console.log(`[Callback v16] Decrementing Mentions for project ${task.project_id}`);

      const { data: projeto } = await supabase
        .from('Projeto')
        .select('User id')
        .eq('id', task.project_id)
        .single();

      if (projeto?.['User id']) {
        const { data: customer } = await supabase
          .from('customers')
          .select('Mentions')
          .eq('user_id', projeto['User id'])
          .single();

        if (customer) {
          await supabase
            .from('customers')
            .update({ Mentions: Math.max((customer.Mentions || 0) - 1, 0) })
            .eq('user_id', projeto['User id']);
          console.log(`[Callback v16] Mentions decremented: ${customer.Mentions} -> ${Math.max((customer.Mentions || 0) - 1, 0)}`);
        }
      }
    }
  }

  // ========================================
  // NOTE: SMP and Mensagens updates are REMOVED
  // They are now handled ONLY by Trigger SQL: update_settings_post_on_task_complete
  // This eliminates duplication and ensures single source of truth
  // ========================================
}
