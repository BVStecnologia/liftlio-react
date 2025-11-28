-- =============================================
-- Função: process_step_3_curar_video
-- Descrição: Step 3 - Cura comentários usando Claude AI
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_step_3_curar_video(TEXT);

CREATE OR REPLACE FUNCTION public.process_step_3_curar_video(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_db_id BIGINT;
    v_current_step INTEGER;
    v_total_comentarios_principais INTEGER;
    v_curate_result JSONB;
    v_total_curados INTEGER;
BEGIN
    -- Buscar dados do vídeo na pipeline
    SELECT video_db_id, current_step, total_comentarios_principais
    INTO v_video_db_id, v_current_step, v_total_comentarios_principais
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe na pipeline
    IF v_video_db_id IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline ou video_db_id NULL.';
    END IF;

    -- Verificar se está no step correto
    IF v_current_step != 2 THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não está no step 2. Current step: ' || v_current_step;
    END IF;

    -- Verificar se tem comentários para curar
    IF v_total_comentarios_principais IS NULL OR v_total_comentarios_principais = 0 THEN
        -- Sem comentários, avançar step mesmo assim
        UPDATE pipeline_processing
        SET
            videos_curados = TRUE,
            videos_curados_at = NOW(),
            total_comentarios_curados = 0,
            curadoria_error = 'Vídeo sem comentários para curar',
            current_step = 3,  -- Avançar para step 3 (análise)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'WARNING: Vídeo ' || video_youtube_id_param || ' sem comentários. Avançando para step 3.';
    END IF;

    -- Chamar função de curadoria do sistema atual
    BEGIN
        v_curate_result := curate_comments_with_claude(v_video_db_id);

        -- Verificar se houve erro
        IF v_curate_result->>'error' IS NOT NULL THEN
            UPDATE pipeline_processing
            SET
                curadoria_error = 'Erro na curadoria: ' || (v_curate_result->>'message'),
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Curadoria falhou para vídeo ' || video_youtube_id_param || ': ' || (v_curate_result->>'message');
        END IF;

        -- Extrair total de comentários curados
        v_total_curados := (v_curate_result->>'top_comments_selected')::INTEGER;

        -- Atualizar pipeline_processing com sucesso
        UPDATE pipeline_processing
        SET
            videos_curados = TRUE,
            videos_curados_at = NOW(),
            total_comentarios_curados = v_total_curados,
            curadoria_error = NULL,
            retry_count = 0,
            current_step = 3,  -- Avançar para step 3 (análise)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'SUCCESS: ' || v_total_curados || ' comentários curados com Claude. Avançando para step 3.';

    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao chamar curadoria
            UPDATE pipeline_processing
            SET
                curadoria_error = 'Erro ao chamar curate_comments_with_claude: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Falha na curadoria do vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
    END;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 3: Curar Comentários com Claude
--
-- FUNCIONAMENTO:
-- 1. Verifica se está no step 2 (comentários buscados)
-- 2. Busca video_db_id e total_comentarios_principais
-- 3. Chama curate_comments_with_claude(video_db_id)
--    - Função usa Claude AI para selecionar melhores comentários
--    - Aplica lógica anti-spam (% adaptativo)
--    - DELETA comentários não selecionados
--    - Marca vídeo com LED (1-5)
-- 4. Extrai total de comentários curados do resultado
-- 5. Atualiza pipeline_processing:
--    - videos_curados = TRUE
--    - total_comentarios_curados = N
--    - current_step = 3 (avança para análise)
--
-- CASOS ESPECIAIS:
-- - Vídeo sem comentários: Avança step com warning
-- - Erro na curadoria: Marca erro, incrementa retry, NÃO avança
-- - Comentários poucos: Claude retorna todos sem deletar (economia)
--
-- INTEGRAÇÃO:
-- - USA função existente: curate_comments_with_claude(video_db_id)
-- - Esta função usa Claude Sonnet 4 para curadoria inteligente
-- - NÃO modifica funções do sistema atual
-- - Apenas lê resultado e atualiza pipeline
--
-- IMPORTANTE:
-- - curate_comments_with_claude() DELETA comentários não curados!
-- - Função pode demorar 30-120s (chamada Claude API)
-- - Resultado tem campo 'curated_comments' com comentários selecionados
--
-- USO:
-- SELECT process_step_3_curar_video('JBeQDU6WIPU');
-- =============================================
