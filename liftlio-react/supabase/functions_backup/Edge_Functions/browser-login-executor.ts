/**
 * browser-login-executor
 *
 * Edge Function para executar logins via browser agent.
 * Atualizado: 2025-12-27 - Suporta múltiplos tipos de 2FA
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LoginRequest {
  task_id: string;
  project_id: number;
  login_id: number;
  platform_name: string;
  email: string;
  password: string;
  browser_url: string;
  login_prompt: string;
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
    const body: LoginRequest = await req.json();
    const { task_id, project_id, login_id, platform_name, email, password, browser_url, login_prompt } = body;

    console.log(`[browser-login-executor] Starting login for project ${project_id}, platform ${platform_name}`);

    if (!task_id || !project_id || !login_id || !browser_url || !login_prompt) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prepare prompt with credentials
    const filledPrompt = login_prompt
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{password\}\}/g, password);

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
          maxIterations: 50
        })
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent returned status ${agentResponse.status}`);
      }
      agentResult = await agentResponse.json();
    } catch (fetchError) {
      console.error('[browser-login-executor] Failed to call agent:', fetchError);
      await supabase.from('browser_logins').update({
        last_error: `Failed to connect to browser agent: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`,
        last_error_at: new Date().toISOString()
      }).eq('id', login_id);
      return new Response(JSON.stringify({ success: false, error: 'Agent connection failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resultText = agentResult.result || '';
    console.log(`[browser-login-executor] Result: ${resultText.substring(0, 300)}`);

    // Detect result type
    let updateData: Record<string, any> = {};

    if (resultText.includes('GOOGLE:SUCCESS') || resultText.includes('ALREADY_LOGGED')) {
      // SUCCESS - Login complete
      console.log('[browser-login-executor] Login SUCCESS');
      updateData = {
        is_connected: true,
        connected_at: new Date().toISOString(),
        has_2fa: false,
        twofa_type: null,
        last_error: null,
        last_error_at: null
      };

      // Also connect YouTube if Google
      if (platform_name === 'google') {
        await supabase.from('browser_logins').upsert({
          projeto_id: project_id,
          platform_name: 'youtube',
          login_email: email,
          uses_google_sso: true,
          google_login_id: login_id,
          is_connected: resultText.includes('YOUTUBE:SUCCESS'),
          connected_at: new Date().toISOString(),
          is_active: true
        }, { onConflict: 'projeto_id,platform_name,login_email' });
      }

    } else if (resultText.includes('WAITING_PHONE')) {
      // 2FA - Phone tap required
      console.log('[browser-login-executor] 2FA Phone required');
      updateData = { has_2fa: true, twofa_type: 'phone' };

    } else if (resultText.includes('WAITING_CODE_SMS')) {
      // 2FA - SMS code required
      console.log('[browser-login-executor] 2FA SMS code required');
      updateData = { has_2fa: true, twofa_type: 'sms' };

    } else if (resultText.includes('WAITING_CODE_AUTH')) {
      // 2FA - Authenticator code required
      console.log('[browser-login-executor] 2FA Authenticator code required');
      updateData = { has_2fa: true, twofa_type: 'authenticator' };

    } else if (resultText.includes('WAITING_CODE')) {
      // 2FA - Generic code (SMS or Auth)
      console.log('[browser-login-executor] 2FA code required (generic)');
      updateData = { has_2fa: true, twofa_type: 'code' };

    } else if (resultText.includes('WAITING_SECURITY_KEY')) {
      // 2FA - Security key (not supported)
      console.log('[browser-login-executor] Security key required (not supported)');
      updateData = {
        has_2fa: true,
        twofa_type: 'security_key',
        last_error: 'Security key not supported. Please use a different 2FA method.',
        last_error_at: new Date().toISOString()
      };

    } else if (resultText.includes('INVALID_CREDENTIALS')) {
      // Wrong password
      console.log('[browser-login-executor] Invalid credentials');
      updateData = {
        last_error: 'Invalid email or password. Please check your credentials.',
        last_error_at: new Date().toISOString()
      };

    } else if (resultText.includes('CAPTCHA_FAILED')) {
      // Captcha failed
      console.log('[browser-login-executor] Captcha failed');
      updateData = {
        last_error: 'CAPTCHA verification failed. Please try again.',
        last_error_at: new Date().toISOString()
      };

    } else if (resultText.includes('ACCOUNT_LOCKED')) {
      // Account locked
      console.log('[browser-login-executor] Account locked');
      updateData = {
        last_error: 'Account is locked. Please unlock it via Google.',
        last_error_at: new Date().toISOString()
      };

    } else {
      // Unknown result
      console.log('[browser-login-executor] Unknown result');
      updateData = {
        last_error: resultText.substring(0, 255),
        last_error_at: new Date().toISOString()
      };
    }

    // Update browser_logins
    await supabase.from('browser_logins').update(updateData).eq('id', login_id);

    return new Response(JSON.stringify({
      success: true,
      loginSuccess: resultText.includes('SUCCESS'),
      twoFAType: updateData.twofa_type || null,
      result: resultText.substring(0, 500)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[browser-login-executor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
