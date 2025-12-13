-- =============================================
-- Funcao: process_pipeline_step_for_video
-- Descricao: Orquestrador - executa proximo step de UM video
-- Criado: 2025-11-14
-- Atualizado: 2025-11-28 - Adicionado protecao contra retry infinito (max 3)
-- =============================================

DROP FUNCTION IF EXISTS process_pipeline_step_for_video(TEXT);

CREATE OR REPLACE FUNCTION public.process_pipeline_step_for_video(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_current_step INTEGER;
    v_pipeline_completo BOOLEAN;
    v_retry_count INTEGER;
    v_result TEXT;
BEGIN
    -- Buscar step atual, status e retry_count
    SELECT current_step, pipeline_completo, COALESCE(retry_count, 0)
    INTO v_current_step, v_pipeline_completo, v_retry_count
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se video existe
    IF v_current_step IS NULL THEN
        RETURN 'ERROR: Video ' || video_youtube_id_param || ' nao encontrado na pipeline_processing.';
    END IF;

    -- Verificar se pipeline ja esta completo
    IF v_pipeline_completo = TRUE THEN
        RETURN 'INFO: Pipeline ja completo para video ' || video_youtube_id_param;
    END IF;

    -- PROTECAO: Verificar se excedeu maximo de retries (evita loop infinito)
    IF v_retry_count >= 3 THEN
        UPDATE pipeline_processing
        SET
            pipeline_completo = TRUE,
            pipeline_completo_at = NOW(),
            curadoria_error = 'BLOCKED: Max retries (3) exceeded at step ' || v_current_step,
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'BLOCKED: Video ' || video_youtube_id_param || ' excedeu max retries (3) no step ' || v_current_step || '. Marcado como completo para evitar loop.';
    END IF;

    -- Chamar funcao apropriada para o step atual
    CASE v_current_step
        WHEN 0 THEN
            v_result := process_step_1_criar_video(video_youtube_id_param);

        WHEN 1 THEN
            v_result := process_step_2_buscar_comentarios(video_youtube_id_param);

        WHEN 2 THEN
            v_result := process_step_3_curar_video(video_youtube_id_param);

        WHEN 3 THEN
            v_result := process_step_4_analisar_comentarios(video_youtube_id_param);

        WHEN 4 THEN
            v_result := process_step_5_criar_mensagens(video_youtube_id_param);

        WHEN 5 THEN
            UPDATE pipeline_processing
            SET
                pipeline_completo = TRUE,
                pipeline_completo_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            v_result := 'SUCCESS: Pipeline completo para video ' || video_youtube_id_param || '!';

        ELSE
            v_result := 'ERROR: Step invalido (' || v_current_step || ') para video ' || video_youtube_id_param;
    END CASE;

    RETURN v_result;
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Orquestrador de Steps com PROTECAO contra loop infinito
--
-- FUNCIONAMENTO:
-- 1. Verifica current_step do video
-- 2. Verifica retry_count (NOVO - protecao contra loop)
-- 3. Chama funcao apropriada para aquele step
-- 4. Cada funcao de step atualiza current_step
-- 5. Se chegar no step 5, marca pipeline_completo = TRUE
--
-- PROTECAO CONTRA LOOP (2025-11-28):
-- - Se retry_count >= 3, bloqueia video e marca como completo
-- - Evita que erros repetidos gastem API do Claude infinitamente
-- - Video bloqueado fica com curadoria_error = 'BLOCKED: Max retries...'
--
-- STEPS:
-- 0 -> process_step_1_criar_video()
-- 1 -> process_step_2_buscar_comentarios()
-- 2 -> process_step_3_curar_video()
-- 3 -> process_step_4_analisar_comentarios()
-- 4 -> process_step_5_criar_mensagens()
-- 5 -> Marca pipeline_completo = TRUE
--
-- =============================================
