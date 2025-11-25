-- =============================================
-- Função: process_step_2_buscar_comentarios
-- Descrição: Step 2 - Busca comentários do YouTube para o vídeo
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_step_2_buscar_comentarios(TEXT);

CREATE OR REPLACE FUNCTION public.process_step_2_buscar_comentarios(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_db_id BIGINT;
    v_project_id BIGINT;
    v_scanner_id BIGINT;
    v_current_step INTEGER;
    v_comment_count_youtube INTEGER;
    v_total_principais INTEGER := 0;
    v_total_respostas INTEGER := 0;
BEGIN
    -- Buscar dados do vídeo na pipeline
    SELECT video_db_id, project_id, scanner_id, current_step
    INTO v_video_db_id, v_project_id, v_scanner_id, v_current_step
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe na pipeline
    IF v_video_db_id IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline ou video_db_id NULL.';
    END IF;

    -- Verificar se está no step correto
    IF v_current_step != 1 THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não está no step 1. Current step: ' || v_current_step;
    END IF;

    -- Buscar comment_count_youtube da tabela Videos
    SELECT comment_count_youtube INTO v_comment_count_youtube
    FROM "Videos"
    WHERE id = v_video_db_id;

    -- Verificar se vídeo tem comentários
    IF v_comment_count_youtube IS NULL OR v_comment_count_youtube = 0 THEN
        -- Vídeo sem comentários, avançar step mesmo assim
        UPDATE pipeline_processing
        SET
            comentarios_buscados = TRUE,
            comentarios_buscados_at = NOW(),
            total_comentarios_principais = 0,
            total_respostas = 0,
            comentarios_error = 'Vídeo sem comentários disponíveis',
            current_step = 2,  -- Avançar para step 2 (curar)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'WARNING: Vídeo ' || video_youtube_id_param || ' sem comentários. Avançando para step 2.';
    END IF;

    -- Chamar função do sistema atual para buscar comentários do YouTube
    -- NOTA: fetch_and_store_comments_for_video busca da API e salva nas tabelas
    BEGIN
        -- CAST project_id para INTEGER (função espera INTEGER, não BIGINT)
        PERFORM fetch_and_store_comments_for_video(video_youtube_id_param, v_project_id::INTEGER);

        -- Contar comentários principais inseridos
        SELECT COUNT(*) INTO v_total_principais
        FROM "Comentarios_Principais"
        WHERE video_id = v_video_db_id;

        -- Contar respostas inseridas
        SELECT COUNT(*) INTO v_total_respostas
        FROM "Respostas_Comentarios" rc
        INNER JOIN "Comentarios_Principais" cp ON rc.parent_comment_id = cp.id_do_comentario
        WHERE cp.video_id = v_video_db_id;

        -- Atualizar pipeline_processing com sucesso
        UPDATE pipeline_processing
        SET
            comentarios_buscados = TRUE,
            comentarios_buscados_at = NOW(),
            total_comentarios_principais = v_total_principais,
            total_respostas = v_total_respostas,
            comentarios_error = NULL,
            retry_count = 0,
            current_step = 2,  -- Avançar para step 2 (curar)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'SUCCESS: ' || v_total_principais || ' comentários principais + ' || v_total_respostas || ' respostas buscados. Avançando para step 2.';

    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao buscar comentários
            UPDATE pipeline_processing
            SET
                comentarios_error = 'Erro ao buscar comentários: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Falha ao buscar comentários do vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
    END;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 2: Buscar Comentários
--
-- FUNCIONAMENTO:
-- 1. Verifica se está no step 1 (vídeo criado)
-- 2. Busca video_db_id da pipeline
-- 3. Verifica se vídeo tem comentários (comment_count_youtube)
-- 4. Chama get_filtered_comments(video_db_id) do sistema atual
--    - Função JÁ salva comentários nas tabelas
--    - Comentarios_Principais (principais)
--    - Respostas_Comentarios (replies)
-- 5. Conta comentários inseridos
-- 6. Atualiza pipeline_processing:
--    - comentarios_buscados = TRUE
--    - total_comentarios_principais = N
--    - total_respostas = M
--    - current_step = 2 (avança para curadoria)
--
-- CASOS ESPECIAIS:
-- - Vídeo sem comentários: Avança step com warning
-- - Erro ao buscar: Marca erro, incrementa retry, NÃO avança
--
-- INTEGRAÇÃO:
-- - USA função existente: fetch_and_store_comments_for_video(video_youtube_id, project_id)
-- - Esta função busca comentários da API do YouTube e salva nas tabelas
-- - NÃO modifica funções do sistema atual
-- - Apenas lê dados e atualiza pipeline
--
-- USO:
-- SELECT process_step_2_buscar_comentarios('YAWwH--91h0');
-- =============================================
