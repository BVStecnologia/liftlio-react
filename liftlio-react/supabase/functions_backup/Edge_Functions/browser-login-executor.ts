/**
 * browser-login-executor
 *
 * Edge Function ISOLADA para executar logins via browser agent.
 * NÃO modifica browser-proxy - sistema completamente separado.
 *
 * Criado: 2025-12-25
 * Autor: Claude Code
 *
 * FLUXO:
 * 1. Recebe dados do SQL Function browser_execute_login (fire-and-forget)
 * 2. Chama o agente correto via browser_mcp_url do projeto
 * 3. Passa taskId para agente atualizar browser_tasks automaticamente
 * 4. Espera resposta do agente (síncrono neste lado)
 * 5. Analisa resultado (LOGIN_SUCCESS, WAITING_PHONE, etc)
 * 6. Atualiza browser_logins.is_connected
 * 7. Realtime notifica frontend automaticamente
 *
 * IMPORTANTE: O agente (server-vnc.js) JÁ atualiza browser_tasks!
 * Esta Edge Function só precisa atualizar browser_logins.is_connected
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

interface AgentResponse {
  success: boolean;
  result?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas POST
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
    console.log(`[browser-login-executor] Task ID: ${task_id}`);
    console.log(`[browser-login-executor] Browser URL: ${browser_url}`);

    // Validar campos obrigatórios
    if (!task_id || !project_id || !login_id || !browser_url || !login_prompt) {
      console.error('[browser-login-executor] Missing required fields');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: task_id, project_id, login_id, browser_url, login_prompt'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Preparar prompt com variáveis substituídas
    const filledPrompt = login_prompt
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{password\}\}/g, password);

    console.log(`[browser-login-executor] Prompt length: ${filledPrompt.length} chars`);

    // 2. Chamar agente no browser_mcp_url CORRETO (por projeto!)
    const agentUrl = `${browser_url}/agent/task`;
    console.log(`[browser-login-executor] Calling agent at: ${agentUrl}`);

    let agentResult: AgentResponse;
    try {
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: filledPrompt,
          taskId: task_id,        // Agente usa isso para atualizar browser_tasks!
          projectId: project_id,
          model: 'claude-sonnet-4-20250514',
          maxIterations: 50
        })
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent returned status ${agentResponse.status}`);
      }

      agentResult = await agentResponse.json();
      console.log(`[browser-login-executor] Agent response success: ${agentResult.success}`);
    } catch (fetchError) {
      console.error(`[browser-login-executor] Failed to call agent:`, fetchError);

      // Atualizar browser_logins com erro de conexão
      await supabase
        .from('browser_logins')
        .update({
          last_error: `Failed to connect to browser agent: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          last_error_at: new Date().toISOString()
        })
        .eq('id', login_id);

      return new Response(JSON.stringify({
        success: false,
        error: `Failed to connect to browser agent at ${browser_url}`
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Analisar resultado (agente já atualizou browser_tasks!)
    const resultText = agentResult.result || '';
    console.log(`[browser-login-executor] Result text (first 200 chars): ${resultText.substring(0, 200)}`);

    let loginSuccess = false;
    let twoFAPhone = false;
    let twoFACode = false;

    // Detectar status do login
    if (resultText.includes('LOGIN_SUCCESS') ||
        resultText.includes('GOOGLE:SUCCESS') ||
        resultText.includes('ALREADY_LOGGED') ||
        resultText.includes('Successfully logged')) {
      loginSuccess = true;
      console.log('[browser-login-executor] Login SUCCESS detected');
    } else if (resultText.includes('WAITING_PHONE') ||
               resultText.includes('2-Step Verification') ||
               resultText.includes('phone')) {
      twoFAPhone = true;
      console.log('[browser-login-executor] WAITING_PHONE detected');
    } else if (resultText.includes('WAITING_CODE') ||
               resultText.includes('verification code')) {
      twoFACode = true;
      console.log('[browser-login-executor] WAITING_CODE detected');
    } else {
      console.log('[browser-login-executor] No success pattern detected');
    }

    // 4. Atualizar browser_logins (Realtime notifica frontend!)
    if (loginSuccess) {
      console.log(`[browser-login-executor] Updating login ${login_id} as connected`);

      const { error: updateError } = await supabase
        .from('browser_logins')
        .update({
          is_connected: true,
          connected_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null
        })
        .eq('id', login_id);

      if (updateError) {
        console.error('[browser-login-executor] Failed to update browser_logins:', updateError);
      }

      // Se Google, também marcar YouTube como conectado (SSO)
      if (platform_name === 'google') {
        console.log('[browser-login-executor] Google login - also connecting YouTube via SSO');

        const { error: youtubeError } = await supabase
          .from('browser_logins')
          .upsert({
            projeto_id: project_id,
            platform_name: 'youtube',
            login_email: email,
            uses_google_sso: true,
            google_login_id: login_id,
            is_connected: true,
            connected_at: new Date().toISOString(),
            is_active: true
          }, { onConflict: 'projeto_id,platform_name,login_email' });

        if (youtubeError) {
          console.error('[browser-login-executor] Failed to connect YouTube via SSO:', youtubeError);
        }
      }
    } else if (twoFAPhone || twoFACode) {
      console.log(`[browser-login-executor] 2FA detected - type: ${twoFAPhone ? 'phone' : 'code'}`);

      await supabase
        .from('browser_logins')
        .update({
          has_2fa: true,
          twofa_type: twoFAPhone ? 'phone' : 'code'
        })
        .eq('id', login_id);
    } else {
      // Falha ou resultado não reconhecido
      console.log('[browser-login-executor] Login failed or unrecognized result');

      await supabase
        .from('browser_logins')
        .update({
          last_error: resultText.substring(0, 255),
          last_error_at: new Date().toISOString()
        })
        .eq('id', login_id);
    }

    console.log('[browser-login-executor] Completed successfully');

    return new Response(JSON.stringify({
      success: true,
      loginSuccess,
      twoFAPhone,
      twoFACode,
      result: resultText.substring(0, 500) // Limitar tamanho da resposta
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[browser-login-executor] Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
