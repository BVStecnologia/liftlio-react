/**
 * browser-2fa-executor
 *
 * Edge Function para submeter código 2FA (SMS ou Authenticator).
 * Criado: 2025-12-27
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CodeRequest {
  task_id: string;
  project_id: number;
  login_id: number;
  platform_name: string;
  code: string;
  browser_url: string;
  submit_code_prompt: string;
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
    const body: CodeRequest = await req.json();
    const { task_id, project_id, login_id, platform_name, code, browser_url, submit_code_prompt } = body;

    console.log(`[browser-2fa-executor] Submitting 2FA code for project ${project_id}`);

    if (!task_id || !project_id || !login_id || !code || !browser_url || !submit_code_prompt) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Replace {{code}} placeholder in prompt
    const filledPrompt = submit_code_prompt.replace(/\{\{code\}\}/g, code);

    // Call agent
    const agentUrl = `${browser_url}/agent/task`;
    let agentResult;

    try {
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: filledPrompt,
          taskId: task_id,
          projectId: project_id,
          model: 'claude-sonnet-4-20250514',
          maxIterations: 25
        })
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent returned status ${agentResponse.status}`);
      }
      agentResult = await agentResponse.json();
    } catch (fetchError) {
      console.error('[browser-2fa-executor] Failed to call agent:', fetchError);
      await supabase.from('browser_logins').update({
        last_error: 'Failed to connect to browser agent',
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
      return new Response(JSON.stringify({ success: false, error: 'Agent connection failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resultText = agentResult.result || '';
    console.log(`[browser-2fa-executor] Result: ${resultText.substring(0, 200)}`);

    // Check result
    if (resultText.includes('GOOGLE:SUCCESS') || resultText.includes('SUCCESS')) {
      console.log('[browser-2fa-executor] Code accepted - SUCCESS');

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
    } else if (resultText.includes('CODE_INVALID') || resultText.includes('wrong code')) {
      console.log('[browser-2fa-executor] Code invalid');
      await supabase.from('browser_logins').update({
        last_error: 'Invalid code. Please check and try again.',
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
    } else if (resultText.includes('CODE_EXPIRED')) {
      console.log('[browser-2fa-executor] Code expired');
      await supabase.from('browser_logins').update({
        last_error: 'Code expired. Please request a new code.',
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
    } else if (resultText.includes('ADDITIONAL_VERIFICATION')) {
      console.log('[browser-2fa-executor] Additional verification needed');
      await supabase.from('browser_logins').update({
        last_error: 'Additional verification required. Please check your account.',
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
    } else {
      console.log('[browser-2fa-executor] Unknown result');
      await supabase.from('browser_logins').update({
        last_error: resultText.substring(0, 255),
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
    }

    return new Response(JSON.stringify({
      success: true,
      codeAccepted: resultText.includes('SUCCESS'),
      result: resultText.substring(0, 500)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[browser-2fa-executor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
