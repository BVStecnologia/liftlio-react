-- =============================================
-- Funcao: update_project_status_from_pipeline
-- Descricao: Sincroniza status do Projeto com progresso do Pipeline 2
-- Criado: 2025-11-14
-- Atualizado: 2025-11-25 - Usa MAX (mais avancado) + nunca retrocede
-- =============================================

DROP FUNCTION IF EXISTS update_project_status_from_pipeline(BIGINT);

CREATE OR REPLACE FUNCTION public.update_project_status_from_pipeline(project_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_videos INTEGER;
    v_videos_completos INTEGER;
    v_max_step INTEGER;
    v_current_status INTEGER;
    v_new_status INTEGER;
BEGIN
    -- Buscar status atual do projeto (converter para INTEGER para comparacao)
    SELECT COALESCE(status::INTEGER, 0) INTO v_current_status
    FROM "Projeto"
    WHERE id = project_id_param;

    -- Contar total de videos na pipeline
    SELECT COUNT(*) INTO v_total_videos
    FROM pipeline_processing
    WHERE project_id = project_id_param;

    -- Se nao tem videos na pipeline, manter status atual
    IF v_total_videos = 0 THEN
        RETURN 'INFO: Projeto ' || project_id_param || ' sem videos na pipeline. Status mantido: ' || v_current_status;
    END IF;

    -- Contar videos completos
    SELECT COUNT(*) INTO v_videos_completos
    FROM pipeline_processing
    WHERE project_id = project_id_param
    AND pipeline_completo = TRUE;

    -- Determinar novo status
    IF v_videos_completos = v_total_videos THEN
        -- TODOS os videos completaram -> status 6
        v_new_status := 6;
    ELSE
        -- Usar MAX (video mais avancado) em vez de MIN
        -- Isso evita retrocesso quando multiplos videos processam em paralelo
        SELECT MAX(current_step) INTO v_max_step
        FROM pipeline_processing
        WHERE project_id = project_id_param
        AND pipeline_completo = FALSE;

        -- Mapear step -> status
        -- step 0 = criando video     -> status 1
        -- step 1 = buscando comments -> status 2
        -- step 2 = curando           -> status 3
        -- step 3 = analisando        -> status 4
        -- step 4 = criando mensagens -> status 5
        -- step 5 = finalizando       -> status 5
        CASE v_max_step
            WHEN 0 THEN v_new_status := 1;
            WHEN 1 THEN v_new_status := 2;
            WHEN 2 THEN v_new_status := 3;
            WHEN 3 THEN v_new_status := 4;
            WHEN 4 THEN v_new_status := 5;
            WHEN 5 THEN v_new_status := 5;
            ELSE v_new_status := 1;
        END CASE;
    END IF;

    -- REGRA CRITICA: Nunca retroceder!
    -- So atualiza se novo status for MAIOR que atual
    IF v_new_status > v_current_status THEN
        UPDATE "Projeto"
        SET status = v_new_status::TEXT
        WHERE id = project_id_param;

        RETURN format(
            'SUCCESS: Projeto %s status atualizado: %s -> %s (%s/%s videos completos)',
            project_id_param,
            v_current_status,
            v_new_status,
            v_videos_completos,
            v_total_videos
        );
    ELSE
        RETURN format(
            'INFO: Projeto %s status mantido: %s (novo seria %s, %s/%s videos completos)',
            project_id_param,
            v_current_status,
            v_new_status,
            v_videos_completos,
            v_total_videos
        );
    END IF;
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Sincronizacao Status Projeto <-> Pipeline 2
--
-- PROBLEMA RESOLVIDO:
-- Antes usava MIN(current_step), causando retrocesso quando
-- multiplos videos processam em paralelo:
--   Video 1: step 4 -> status 5
--   Video 2: step 1 -> status 2 (RETROCEDE!)
--
-- SOLUCAO:
-- 1. Usa MAX(current_step) - reflete o video mais avancado
-- 2. Nunca retrocede - so atualiza se novo > atual
-- 3. Status 6 so quando TODOS completam
--
-- MAPEAMENTO STEP -> STATUS:
-- | Pipeline Step | Projeto Status | Descricao           |
-- |---------------|----------------|---------------------|
-- | step 0        | status 1       | Criando videos      |
-- | step 1        | status 2       | Buscando comentarios|
-- | step 2        | status 3       | Curando videos      |
-- | step 3        | status 4       | Analisando          |
-- | step 4-5      | status 5       | Criando mensagens   |
-- | TODOS completos| status 6      | Pipeline completo!  |
--
-- EXEMPLO:
-- ```sql
-- SELECT update_project_status_from_pipeline(117);
-- -- "SUCCESS: Projeto 117 status atualizado: 3 -> 5 (2/6 videos completos)"
-- ```
--
-- INTEGRACAO:
-- Chamado UMA VEZ no final de process_next_project_scanner()
-- NAO chamar em cada video individual!
-- =============================================
