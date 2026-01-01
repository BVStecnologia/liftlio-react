/**
 * Browser Dispatch Edge Function v18
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
 * 7. Handle callbacks for specific task_types
 *
 * RETRY SYSTEM (v13):
 * - retry_count: tracks attempts (max 3)
 * - next_retry_at: when task can retry (5 min delay)
 * - Fresh tasks have priority over retries
 * - After 3 failures: permanently failed with reason
 *
 * v14: Fixed callback detection - now detects "successfully posted/replied" in natural language
 * v15: Added OAuth token validation before dispatch - skips if token expired
 * v16: Single source of truth for callbacks - trigger handles SMP/Mensagens
 * v17: Added hasPermanentError check for youtube_comment (VIDEO_NOT_FOUND, etc.)
 * v18: TEXT-BASED SUCCESS DETECTION - fixes false negatives when agent returns success=false
 *      but result text shows success patterns like "successfully posted" or "há 0 segundo"
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

// v18 LOCAL FILE - Synced with deployed version
// See deployed function for full implementation
// Key changes in v18:
// - Added determineActualSuccess() function
// - Removed early return on !success in isReplySuccessful() and isCommentSuccessful()
// - Uses actualSuccess for status determination instead of agentResult.success

console.log("browser-dispatch v18 - See Supabase Edge Functions for deployed code");
