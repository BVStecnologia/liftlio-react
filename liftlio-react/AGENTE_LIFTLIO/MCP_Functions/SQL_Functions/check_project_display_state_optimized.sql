-- =============================================
-- Função: check_project_display_state
-- Descrição: Centraliza TODAS as condicionais do frontend (versão simplificada)
-- Criado: 2025-01-29
-- Atualizado: 2025-01-29 - Simplificado para retornar apenas campos essenciais
-- =============================================

-- SEMPRE fazer DROP primeiro (padrão Liftlio)
DROP FUNCTION IF EXISTS public.check_project_display_state(TEXT, BIGINT);

CREATE OR REPLACE FUNCTION public.check_project_display_state(
  p_user_email TEXT,           -- EMAIL do usuário (pode ser NULL)
  p_project_id BIGINT DEFAULT NULL  -- ID do projeto (OPCIONAL - vai buscar automaticamente)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
PARALLEL SAFE
AS $$
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
  v_message_count INT := 0; -- IMPORTANTE: Variável separada para contagem de mensagens
BEGIN
  -- ========================================
  -- VALIDAÇÕES E VERIFICAÇÕES INICIAIS
  -- ========================================

  -- 1. Verificar se usuário existe e tem projetos
  IF p_user_email IS NOT NULL THEN
    -- Verificar se usuário existe pelo email
    v_user_exists := EXISTS(
      SELECT 1 FROM auth.users WHERE email = p_user_email
    );

    -- Contar projetos do usuário usando o email
    SELECT COUNT(*) INTO v_project_count
    FROM "Projeto"
    WHERE "user" = p_user_email;

    v_has_projects := (v_project_count > 0);

    -- Verificar subscription (simplificado)
    v_subscription_active := true; -- Por padrão true, adicionar lógica real se necessário
  END IF;

  -- ========================================
  -- REGRA 1: SEM USUÁRIO → LOGIN
  -- ========================================
  IF p_user_email IS NULL OR NOT v_user_exists THEN
    RETURN json_build_object(
      'display_component', 'login',
      'needs_auth', true,
      'message', 'Please login to continue',
      'onboarding_step', 0,
      'checked_at', NOW()::TEXT
    );
  END IF;

  -- ========================================
  -- REGRA 2: SEM ID → BUSCAR PROJETO COM INDEX (ou criar)
  -- ========================================
  IF p_project_id IS NULL THEN
    -- Buscar projeto com projetc_index = true
    SELECT id INTO p_project_id
    FROM "Projeto"
    WHERE "user" = p_user_email
      AND projetc_index = true
    LIMIT 1;

    -- Se encontrou, marcar como auto-selecionado
    IF p_project_id IS NOT NULL THEN
      v_auto_selected := true;
    -- Se não encontrou projeto com index, não tem projeto mesmo!
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

  -- ========================================
  -- VERIFICAÇÕES DO PROJETO ESPECÍFICO
  -- ========================================
  IF p_project_id IS NOT NULL THEN
    -- CTE para todas verificações do projeto
    WITH project_checks AS (
      SELECT
        p.status::INTEGER,
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
      v_message_count -- CORRIGIDO: usando variável separada para mensagens
    FROM project_checks;

    -- Verificar se projeto existe
    IF v_project_status IS NULL THEN
      RETURN json_build_object(
        'error', true,
        'message', 'Projeto não encontrado',
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

    -- Determinar estados de verificação
    IF v_project_status = 0 AND NOT v_has_integration THEN
      v_is_checking_initial := true;
      v_is_checking_integration := true;
      v_should_continue_checking := true;
      v_onboarding_step := 2;
    ELSIF v_has_integration AND v_project_status <= 2 THEN
      v_is_checking_integration := false;
      v_is_checking_initial := false;
      v_should_continue_checking := true;
      v_onboarding_step := 3;
    ELSIF v_has_messages THEN
      v_onboarding_step := 4; -- Onboarding completo
      v_onboarding_ready := true;
    END IF;

    -- ========================================
    -- REGRA 4: CHECKING INICIAL
    -- ========================================
    IF v_is_checking_initial THEN
      v_display_component := 'checking';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'Checking project state...';

    -- ========================================
    -- REGRA 5: SEM INTEGRAÇÃO (e não está checando)
    -- ========================================
    ELSIF NOT v_has_integration AND NOT v_is_checking_integration THEN
      v_display_component := 'need_integration';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'Connect your YouTube account to get started';
      v_verified_ready := false;
      v_onboarding_step := 2;

    -- ========================================
    -- REGRA 6: INTEGRAÇÃO DESATIVADA
    -- ========================================
    ELSIF v_has_integration AND NOT v_integration_active THEN
      v_display_component := 'integration_disabled';
      v_processing_step := 0;
      v_progress_percentage := 0;
      v_processing_message := 'YouTube integration is disabled';
      v_verified_ready := false;

    -- ========================================
    -- REGRA 7: COM MENSAGENS → SEMPRE DASHBOARD
    -- ========================================
    ELSIF v_has_messages THEN
      v_display_component := 'dashboard';
      v_processing_step := 7;
      v_progress_percentage := 100;
      v_processing_message := 'Dashboard available';
      v_verified_ready := true;
      v_should_continue_checking := false;
      v_onboarding_step := 4;

    -- ========================================
    -- REGRA 8: PROCESSAMENTO (status <= 5 ou status = 6 sem mensagens)
    -- ========================================
    ELSIF v_project_status <= 5 OR (v_project_status = 6 AND NOT v_has_messages) THEN
      v_display_component := 'setup_processing';
      v_processing_step := v_project_status;
      v_should_continue_checking := true;
      v_onboarding_step := 3;

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
        WHEN 0 THEN 'Starting project setup...'
        WHEN 1 THEN 'Connecting to YouTube API...'
        WHEN 2 THEN 'Analyzing channel and videos...'
        WHEN 3 THEN 'Processing engagement metrics...'
        WHEN 4 THEN 'Analyzing comments with AI...'
        WHEN 5 THEN 'Generating insights and reports...'
        WHEN 6 THEN 'Finalizing initial processing...'
        ELSE 'Processing...'
      END;

    -- ========================================
    -- REGRA 9: STATUS > 6 → DASHBOARD
    -- ========================================
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

  -- ========================================
  -- CONSTRUIR JSON DE RESPOSTA SIMPLIFICADO
  -- ========================================
  v_result := json_build_object(
    -- ESSENCIAL: Define o que mostrar no frontend
    'display_component', v_display_component,

    -- CONTEXTO: Dados básicos necessários
    'user_email', p_user_email,
    'project_id', p_project_id,

    -- CONDICIONAIS: Para ProcessingWrapper e Dashboard
    'has_messages', v_has_messages,
    'message_count', COALESCE(v_message_count, 0),

    -- PROCESSAMENTO: Apenas quando status <= 6 e sem mensagens
    'project_status', v_project_status,
    'progress_percentage', COALESCE(v_progress_percentage, 0),
    'processing_message', COALESCE(v_processing_message, ''),

    -- META: Útil para debug e tracking
    'auto_selected_project', v_auto_selected,
    'checked_at', NOW()::TEXT
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em check_project_display_state: % - %', SQLERRM, SQLSTATE;

    RETURN json_build_object(
      'error', true,
      'message', 'Erro ao verificar estado',
      'error_detail', SQLERRM,
      'display_component', 'error',
      'user_email', p_user_email,
      'project_id', p_project_id
    );
END;
$$;

-- Comentário de documentação
COMMENT ON FUNCTION public.check_project_display_state(TEXT, BIGINT) IS
'Função simplificada que centraliza TODAS as condicionais do frontend.

IMPORTANTE: Se p_project_id for NULL, busca automaticamente o projeto com projetc_index = true

Parâmetros:
- p_user_email: EMAIL do usuário (pode ser NULL)
- p_project_id: ID do projeto (OPCIONAL - busca automaticamente se NULL)

Retorna JSON SIMPLIFICADO com apenas campos essenciais:
- display_component: Define o que mostrar (login|create_project|need_integration|setup_processing|dashboard|error)
- user_email: Email do usuário
- project_id: ID do projeto atual
- has_messages: Se tem mensagens (condicional para ProcessingWrapper)
- message_count: Quantidade de mensagens
- project_status: Status atual (0-6 para calcular progresso)
- progress_percentage: Porcentagem do processamento
- processing_message: Mensagem de status atual
- auto_selected_project: Se foi selecionado automaticamente
- checked_at: Timestamp da verificação

Fluxo simplificado:
1. Sem email → login
2. Sem projetc_index → create_project
3. Sem integração → need_integration
4. Sem mensagens E status <= 6 → setup_processing
5. Com mensagens → dashboard

Tabelas usadas:
- auth.users (email)
- "Projeto" (id, status, "user", projetc_index)
- "Integrações" ("PROJETO id", ativo)
- "Mensagens" (project_id)';

-- =============================================
-- TESTES COMPLETOS
-- =============================================
/*
-- Teste 1: Usuário não autenticado
SELECT check_project_display_state(NULL, NULL);
-- Esperado: display_component = 'login'

-- Teste 2: Usuário sem projetos (sem projetc_index = true)
SELECT check_project_display_state('usuario_novo@example.com');
-- Esperado: display_component = 'create_project'

-- Teste 3: Usuário com projeto (auto-seleciona via projetc_index)
SELECT check_project_display_state('valdair3d@gmail.com');
-- Esperado: display_component baseado no projeto com projetc_index = true
-- SÓ PRECISA PASSAR O EMAIL! A função busca o projeto automaticamente!

-- Teste 4: Performance com auto-seleção
EXPLAIN ANALYZE SELECT check_project_display_state('valdair3d@gmail.com');

-- Teste 5: Simular processamento (alterar status do projeto com index)
UPDATE "Projeto" SET status = '3' WHERE projetc_index = true AND "user" = 'valdair3d@gmail.com';
SELECT check_project_display_state('valdair3d@gmail.com');
-- Esperado: display_component = 'setup_processing'

-- Restaurar status
UPDATE "Projeto" SET status = '6' WHERE projetc_index = true AND "user" = 'valdair3d@gmail.com';
*/