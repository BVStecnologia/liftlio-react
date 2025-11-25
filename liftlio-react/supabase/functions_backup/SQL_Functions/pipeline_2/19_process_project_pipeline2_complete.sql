-- =============================================
-- Funcao: process_project_pipeline2_complete
-- Descricao: Processa projeto completo (alternativa ao orquestrador principal)
-- Criado: 2025-11-25
-- Status: DEPRECADO - usar pipeline2_process_project()
-- =============================================

DROP FUNCTION IF EXISTS process_project_pipeline2_complete(BIGINT);

CREATE OR REPLACE FUNCTION public.process_project_pipeline2_complete(project_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_scanner RECORD;
    v_cache_result TEXT;
    v_process_result TEXT;
    v_output TEXT := '';
    v_scanners_sem_cache INTEGER := 0;
    v_scanners_processados INTEGER := 0;
BEGIN
    -- Para cada scanner do projeto
    FOR v_scanner IN
        SELECT s.id, s."ID cache videos" as cache
        FROM "Scanner de videos do youtube" s
        WHERE s."Projeto_id" = project_id_param
        AND s."Ativa?" = true
        ORDER BY s.id
    LOOP
        -- Se scanner nao tem cache, buscar IDs
        IF v_scanner.cache IS NULL OR v_scanner.cache = '' THEN
            v_scanners_sem_cache := v_scanners_sem_cache + 1;

            -- Chamar update_video_id_cache para buscar IDs
            SELECT update_video_id_cache(v_scanner.id) INTO v_cache_result;
            v_output := v_output || format('Scanner %s: %s | ', v_scanner.id, LEFT(v_cache_result, 50));

        -- Se scanner tem cache (ou acabou de receber), processar
        ELSIF v_scanner.cache != 'NOT' THEN
            v_scanners_processados := v_scanners_processados + 1;

            -- Inicializar se necessario
            IF NOT EXISTS (SELECT 1 FROM pipeline_processing WHERE scanner_id = v_scanner.id) THEN
                PERFORM initialize_scanner_processing(v_scanner.id);
            END IF;

            -- Processar videos
            SELECT process_scanner_videos(v_scanner.id) INTO v_process_result;
            v_output := v_output || format('Scanner %s: %s | ', v_scanner.id, LEFT(v_process_result, 50));
        END IF;
    END LOOP;

    -- Atualizar status do projeto
    PERFORM update_project_status_from_pipeline(project_id_param);

    RETURN format('Projeto %s: %s sem cache, %s processados. %s',
        project_id_param, v_scanners_sem_cache, v_scanners_processados, v_output);
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- FUNCAO DEPRECADA
--
-- Esta funcao foi criada como alternativa ao pipeline2_process_project()
-- mas NAO e usada no fluxo principal.
--
-- PREFERIR: pipeline2_process_project()
--
-- Mantida para compatibilidade e referencia.
-- =============================================
