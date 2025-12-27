-- =============================================
-- Função: browser_submit_2fa_code
-- Descrição: Envia código 2FA para o browser agent
-- Criado: 2025-12-27
-- =============================================

DROP FUNCTION IF EXISTS browser_submit_2fa_code(bigint, text, text);

CREATE OR REPLACE FUNCTION browser_submit_2fa_code(
    p_project_id bigint,
    p_platform_name text,
    p_code text
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
    v_submit_code_prompt text;
    v_supabase_url text := 'https://suqjifkhmekcdflwowiw.supabase.co';
    v_supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
BEGIN
    -- Validar código
    IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid code format');
    END IF;

    -- 1. Buscar login_id existente
    SELECT id INTO v_login_id
    FROM browser_logins
    WHERE projeto_id = p_project_id AND platform_name = p_platform_name AND is_active = true
    LIMIT 1;

    IF v_login_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active login found');
    END IF;

    -- 2. Criar task
    INSERT INTO browser_tasks (project_id, task, task_type, status, priority)
    VALUES (p_project_id, format('Submit 2FA code for %s', p_platform_name), '2fa_code', 'pending', 1)
    RETURNING id INTO v_task_id;

    -- 3. Buscar browser_mcp_url
    SELECT browser_mcp_url INTO v_browser_url FROM "Projeto" WHERE id = p_project_id;
    IF v_browser_url IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project has no browser_mcp_url');
    END IF;

    -- 4. Buscar submit_code_prompt
    SELECT submit_code_prompt INTO v_submit_code_prompt
    FROM browser_platforms WHERE platform_name = p_platform_name AND is_active = true;
    IF v_submit_code_prompt IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Platform has no submit_code_prompt');
    END IF;

    -- 5. Disparar Edge Function
    PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/browser-2fa-executor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_supabase_anon_key
        ),
        body := jsonb_build_object(
            'task_id', v_task_id::text,
            'project_id', p_project_id,
            'login_id', v_login_id,
            'platform_name', p_platform_name,
            'code', p_code,
            'browser_url', v_browser_url,
            'submit_code_prompt', v_submit_code_prompt
        ),
        timeout_milliseconds := 5000
    );

    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task_id,
        'message', 'Code submission started in background'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION browser_submit_2fa_code(bigint, text, text) TO authenticated;

COMMENT ON FUNCTION browser_submit_2fa_code IS 'Submete código 2FA (SMS ou Authenticator) para o browser agent.';
