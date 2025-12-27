-- =============================================
-- Função: browser_execute_login
-- Descrição: Dispara login via browser agent em background (fire-and-forget)
-- Criado: 2025-12-25
-- Autor: Claude Code
--
-- IMPORTANTE:
-- - Usa net.http_post para chamar Edge Function (não-bloqueante)
-- - Retorna task_id IMEDIATAMENTE (usuário pode sair da página)
-- - O agente (server-vnc.js) atualiza browser_tasks automaticamente
-- - Edge Function atualiza browser_logins.is_connected
-- - Realtime notifica frontend quando is_connected muda
-- =============================================

DROP FUNCTION IF EXISTS browser_execute_login(bigint, text, text, text);

CREATE OR REPLACE FUNCTION browser_execute_login(
    p_project_id bigint,
    p_platform_name text,
    p_email text,
    p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task_id uuid;
    v_login_id bigint;
    v_browser_url text;
    v_login_prompt text;
    v_supabase_url text := 'https://suqjifkhmekcdflwowiw.supabase.co';
    v_supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
BEGIN
    -- 1. Salvar/atualizar credenciais em browser_logins
    INSERT INTO browser_logins (projeto_id, platform_name, login_email, login_password, is_active)
    VALUES (p_project_id, p_platform_name, p_email, p_password, true)
    ON CONFLICT (projeto_id, platform_name, login_email)
    DO UPDATE SET
        login_password = EXCLUDED.login_password,
        updated_at = now(),
        is_active = true
    RETURNING id INTO v_login_id;

    -- 2. Criar task em browser_tasks (agente vai atualizar status)
    INSERT INTO browser_tasks (project_id, task, task_type, status, priority)
    VALUES (
        p_project_id,
        format('Login to %s with email %s', p_platform_name, p_email),
        'login',
        'pending',
        1  -- Alta prioridade
    )
    RETURNING id INTO v_task_id;

    -- 3. Buscar browser_mcp_url do projeto (cada projeto tem seu browser)
    SELECT browser_mcp_url INTO v_browser_url
    FROM "Projeto"
    WHERE id = p_project_id;

    IF v_browser_url IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Projeto não tem browser_mcp_url configurado'
        );
    END IF;

    -- 4. Buscar prompt de login da plataforma
    SELECT login_prompt INTO v_login_prompt
    FROM browser_platforms
    WHERE platform_name = p_platform_name AND is_active = true;

    IF v_login_prompt IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Plataforma %s não encontrada ou inativa', p_platform_name)
        );
    END IF;

    -- 5. Disparar Edge Function (fire-and-forget via net.http_post)
    -- Timeout baixo porque é só disparo, não espera resposta completa
    PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/browser-login-executor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_supabase_anon_key
        ),
        body := jsonb_build_object(
            'task_id', v_task_id::text,
            'project_id', p_project_id,
            'login_id', v_login_id,
            'platform_name', p_platform_name,
            'email', p_email,
            'password', p_password,
            'browser_url', v_browser_url,
            'login_prompt', v_login_prompt
        ),
        timeout_milliseconds := 5000
    );

    -- 6. Retornar imediatamente (background continua)
    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task_id,
        'login_id', v_login_id,
        'message', 'Login iniciado em background. Você pode sair da página.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION browser_execute_login(bigint, text, text, text) TO authenticated;

COMMENT ON FUNCTION browser_execute_login IS 'Dispara login via browser agent em background. Retorna task_id imediatamente (fire-and-forget). O agente atualiza browser_tasks e a Edge Function atualiza browser_logins.is_connected.';
