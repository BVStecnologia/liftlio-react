/**
 * browser-verify-executor
 *
 * Edge Function para verificar se login foi concluído após 2FA phone approval.
 * Tarefa rápida - só checa se está logado.
 * Criado: 2025-12-27
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyRequest {
  task_id: string;
  project_id: number;
  login_id: number;
  platform_name: string;
  browser_url: string;
  verify_prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body: VerifyRequest = await req.json();
    const { task_id, project_id, login_id, platform_name, browser_url, verify_prompt } = body;

    console.log(`[browser-verify-executor] Verifying login for project ${project_id}`);

    if (!task_id || !project_id || !login_id || !browser_url || !verify_prompt) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call agent with verify prompt
    const agentUrl = `${browser_url}/agent/task-fast`;
    let agentResult;

    try {
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: verify_prompt,
          taskId: task_id,
          projectId: project_id,
          model: 'claude-sonnet-4-20250514',
          maxIterations: 15  // Quick check, less iterations
        })
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent returned status ${agentResponse.status}`);
      }
      agentResult = await agentResponse.json();
    } catch (fetchError) {
      console.error('[browser-verify-executor] Failed to call agent:', fetchError);
      await supabase.from('browser_logins').update({
        last_error: 'Failed to connect to browser agent',
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
      return new Response(JSON.stringify({ success: false, error: 'Agent connection failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resultText = agentResult.result || '';
    console.log(`[browser-verify-executor] Result: ${resultText.substring(0, 200)}`);

    // Check result
    if (resultText.includes('GOOGLE:SUCCESS') || resultText.includes('LOGGED_IN')) {
      console.log('[browser-verify-executor] Login verified - SUCCESS');

      await supabase.from('browser_logins').update({
        is_connected: true,
        connected_at: new Date().toISOString(),
        has_2fa: false,
        twofa_type: null,
        last_error: null,
        last_error_at: null
      }).eq('id', login_id);

      // Also connect YouTube if Google
      if (platform_name === 'google') {
        const { data: loginData } = await supabase
          .from('browser_logins')
          .select('login_email')
          .eq('id', login_id)
          .single();

        if (loginData?.login_email) {
          await supabase.from('browser_logins').upsert({
            projeto_id: project_id,
            platform_name: 'youtube',
            login_email: loginData.login_email,
            uses_google_sso: true,
            google_login_id: login_id,
            is_connected: resultText.includes('YOUTUBE:SUCCESS'),
            connected_at: new Date().toISOString(),
            is_active: true
          }, { onConflict: 'projeto_id,platform_name,login_email' });
        }
      }
    } else if (resultText.includes('NOT_LOGGED_IN')) {
      console.log('[browser-verify-executor] Not logged in yet');
      await supabase.from('browser_logins').update({
        last_error: 'Not logged in. Please try connecting again.',
        last_error_at: new Date().toISOString(),
        has_2fa: false,
        twofa_type: null
      }).eq('id', login_id);
    } else if (resultText.includes('STILL_WAITING_2FA')) {
      console.log('[browser-verify-executor] Still waiting for 2FA approval');
      // Keep the 2FA state, user needs to approve on phone
    } else {
      console.log('[browser-verify-executor] Unknown result');
      await supabase.from('browser_logins').update({
        last_error: resultText.substring(0, 255),
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
    }

    return new Response(JSON.stringify({
      success: true,
      verified: resultText.includes('SUCCESS') || resultText.includes('LOGGED_IN'),
      result: resultText.substring(0, 500)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[browser-verify-executor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
