-- =============================================
-- Função: process_step_1_criar_video
-- Descrição: Step 1 - Cria UM vídeo na tabela Videos
-- Criado: 2025-11-14
-- Atualizado: 2025-11-14 - Refatorado para processar 1 vídeo por vez
-- =============================================

DROP FUNCTION IF EXISTS process_step_1_criar_videos(BIGINT);
DROP FUNCTION IF EXISTS process_step_1_criar_video(TEXT);

CREATE OR REPLACE FUNCTION public.process_step_1_criar_video(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_scanner_id BIGINT;
    v_project_id BIGINT;
    v_scanner_keyword TEXT;
    v_current_step INTEGER;
    v_api_response JSONB;
    v_video_data JSONB;
    v_new_video_id BIGINT;
    v_existing_video_id BIGINT;
BEGIN
    -- Buscar dados da linha do vídeo na pipeline
    SELECT scanner_id, project_id, current_step
    INTO v_scanner_id, v_project_id, v_current_step
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe na pipeline
    IF v_scanner_id IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline_processing.';
    END IF;

    -- Verificar se está no step correto
    IF v_current_step != 0 THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não está no step 0. Current step: ' || v_current_step;
    END IF;

    -- Buscar keyword do scanner
    SELECT "Keyword"
    INTO v_scanner_keyword
    FROM "Scanner de videos do youtube"
    WHERE id = v_scanner_id;

    -- Verificar se vídeo já existe na tabela Videos
    SELECT id INTO v_existing_video_id
    FROM "Videos"
    WHERE "VIDEO" = video_youtube_id_param;

    -- Se vídeo já existe, apenas atualizar pipeline_processing
    IF v_existing_video_id IS NOT NULL THEN
        UPDATE pipeline_processing
        SET
            video_db_id = v_existing_video_id,
            video_criado = TRUE,
            video_criado_at = NOW(),
            video_error = NULL,
            current_step = 1,  -- Avançar para step 1 (buscar comentários)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'SUCCESS: Vídeo ' || video_youtube_id_param || ' já existe (ID: ' || v_existing_video_id || '). Pipeline atualizada para step 1.';
    END IF;

    -- Chamar Edge Function para buscar dados do vídeo (apenas este 1 ID)
    BEGIN
        v_api_response := call_youtube_edge_function(
            v_project_id::INTEGER,
            video_youtube_id_param  -- ← Apenas 1 ID!
        );

        -- Verificar se a resposta contém o vídeo
        IF v_api_response->'videos' IS NOT NULL AND jsonb_array_length(v_api_response->'videos') > 0 THEN
            v_video_data := v_api_response->'videos'->0;  -- Primeiro (e único) vídeo

            -- Inserir o vídeo na tabela Videos
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
                    video_youtube_id_param,
                    v_scanner_keyword,
                    v_scanner_id,
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

                -- Atualizar pipeline_processing com sucesso
                UPDATE pipeline_processing
                SET
                    video_db_id = v_new_video_id,
                    video_criado = TRUE,
                    video_criado_at = NOW(),
                    video_error = NULL,
                    retry_count = 0,  -- Resetar retry count após sucesso
                    current_step = 1,  -- Avançar para step 1 (buscar comentários)
                    updated_at = NOW()
                WHERE video_youtube_id = video_youtube_id_param;

                RETURN 'SUCCESS: Vídeo ' || video_youtube_id_param || ' criado (ID: ' || v_new_video_id || '). Avançando para step 1.';

            EXCEPTION
                WHEN OTHERS THEN
                    -- Erro ao inserir vídeo
                    UPDATE pipeline_processing
                    SET
                        video_error = 'Erro ao inserir vídeo: ' || SQLERRM,
                        retry_count = retry_count + 1,
                        last_retry_at = NOW(),
                        updated_at = NOW()
                    WHERE video_youtube_id = video_youtube_id_param;

                    RETURN 'ERROR: Falha ao inserir vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
            END;
        ELSE
            -- API não retornou dados
            UPDATE pipeline_processing
            SET
                video_error = 'API não retornou dados para este vídeo',
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: API não retornou dados para vídeo ' || video_youtube_id_param;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao chamar Edge Function
            UPDATE pipeline_processing
            SET
                video_error = 'Erro ao chamar Edge Function: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Falha ao chamar Edge Function para vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
    END;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- ✅ NOVA ARQUITETURA (refatorada 14/11/2025)
--
-- STEP 1: Criar Vídeo (singular - processa 1 vídeo por vez)
--
-- MUDANÇAS vs versão antiga:
-- ❌ Antiga: process_step_1_criar_videos(scanner_id) - processava TODOS vídeos
-- ✅ Nova: process_step_1_criar_video(video_youtube_id) - processa APENAS 1
--
-- FLUXO:
-- 1. Busca dados do vídeo na pipeline_processing
-- 2. Verifica se está no step correto (0)
-- 3. Verifica se vídeo já existe na tabela Videos
--    - Se existe: atualiza pipeline e avança step
--    - Se não existe: chama API
-- 4. Chama call_youtube_edge_function com APENAS 1 ID
-- 5. Insere vídeo na tabela Videos
-- 6. Atualiza APENAS a linha deste vídeo:
--    - video_db_id = ID do vídeo criado
--    - video_criado = TRUE
--    - current_step = 1
-- 7. Em caso de erro:
--    - Marca video_error
--    - Incrementa retry_count
--    - NÃO avança step
--
-- IMPORTANTE:
-- - Processa apenas 1 vídeo (não um array)
-- - Não mexe no scanner (ID Verificado, cache)
-- - Atualiza apenas a linha do vídeo específico
-- - Tratamento de vídeo já existente
--
-- USO:
-- SELECT process_step_1_criar_video('dQw4w9WgXcQ');
-- =============================================
