-- Migration: Fix check_project_display_state to handle TEXT status instead of INTEGER
-- Issue: Function was trying to cast TEXT status to INTEGER, failing on values like "PAUSADO_MANUALMENTE"
-- Date: 2025-10-17 23:50:00

CREATE OR REPLACE FUNCTION public.check_project_display_state(p_project_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_project_status TEXT; -- ✅ MUDADO: TEXT em vez de INT
  v_status_numeric INT; -- ✅ NOVO: Variável para status numérico quando possível
  v_has_integration BOOLEAN;
  v_has_messages BOOLEAN;
  v_display_component TEXT;
  v_processing_step INT;
  v_progress_percentage INT;
  v_processing_message TEXT;
  v_verified_ready BOOLEAN := false;
  v_should_continue_checking BOOLEAN := false;
BEGIN
  IF p_project_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'project_id não pode ser NULL',
      'display_component', 'error'
    );
  END IF;

  WITH project_checks AS (
    SELECT
      p.status, -- ✅ MUDADO: Sem cast para INTEGER
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
  SELECT status, has_integration, has_messages
  INTO v_project_status, v_has_integration, v_has_messages
  FROM project_checks;

  IF v_project_status IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Projeto não encontrado',
      'display_component', 'error'
    );
  END IF;

  -- ✅ NOVO: Tentar converter status para numérico se possível
  BEGIN
    v_status_numeric := v_project_status::INTEGER;
  EXCEPTION
    WHEN OTHERS THEN
      v_status_numeric := NULL; -- Se não for número, deixar NULL
  END;

  -- ✅ NOVO: Verificar status especiais (não numéricos)
  IF v_project_status = 'PAUSADO_MANUALMENTE' THEN
    -- Projeto pausado manualmente → mostrar dashboard mas indicar pausado
    v_display_component := 'dashboard';
    v_processing_step := 7;
    v_progress_percentage := 100;
    v_processing_message := 'Projeto pausado manualmente';
    v_verified_ready := true;

  -- REGRA SIMPLES: 1. SEM integração → need_integration
  ELSIF NOT v_has_integration THEN
    v_display_component := 'need_integration';
    v_processing_step := 0;
    v_progress_percentage := 0;
    v_processing_message := 'Conecte sua conta do YouTube para começar';
    v_verified_ready := false;

  -- REGRA 2: COM mensagens → dashboard
  ELSIF v_has_messages THEN
    v_display_component := 'dashboard';
    v_processing_step := 7;
    v_progress_percentage := 100;
    v_processing_message := 'Dashboard disponível';
    v_verified_ready := true;

  -- REGRA 3: COM integração SEM mensagens → processando (somente se status é numérico)
  ELSIF v_status_numeric IS NOT NULL AND v_status_numeric <= 6 THEN
    v_display_component := 'setup_processing';
    v_processing_step := v_status_numeric;
    v_should_continue_checking := true;

    v_progress_percentage := CASE
      WHEN v_status_numeric = 0 THEN 0
      WHEN v_status_numeric = 1 THEN 15
      WHEN v_status_numeric = 2 THEN 30
      WHEN v_status_numeric = 3 THEN 45
      WHEN v_status_numeric = 4 THEN 60
      WHEN v_status_numeric = 5 THEN 75
      WHEN v_status_numeric = 6 THEN 90
      ELSE 0
    END;

    v_processing_message := CASE v_status_numeric
      WHEN 0 THEN 'Iniciando configuração do projeto...'
      WHEN 1 THEN 'Conectando com YouTube API...'
      WHEN 2 THEN 'Analisando canal e vídeos...'
      WHEN 3 THEN 'Processando métricas de engajamento...'
      WHEN 4 THEN 'Analisando comentários com IA...'
      WHEN 5 THEN 'Gerando insights e relatórios...'
      WHEN 6 THEN 'Finalizando processamento inicial...'
      ELSE 'Processando...'
    END;

  ELSE
    -- Caso padrão: mostrar dashboard
    v_display_component := 'dashboard';
    v_processing_step := 7;
    v_progress_percentage := 100;
    v_processing_message := 'Processamento concluído';
    v_verified_ready := true;
  END IF;

  RETURN json_build_object(
    'display_component', v_display_component,
    'has_integration', v_has_integration,
    'has_messages', v_has_messages,
    'project_status', v_project_status, -- ✅ Retornar status como TEXT
    'status_numeric', v_status_numeric, -- ✅ NOVO: Retornar versão numérica se existir
    'processing_step', v_processing_step,
    'progress_percentage', v_progress_percentage,
    'processing_message', v_processing_message,
    'verified_ready', v_verified_ready,
    'should_continue_checking', v_should_continue_checking,
    'is_processing', (v_display_component = 'setup_processing'),
    'needs_integration', (v_display_component = 'need_integration'),
    'can_show_dashboard', (v_display_component = 'dashboard'),
    'checked_at', NOW()::TEXT
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Erro ao verificar estado do projeto',
      'error_detail', SQLERRM,
      'display_component', 'error'
    );
END;
$function$;

-- Comentário explicando a correção
COMMENT ON FUNCTION public.check_project_display_state(bigint) IS
'Verifica o estado de exibição do projeto.
CORRIGIDO: Agora lida corretamente com status TEXT (incluindo valores como "PAUSADO_MANUALMENTE").
Versão anterior tentava fazer cast para INTEGER e falhava em status não-numéricos.';
