-- =============================================
-- Função: process_step_1_criar_videos
-- Descrição: Step 1 - Cria vídeos na tabela Videos a partir dos IDs do cache
-- Adaptado de: update_video_stats (sem loop de scanners)
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_step_1_criar_videos(BIGINT);

CREATE OR REPLACE FUNCTION public.process_step_1_criar_videos(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_current_step INTEGER;
    v_ids_cache TEXT;
    v_project_id BIGINT;
    v_scanner_keyword TEXT;
    v_video_ids TEXT[];
    v_api_response JSONB;
    v_video_data JSONB;
    v_each_video_id TEXT;
    v_new_video_id BIGINT;
    v_created_ids BIGINT[] := ARRAY[]::BIGINT[];
    v_processed_count INTEGER := 0;
    i INTEGER;
    v_log TEXT := '';
BEGIN
    -- Verificar se scanner está no step correto
    SELECT current_step, ids_cache, project_id
    INTO v_current_step, v_ids_cache, v_project_id
    FROM pipeline_processing
    WHERE scanner_id = scanner_id_param;

    IF v_current_step IS NULL THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não encontrado na pipeline_processing.';
    END IF;

    IF v_current_step != 1 THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não está no step 1. Current step: ' || v_current_step;
    END IF;

    IF v_ids_cache IS NULL OR v_ids_cache = '' THEN
        RETURN 'ERROR: ids_cache está vazio. Execute process_step_0_buscar_ids() primeiro.';
    END IF;

    -- Buscar dados do scanner
    SELECT "Keyword" INTO v_scanner_keyword
    FROM "Scanner de videos do youtube"
    WHERE id = scanner_id_param;

    -- Converter string de IDs para array
    v_video_ids := string_to_array(v_ids_cache, ',');
    v_log := 'Processando ' || array_length(v_video_ids, 1) || ' IDs' || E'\n';

    -- Chamar Edge Function para buscar dados dos vídeos
    BEGIN
        v_api_response := call_youtube_edge_function(
            v_project_id::INTEGER,
            v_ids_cache
        );

        -- Verificar se a resposta contém vídeos
        IF v_api_response->'videos' IS NOT NULL AND jsonb_array_length(v_api_response->'videos') > 0 THEN
            -- Processar cada vídeo retornado
            FOR i IN 0..jsonb_array_length(v_api_response->'videos')-1 LOOP
                v_video_data := v_api_response->'videos'->i;
                v_each_video_id := v_video_data->>'videoId';

                -- Verificar se o vídeo já existe
                IF NOT EXISTS (SELECT 1 FROM "Videos" WHERE "VIDEO" = v_each_video_id) THEN
                    -- Inserir o vídeo
                    BEGIN
                        INSERT INTO "Videos" (
                            "VIDEO",
                            "Keyword",
                            scanner_id,
                            view_count,
                            like_count,
                            comment_count,
                            comment_count_youtube,
                            video_title,
                            video_description,
                            video_tags,
                            "Channel",
                            channel_id_yotube
                        ) VALUES (
                            v_each_video_id,
                            v_scanner_keyword,
                            scanner_id_param,
                            (v_video_data->>'viewCount')::bigint,
                            (v_video_data->>'likeCount')::bigint,
                            (v_video_data->>'commentCount')::bigint,
                            (v_video_data->>'commentCount')::bigint,
                            v_video_data->>'title',
                            v_video_data->>'description',
                            v_video_data->>'tags',
                            v_video_data->>'channelTitle',
                            v_video_data->>'channelId'
                        )
                        RETURNING id INTO v_new_video_id;

                        -- Adicionar ID ao array de criados
                        v_created_ids := array_append(v_created_ids, v_new_video_id);
                        v_processed_count := v_processed_count + 1;
                        v_log := v_log || 'Vídeo inserido: ' || v_each_video_id || ' (ID: ' || v_new_video_id || ')' || E'\n';
                    EXCEPTION
                        WHEN OTHERS THEN
                            v_log := v_log || 'Erro ao inserir vídeo ' || v_each_video_id || ': ' || SQLERRM || E'\n';
                    END;
                ELSE
                    v_log := v_log || 'Vídeo ' || v_each_video_id || ' já existe na tabela' || E'\n';
                END IF;
            END LOOP;
        ELSE
            v_log := v_log || 'Nenhum vídeo retornado da API' || E'\n';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao chamar Edge Function
            UPDATE pipeline_processing
            SET
                videos_error = 'Erro ao chamar Edge Function: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE scanner_id = scanner_id_param;

            RETURN 'ERROR: Falha ao chamar Edge Function. ' || SQLERRM;
    END;

    -- Atualizar scanner (ID Verificado e limpar cache)
    UPDATE "Scanner de videos do youtube"
    SET "ID Verificado" = CASE
            WHEN "ID Verificado" IS NULL OR "ID Verificado" = ''
            THEN v_ids_cache
            ELSE "ID Verificado" || ',' || v_ids_cache
        END,
        "ID cache videos" = ''
    WHERE id = scanner_id_param;

    -- Atualizar pipeline_processing
    UPDATE pipeline_processing
    SET
        videos_criados = TRUE,
        videos_criados_at = NOW(),
        total_videos_criados = v_processed_count,
        videos_criados_ids = v_created_ids,
        videos_error = NULL,  -- Limpar erro anterior
        current_step = 2,     -- Avançar para próximo step
        updated_at = NOW()
    WHERE scanner_id = scanner_id_param;

    RETURN 'SUCCESS: ' || v_processed_count || ' vídeos criados. Avançando para step 2 (buscar comentários).' || E'\n' || v_log;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 1: Criar Vídeos
--
-- Esta função:
-- 1. Lê IDs de ids_cache (pipeline_processing)
-- 2. Chama call_youtube_edge_function para buscar dados
-- 3. Insere vídeos na tabela Videos
-- 4. Salva array de IDs criados em videos_criados_ids
-- 5. Atualiza scanner (ID Verificado, limpa cache)
-- 6. Avança para step 2
--
-- Em caso de erro na Edge Function:
-- - Marca videos_error
-- - Incrementa retry_count
-- - NÃO avança step (permanece em 1)
--
-- USO:
-- SELECT process_step_1_criar_videos(584);
-- =============================================
