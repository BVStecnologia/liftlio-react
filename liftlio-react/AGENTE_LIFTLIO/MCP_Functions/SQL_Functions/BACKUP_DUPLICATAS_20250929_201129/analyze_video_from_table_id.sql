-- =============================================
-- Função: analyze_video_from_table_id
-- Descrição: Analisa vídeo a partir do ID da tabela
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.analyze_video_from_table_id(bigint);

CREATE OR REPLACE FUNCTION public.analyze_video_from_table_id(p_video_table_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_youtube_id TEXT;
    v_channel_id TEXT;
    v_result JSONB;
    v_error_message TEXT;
    v_stack_trace TEXT;
BEGIN
    -- Validar entrada
    IF p_video_table_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ID da tabela de vídeo é obrigatório'
        );
    END IF;

    -- Buscar youtube_id e channel_id do vídeo
    SELECT
        youtube_id,
        channel_id
    INTO
        v_youtube_id,
        v_channel_id
    FROM
        public."Videos"
    WHERE
        id = p_video_table_id;

    -- Verificar se o vídeo foi encontrado
    IF v_youtube_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Vídeo não encontrado com ID: ' || p_video_table_id
        );
    END IF;

    -- Log do início do processamento
    RAISE NOTICE 'Iniciando análise do vídeo. Table ID: %, YouTube ID: %, Channel ID: %',
        p_video_table_id, v_youtube_id, v_channel_id;

    BEGIN
        -- Chamar a função de análise com o youtube_id e channel_id
        SELECT public.analyze_video(v_youtube_id, v_channel_id) INTO v_result;

        -- Verificar o resultado
        IF v_result->>'success' = 'true' THEN
            -- Adicionar o table_id ao resultado
            v_result := v_result || jsonb_build_object('video_table_id', p_video_table_id);

            RAISE NOTICE 'Análise concluída com sucesso para vídeo %', p_video_table_id;
        ELSE
            RAISE NOTICE 'Análise falhou para vídeo %: %',
                p_video_table_id, v_result->>'error';
        END IF;

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_error_message = MESSAGE_TEXT,
            v_stack_trace = PG_EXCEPTION_DETAIL;

        RAISE WARNING 'Erro ao analisar vídeo %: % - %',
            p_video_table_id, v_error_message, v_stack_trace;

        RETURN jsonb_build_object(
            'success', false,
            'error', v_error_message,
            'details', v_stack_trace,
            'video_table_id', p_video_table_id,
            'youtube_id', v_youtube_id,
            'channel_id', v_channel_id
        );
    END;
END;
$function$;