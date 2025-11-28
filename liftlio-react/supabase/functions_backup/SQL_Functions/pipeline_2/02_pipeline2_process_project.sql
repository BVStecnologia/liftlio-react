-- =============================================
-- Funcao: pipeline2_process_project
-- Descricao: Orquestrador PRINCIPAL - processa um projeto completo
-- Criado: 2025-11-25
-- =============================================

DROP FUNCTION IF EXISTS pipeline2_process_project(BIGINT);

CREATE OR REPLACE FUNCTION public.pipeline2_process_project(project_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_scanner RECORD;
    v_result TEXT;
    v_status INTEGER;
    v_cache_ids TEXT[];
    v_first_cache_id TEXT;
    v_has_new_ids BOOLEAN;
    v_processed_any BOOLEAN := FALSE;
BEGIN
    -- Buscar status atual
    SELECT status::INTEGER INTO v_status
    FROM "Projeto" WHERE id = project_id_param;

    -- STATUS 0: Inicializar - marcar scanners com rodada = 1
    IF v_status = 0 THEN
        UPDATE "Scanner de videos do youtube"
        SET rodada = 1
        WHERE "Projeto_id" = project_id_param
        AND "Ativa?" = true;

        UPDATE "Projeto" SET status = '1' WHERE id = project_id_param;

        RETURN format('Projeto %s: Inicializado, scanners marcados com rodada=1', project_id_param);
    END IF;

    -- STATUS 1+: Processar scanner com rodada = 1 (buscar IDs)
    SELECT s.id INTO v_scanner
    FROM "Scanner de videos do youtube" s
    WHERE s."Projeto_id" = project_id_param
    AND s."Ativa?" = true
    AND s.rodada = 1
    ORDER BY s.id
    LIMIT 1;

    IF v_scanner.id IS NOT NULL THEN
        -- Buscar IDs do YouTube
        SELECT update_video_id_cache(v_scanner.id) INTO v_result;

        -- Limpar rodada apos processar
        UPDATE "Scanner de videos do youtube"
        SET rodada = NULL
        WHERE id = v_scanner.id;

        RETURN format('Projeto %s: Scanner %s - IDs buscados, rodada limpo',
            project_id_param, v_scanner.id);
    END IF;

    -- PARTE 1: Inicializar scanners COM cache que ainda nao estao na pipeline
    FOR v_scanner IN
        SELECT s.id, s."ID cache videos" as cache
        FROM "Scanner de videos do youtube" s
        WHERE s."Projeto_id" = project_id_param
        AND s."Ativa?" = true
        AND s."ID cache videos" IS NOT NULL
        AND s."ID cache videos" != ''
        AND s."ID cache videos" != 'NOT'
        ORDER BY s.id
    LOOP
        -- Verificar se os IDs do CACHE estao na pipeline
        v_cache_ids := string_to_array(v_scanner.cache, ',');
        v_first_cache_id := TRIM(v_cache_ids[1]);

        -- Verifica se o PRIMEIRO ID do cache esta na pipeline
        SELECT NOT EXISTS (
            SELECT 1 FROM pipeline_processing
            WHERE video_youtube_id = v_first_cache_id
        ) INTO v_has_new_ids;

        -- Se tem IDs novos no cache, inicializar
        IF v_has_new_ids THEN
            PERFORM initialize_scanner_processing(v_scanner.id);
            v_processed_any := TRUE;
        END IF;
    END LOOP;

    -- PARTE 2: Processar TODOS os scanners que tem videos pendentes na pipeline
    FOR v_scanner IN
        SELECT DISTINCT pp.scanner_id as id
        FROM pipeline_processing pp
        WHERE pp.project_id = project_id_param
        AND pp.pipeline_completo = FALSE
        ORDER BY pp.scanner_id
    LOOP
        -- Processar videos do scanner
        SELECT process_scanner_videos(v_scanner.id) INTO v_result;
        v_processed_any := TRUE;
    END LOOP;

    -- Atualizar status
    PERFORM update_project_status_from_pipeline(project_id_param);

    IF v_processed_any THEN
        RETURN format('Projeto %s: Processado', project_id_param);
    ELSE
        RETURN format('Projeto %s: Nenhum scanner pendente', project_id_param);
    END IF;
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Orquestrador Principal do Pipeline 2
--
-- Esta funcao coordena TODO o processamento de um projeto:
--
-- 1. STATUS 0: Inicializacao
--    - Marca todos scanners ativos com rodada = 1
--    - Muda status para 1
--
-- 2. RODADA = 1: Busca IDs
--    - Chama update_video_id_cache() para buscar novos IDs
--    - Limpa rodada apos processar
--
-- 3. PARTE 1: Inicializar cache
--    - Para cada scanner com cache preenchido
--    - Verifica se primeiro ID do cache ja existe na pipeline
--    - Se nao existe, chama initialize_scanner_processing()
--
-- 4. PARTE 2: Processar videos pendentes
--    - Busca scanners com videos nao completos na pipeline
--    - Chama process_scanner_videos() para cada um
--
-- 5. Atualiza status do projeto baseado no progresso
--
-- CHAMADA:
-- ```sql
-- SELECT pipeline2_process_project(117);
-- ```
-- =============================================
