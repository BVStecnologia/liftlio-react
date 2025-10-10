-- =============================================
-- Função: check_project_display_state
-- Descrição: Verifica estado de exibição do projeto (PRIORIZA MENSAGENS)
-- Criado: 2025-10-10
-- Atualizado: 2025-10-10 - Correção de prioridade: mensagens ANTES de integração desativada
-- =============================================
-- LÓGICA CORRIGIDA:
-- 1. Sem integração → need_integration
-- 2. COM MENSAGENS → dashboard (PRIORIDADE MÁXIMA - independente da integração)
-- 3. Integração desativada → integration_disabled
-- 4. Processando → setup_processing
-- =============================================

DROP FUNCTION IF EXISTS check_project_display_state(text, bigint);

CREATE OR REPLACE FUNCTION public.check_project_display_state(p_user_email text, p_project_id bigint DEFAULT NULL::bigint)
RETURNS json
LANGUAGE plpgsql
STABLE PARALLEL SAFE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_user_exists BOOLEAN := false;
  v_project_status INT;
  v_has_integration BOOLEAN := false;
  v_integration_active BOOLEAN := false;
  v_has_messages BOOLEAN := false;
  v_display_component TEXT;
  v_processing_step INT;
  v_progress_percentage INT;
  v_processing_message TEXT;
  v_onboarding_step INT := 0;
  v_verified_ready BOOLEAN := false;
  v_should_continue_checking BOOLEAN := false;
  v_auto_selected BOOLEAN := false;
  v_message_count INT := 0;
BEGIN
  IF p_user_email IS NOT NULL THEN
    v_user_exists := EXISTS(SELECT 1 FROM auth.users WHERE email = p_user_email);
  END IF;

  IF p_user_email IS NULL OR NOT v_user_exists THEN
    RETURN json_build_object(
      'display_component', 'login',
      'needs_auth', true,
      'message', 'Please login to continue',
      'checked_at', NOW()::TEXT
    );
  END IF;

  IF p_project_id IS NULL THEN
    SELECT id INTO p_project_id
    FROM "Projeto"
    WHERE "user" = p_user_email AND projetc_index = true
    LIMIT 1;

    IF p_project_id IS NOT NULL THEN
      v_auto_selected := true;
    ELSE
      RETURN json_build_object(
        'display_component', 'create_project',
        'message', 'Create your first project',
        'checked_at', NOW()::TEXT
      );
    END IF;
  END IF;

  IF p_project_id IS NOT NULL THEN
    WITH project_checks AS (
      SELECT
        COALESCE(p.status::INTEGER, 0) AS status,
        EXISTS(
          SELECT 1
          FROM "Integrações" i
          WHERE i."PROJETO id" = p.id
            AND i."Tipo de integração" = 'youtube'
            AND i.ativo = true
          LIMIT 1
        ) AS has_integration,
        EXISTS(
          SELECT 1
          FROM "Mensagens" m
          WHERE m.project_id = p.id
          LIMIT 1
        ) AS has_messages,
        (SELECT COUNT(*) FROM "Mensagens" WHERE project_id = p.id) as message_count
      FROM "Projeto" p
      WHERE p.id = p_project_id
      LIMIT 1
    )
    SELECT status, has_integration, has_messages, message_count
    INTO v_project_status, v_has_integration, v_has_messages, v_message_count
    FROM project_checks;

    IF v_project_status IS NULL THEN
      RETURN json_build_object(
        'error', true,
        'message', 'Project not found',
        'display_component', 'error',
        'project_id', p_project_id
      );
    END IF;

    IF v_has_integration THEN
      SELECT ativo INTO v_integration_active
      FROM "Integrações"
      WHERE "PROJETO id" = p_project_id AND "Tipo de integração" = 'youtube'
      LIMIT 1;
    END IF;

    -- REGRA 1: SEM integração → need_integration
    IF NOT v_has_integration THEN
      v_display_component := 'need_integration';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'Connect your YouTube account to get started';
      v_onboarding_step := 2;

    -- 🔥 REGRA 2: COM MENSAGENS → DASHBOARD (PRIORIDADE MÁXIMA!)
    ELSIF v_has_messages THEN
      v_display_component := 'dashboard';
      v_processing_step := 7;
      v_progress_percentage := 100;
      v_processing_message := 'Dashboard available';
      v_verified_ready := true;
      v_onboarding_step := 4;

    -- REGRA 3: Integração desativada (SÓ verifica se não tem mensagens)
    ELSIF v_has_integration AND NOT v_integration_active THEN
      v_display_component := 'integration_disabled';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'YouTube integration is disabled';

    -- REGRA 4: COM integração SEM mensagens → processando
    ELSIF v_project_status <= 6 THEN
      v_display_component := 'setup_processing';
      v_processing_step := v_project_status;
      v_should_continue_checking := true;
      v_onboarding_step := 3;

      v_progress_percentage := CASE
        WHEN v_project_status = 0 THEN 0
        WHEN v_project_status = 1 THEN 15
        WHEN v_project_status = 2 THEN 30
        WHEN v_project_status = 3 THEN 45
        WHEN v_project_status = 4 THEN 60
        WHEN v_project_status = 5 THEN 75
        WHEN v_project_status = 6 THEN 90
        ELSE 0
      END;

      v_processing_message := CASE v_project_status
        WHEN 0 THEN 'Starting project setup...'
        WHEN 1 THEN 'Connecting to YouTube API...'
        WHEN 2 THEN 'Analyzing channel and videos...'
        WHEN 3 THEN 'Processing engagement metrics...'
        WHEN 4 THEN 'Analyzing comments with AI...'
        WHEN 5 THEN 'Generating insights and reports...'
        WHEN 6 THEN 'Finalizing initial processing...'
        ELSE 'Processing...'
      END;

    ELSE
      v_display_component := 'dashboard';
      v_processing_step := 7;
      v_progress_percentage := 100;
      v_processing_message := 'Processing complete';
      v_verified_ready := true;
      v_onboarding_step := 4;
    END IF;
  END IF;

  RETURN json_build_object(
    'display_component', v_display_component,
    'user_email', p_user_email,
    'project_id', p_project_id,
    'has_messages', v_has_messages,
    'message_count', COALESCE(v_message_count, 0),
    'project_status', v_project_status,
    'progress_percentage', COALESCE(v_progress_percentage, 0),
    'processing_message', COALESCE(v_processing_message, ''),
    'auto_selected_project', v_auto_selected,
    'checked_at', NOW()::TEXT
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Error checking state',
      'error_detail', SQLERRM,
      'display_component', 'error',
      'user_email', p_user_email,
      'project_id', p_project_id
    );
END;
$function$;

COMMENT ON FUNCTION check_project_display_state(text, bigint) IS
'Verifica estado do projeto com PRIORIDADE para mensagens:
1. Sem integração → need_integration
2. COM MENSAGENS → dashboard (independente da integração)
3. Integração desativada → integration_disabled
4. Processando → setup_processing';
