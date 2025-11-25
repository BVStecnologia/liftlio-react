-- =============================================
-- Funcao: initialize_scanner_processing
-- Descricao: Inicializa N registros na pipeline_processing (1 por video do cache)
-- Criado: 2025-11-14
-- Atualizado: 2025-11-25 - REMOVIDO DELETE para preservar historico
-- =============================================

DROP FUNCTION IF EXISTS initialize_scanner_processing(BIGINT);

CREATE OR REPLACE FUNCTION public.initialize_scanner_processing(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_project_id BIGINT;
    v_scanner_keyword TEXT;
    v_cache_ids TEXT;
    v_verificado_atual TEXT;
    v_video_ids TEXT[];
    v_each_video_id TEXT;
    v_created_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_log TEXT := '';
BEGIN
    -- Buscar dados do scanner
    SELECT "Projeto_id", "Keyword", "ID cache videos", "ID Verificado"
    INTO v_project_id, v_scanner_keyword, v_cache_ids, v_verificado_atual
    FROM "Scanner de videos do youtube"
    WHERE id = scanner_id_param;

    -- Verificar se scanner existe
    IF v_project_id IS NULL THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' nao encontrado';
    END IF;

    -- Verificar se ha IDs no cache
    IF v_cache_ids IS NULL OR v_cache_ids = '' THEN
        RETURN 'WARNING: Scanner ' || scanner_id_param || ' nao tem IDs no cache. Execute a busca de IDs primeiro.';
    END IF;

    -- =============================================
    -- REMOVIDO: DELETE dos registros antigos
    -- Agora preservamos o historico completo!
    -- =============================================

    -- Converter string de IDs para array
    v_video_ids := string_to_array(v_cache_ids, ',');

    -- Criar 1 LINHA para CADA video
    FOREACH v_each_video_id IN ARRAY v_video_ids LOOP
        -- Remover espacos em branco
        v_each_video_id := TRIM(v_each_video_id);

        -- Verificar se ID nao e vazio
        IF v_each_video_id != '' THEN
            BEGIN
                INSERT INTO public.pipeline_processing (
                    scanner_id,
                    project_id,
                    video_youtube_id,
                    video_db_id,
                    current_step,
                    is_processing,
                    retry_count,
                    created_at,
                    updated_at
                )
                VALUES (
                    scanner_id_param,
                    v_project_id,
                    v_each_video_id,
                    NULL,
                    0,
                    FALSE,
                    0,
                    NOW(),
                    NOW()
                );

                v_created_count := v_created_count + 1;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Video ja existe - isso e OK, so pula
                    v_skipped_count := v_skipped_count + 1;
                WHEN OTHERS THEN
                    v_log := v_log || 'ERRO: ' || v_each_video_id || ': ' || SQLERRM || E'\n';
            END;
        END IF;
    END LOOP;

    -- =============================================
    -- Mover IDs do cache para verificado
    -- =============================================
    IF v_created_count > 0 THEN
        UPDATE "Scanner de videos do youtube"
        SET
            "ID Verificado" = CASE
                WHEN "ID Verificado" IS NULL OR "ID Verificado" = ''
                THEN v_cache_ids
                ELSE "ID Verificado" || ',' || v_cache_ids
            END,
            "ID cache videos" = NULL  -- Limpa o cache
        WHERE id = scanner_id_param;
    END IF;

    RETURN format(
        'SUCCESS: Scanner %s (%s) - %s novos, %s ja existentes. IDs movidos para verificado.',
        scanner_id_param,
        v_scanner_keyword,
        v_created_count,
        v_skipped_count
    );
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Arquitetura por Video (refatorada 14/11/2025)
-- Historico preservado (atualizada 25/11/2025)
--
-- Esta funcao cria N LINHAS (1 por video do cache)
-- Exemplo:
--   Scanner 584 tem cache: 'dQw4w9WgXcQ,jNQXAC9IVRw'
--   Resultado: 2 linhas criadas
--     - Linha 1: scanner_id=584, video_youtube_id='dQw4w9WgXcQ'
--     - Linha 2: scanner_id=584, video_youtube_id='jNQXAC9IVRw'
--
-- MUDANCAS 25/11/2025:
-- - REMOVIDO DELETE que apagava historico
-- - Agora videos ja existentes sao pulados (unique_violation)
-- - Historico completo preservado para metricas/auditoria
--
-- FLUXO:
-- 1. Busca "ID cache videos" do scanner
-- 2. Faz split por virgula
-- 3. Para cada ID, cria uma linha com video_youtube_id
-- 4. Move IDs do cache para "ID Verificado"
-- 5. Limpa o cache
-- 6. Retorna quantas linhas foram criadas
--
-- USO:
-- SELECT initialize_scanner_processing(584);
-- =============================================
