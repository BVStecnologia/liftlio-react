-- =============================================
-- Função: check_project_display_state
-- Descrição: Verifica estado de exibição do projeto (ProcessingWrapper)
-- Criado: 2025-01-23
-- Atualizado: Versões para project_id e user_email
-- =============================================

-- Versão com project_id apenas
DROP FUNCTION IF EXISTS public.check_project_display_state(bigint);

CREATE OR REPLACE FUNCTION public.check_project_display_state(p_project_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_project_status INT;
  v_has_integration BOOLEAN;
  v_has_messages BOOLEAN;
  v_is_checking_initial BOOLEAN := false;
  v_is_checking_integration BOOLEAN := false;
  v_verified_ready BOOLEAN := false;
  v_should_continue_checking BOOLEAN := false;
  v_display_component TEXT;
  v_processing_step INT;
  v_progress_percentage INT;
  v_processing_message TEXT;
BEGIN
  -- Validação de entrada
  IF p_project_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'project_id não pode ser NULL',
      'display_component', 'error'
    );
  END IF;

  -- CTE única para todas verificações em paralelo
  WITH project_checks AS (
    SELECT
      COALESCE(p.status::INTEGER, 0) AS status,  -- NULL vira 0 (recém-criado)
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
      ) AS has_messages
    FROM "Projeto" p
    WHERE p.id = p_project_id
    LIMIT 1
  )
  SELECT
    status,
    has_integration,
    has_messages
  INTO
    v_project_status,
    v_has_integration,
    v_has_messages
  FROM project_checks;

  -- Verificar se projeto existe
  IF v_project_status IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Projeto não encontrado',
      'display_component', 'error'
    );
  END IF;

  -- REGRA SIMPLES E DIRETA:
  -- 1. SEM integração → need_integration
  -- 2. COM mensagens → dashboard
  -- 3. COM integração SEM mensagens → setup_processing

  IF NOT v_has_integration THEN
    -- SEM integração = precisa conectar YouTube
    v_display_component := 'need_integration';
    v_processing_step := 0;
    v_progress_percentage := 0;
    v_processing_message := 'Conecte sua conta do YouTube para começar';
    v_verified_ready := false;

  ELSIF v_has_messages THEN
    -- COM mensagens → SEMPRE dashboard
    v_display_component := 'dashboard';
    v_processing_step := 7;
    v_progress_percentage := 100;
    v_processing_message := 'Dashboard disponível';
    v_verified_ready := true;
    v_should_continue_checking := false;

  -- Regra 3: COM integração SEM mensagens → processando
  ELSIF v_project_status <= 6 THEN
    v_display_component := 'setup_processing';
    v_processing_step := v_project_status;
    v_should_continue_checking := true;

    -- Cálculo de progresso
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

    -- Mensagens por status
    v_processing_message := CASE v_project_status
      WHEN 0 THEN 'Iniciando configuração do projeto...'
      WHEN 1 THEN 'Conectando com YouTube API...'
      WHEN 2 THEN 'Analisando canal e vídeos...'
      WHEN 3 THEN 'Processando métricas de engajamento...'
      WHEN 4 THEN 'Analisando comentários com IA...'
      WHEN 5 THEN 'Gerando insights e relatórios...'
      WHEN 6 THEN 'Finalizando processamento inicial...'
      ELSE 'Processando...'
    END;

  -- Regra 4: SEM mensagens E status > 6
  ELSE
    v_display_component := 'dashboard';
    v_processing_step := 7;
    v_progress_percentage := 100;
    v_processing_message := 'Processamento concluído - Dashboard disponível';
    v_verified_ready := true;
    v_should_continue_checking := false;
  END IF;

  -- Construir JSON de resposta
  v_result := json_build_object(
    'display_component', v_display_component,
    'has_integration', v_has_integration,
    'has_messages', v_has_messages,
    'project_status', v_project_status,
    'processing_step', v_processing_step,
    'progress_percentage', v_progress_percentage,
    'processing_message', v_processing_message,
    'is_checking_initial', v_is_checking_initial,
    'is_checking_integration', v_is_checking_integration,
    'verified_ready', v_verified_ready,
    'should_continue_checking', v_should_continue_checking,
    'is_processing', (v_display_component = 'setup_processing'),
    'needs_integration', (v_display_component = 'need_integration'),
    'can_show_dashboard', (v_display_component = 'dashboard'),
    'checked_at', NOW()::TEXT
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em check_project_display_state: % - %', SQLERRM, SQLSTATE;

    RETURN json_build_object(
      'error', true,
      'message', 'Erro ao verificar estado do projeto',
      'error_detail', SQLERRM,
      'display_component', 'error'
    );
END;
$function$;

-- Versão com user_email e project_id opcional
DROP FUNCTION IF EXISTS public.check_project_display_state(text, bigint);

CREATE OR REPLACE FUNCTION public.check_project_display_state(p_user_email text, p_project_id bigint DEFAULT NULL::bigint)
 RETURNS json
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_user_exists BOOLEAN := false;
  v_has_projects BOOLEAN := false;
  v_project_count INT := 0;
  v_project_status INT;
  v_has_integration BOOLEAN := false;
  v_integration_active BOOLEAN := false;
  v_has_messages BOOLEAN := false;
  v_is_checking_initial BOOLEAN := false;
  v_is_checking_integration BOOLEAN := false;
  v_verified_ready BOOLEAN := false;
  v_should_continue_checking BOOLEAN := false;
  v_display_component TEXT;
  v_processing_step INT;
  v_progress_percentage INT;
  v_processing_message TEXT;
  v_onboarding_step INT := 0;
  v_youtube_active BOOLEAN := false;
  v_subscription_active BOOLEAN := false;
  v_is_loading BOOLEAN := false;
  v_onboarding_ready BOOLEAN := true;
  v_auto_selected BOOLEAN := false;
  v_message_count INT := 0;
BEGIN
  -- Verificar se usuário existe e tem projetos
  IF p_user_email IS NOT NULL THEN
    v_user_exists := EXISTS(
      SELECT 1 FROM auth.users WHERE email = p_user_email
    );

    SELECT COUNT(*) INTO v_project_count
    FROM "Projeto"
    WHERE "user" = p_user_email;

    v_has_projects := (v_project_count > 0);
    v_subscription_active := true;
  END IF;

  -- REGRA 1: SEM USUÁRIO → LOGIN
  IF p_user_email IS NULL OR NOT v_user_exists THEN
    RETURN json_build_object(
      'display_component', 'login',
      'needs_auth', true,
      'message', 'Please login to continue',
      'onboarding_step', 0,
      'checked_at', NOW()::TEXT
    );
  END IF;

  -- REGRA 2: SEM ID → BUSCAR PROJETO COM INDEX
  IF p_project_id IS NULL THEN
    SELECT id INTO p_project_id
    FROM "Projeto"
    WHERE "user" = p_user_email
      AND projetc_index = true
    LIMIT 1;

    IF p_project_id IS NOT NULL THEN
      v_auto_selected := true;
    ELSE
      RETURN json_build_object(
        'display_component', 'create_project',
        'has_projects', false,
        'project_count', 0,
        'onboarding_step', 1,
        'message', 'Create your first project',
        'checked_at', NOW()::TEXT
      );
    END IF;
  END IF;

  -- Verificações do projeto específico
  IF p_project_id IS NOT NULL THEN
    WITH project_checks AS (
      SELECT
        COALESCE(p.status::INTEGER, 0) AS status,  -- NULL vira 0 (recém-criado)
        p."Youtube Active",
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
    SELECT
      status,
      "Youtube Active",
      has_integration,
      has_messages,
      message_count
    INTO
      v_project_status,
      v_youtube_active,
      v_has_integration,
      v_has_messages,
      v_message_count
    FROM project_checks;

    -- Verificar se projeto existe
    IF v_project_status IS NULL THEN
      RETURN json_build_object(
        'error', true,
        'message', 'Project not found',
        'display_component', 'error',
        'project_id', p_project_id
      );
    END IF;

    -- Verificar se integração está realmente ativa
    IF v_has_integration THEN
      SELECT ativo INTO v_integration_active
      FROM "Integrações"
      WHERE "PROJETO id" = p_project_id
        AND "Tipo de integração" = 'youtube'
      LIMIT 1;
    END IF;

    -- REGRA SIMPLES E DIRETA:
    -- 1. SEM integração → need_integration
    -- 2. COM mensagens → dashboard
    -- 3. COM integração SEM mensagens → setup_processing

    IF NOT v_has_integration THEN
      -- SEM integração = precisa conectar YouTube
      v_display_component := 'need_integration';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'Connect your YouTube account to get started';
      v_verified_ready := false;
      v_onboarding_step := 2;

    ELSIF v_has_messages THEN
      -- COM mensagens → SEMPRE dashboard
      v_display_component := 'dashboard';
      v_processing_step := 7;
      v_progress_percentage := 100;
      v_processing_message := 'Dashboard available';
      v_verified_ready := true;
      v_should_continue_checking := false;
      v_onboarding_step := 4;

    ELSIF v_has_integration AND NOT v_integration_active THEN
      -- Integração desativada
      v_display_component := 'integration_disabled';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'YouTube integration is disabled';
      v_verified_ready := false;

    ELSIF v_project_status <= 6 THEN
      -- COM integração ativa SEM mensagens → processando
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
      v_processing_message := 'Processing complete - Dashboard available';
      v_verified_ready := true;
      v_should_continue_checking := false;
      v_onboarding_step := 4;
    END IF;
  END IF;

  -- Construir JSON de resposta
  v_result := json_build_object(
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

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in check_project_display_state: % - %', SQLERRM, SQLSTATE;

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