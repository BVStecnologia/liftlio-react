-- =============================================
-- Função: check_videos_and_continue
-- Descrição: Verifica vídeos e continua processamento
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.check_videos_and_continue(bigint);

CREATE OR REPLACE FUNCTION public.check_videos_and_continue(projeto_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result jsonb;
    v_scanner_count integer;
    v_video_count integer;
    v_processed_count integer := 0;
    v_error_count integer := 0;
    v_scanner record;
BEGIN
    -- Contar scanners do projeto
    SELECT COUNT(*) INTO v_scanner_count
    FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = projeto_id;

    -- Contar vídeos já processados
    SELECT COUNT(*) INTO v_video_count
    FROM public."Videos" v
    WHERE EXISTS (
        SELECT 1
        FROM public."Scanner de videos do youtube" s
        WHERE s."Projeto_id" = projeto_id
        AND v.youtube_id = ANY(string_to_array(s.cache_video_ids, ','))
    );

    -- Se não há scanners, retornar erro
    IF v_scanner_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nenhum scanner encontrado para o projeto',
            'projeto_id', projeto_id
        );
    END IF;

    -- Processar scanners pendentes
    FOR v_scanner IN
        SELECT id, cache_video_ids
        FROM public."Scanner de videos do youtube"
        WHERE "Projeto_id" = projeto_id
        AND cache_video_ids IS NOT NULL
        AND rodada IS NOT NULL
    LOOP
        BEGIN
            -- Processar vídeos do scanner
            PERFORM public.process_scanner_videos(v_scanner.id);
            v_processed_count := v_processed_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING 'Erro ao processar scanner %: %', v_scanner.id, SQLERRM;
        END;
    END LOOP;

    -- Atualizar status do projeto se necessário
    IF v_processed_count > 0 THEN
        UPDATE public."Projeto"
        SET
            status = CASE
                WHEN v_error_count = 0 THEN '2'
                ELSE '3'
            END,
            last_processing = NOW()
        WHERE id = projeto_id;
    END IF;

    -- Retornar resultado
    RETURN jsonb_build_object(
        'success', true,
        'projeto_id', projeto_id,
        'scanner_count', v_scanner_count,
        'video_count', v_video_count,
        'processed_scanners', v_processed_count,
        'error_count', v_error_count,
        'timestamp', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'projeto_id', projeto_id
    );
END;
$function$;