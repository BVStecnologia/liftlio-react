-- =============================================
-- Função: process_scanner_videos
-- Descrição: Orquestrador - processa TODOS os vídeos de um scanner
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_scanner_videos(BIGINT);

CREATE OR REPLACE FUNCTION public.process_scanner_videos(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_record RECORD;
    v_total_videos INTEGER := 0;
    v_videos_processados INTEGER := 0;
    v_videos_completos INTEGER := 0;
    v_videos_com_erro INTEGER := 0;
    v_result TEXT;
BEGIN
    -- Contar total de vídeos deste scanner na pipeline
    SELECT COUNT(*) INTO v_total_videos
    FROM pipeline_processing
    WHERE scanner_id = scanner_id_param;

    -- Verificar se scanner tem vídeos
    IF v_total_videos = 0 THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não tem vídeos na pipeline. Execute initialize_scanner_processing() primeiro.';
    END IF;

    RAISE NOTICE 'Iniciando processamento de % vídeos do scanner %', v_total_videos, scanner_id_param;

    -- Processar cada vídeo que NÃO está completo
    FOR v_video_record IN
        SELECT video_youtube_id, current_step, pipeline_completo
        FROM pipeline_processing
        WHERE scanner_id = scanner_id_param
        AND pipeline_completo = FALSE
        ORDER BY id
    LOOP
        v_videos_processados := v_videos_processados + 1;

        RAISE NOTICE '[%/%] Processando vídeo % (step atual: %)',
            v_videos_processados, v_total_videos,
            v_video_record.video_youtube_id, v_video_record.current_step;

        -- Processar próximo step do vídeo
        BEGIN
            v_result := process_pipeline_step_for_video(v_video_record.video_youtube_id);

            -- Verificar se completou
            IF v_result LIKE '%Pipeline completo%' OR v_result LIKE '%pipeline_completo = TRUE%' THEN
                v_videos_completos := v_videos_completos + 1;
                RAISE NOTICE '✅ Vídeo % COMPLETO! (%/%)',
                    v_video_record.video_youtube_id, v_videos_completos, v_total_videos;
            ELSIF v_result LIKE 'ERROR%' THEN
                v_videos_com_erro := v_videos_com_erro + 1;
                RAISE WARNING '❌ Erro no vídeo %: %',
                    v_video_record.video_youtube_id, v_result;
            ELSE
                RAISE NOTICE '⏸️ Vídeo % avançou para próximo step',
                    v_video_record.video_youtube_id;
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                v_videos_com_erro := v_videos_com_erro + 1;
                RAISE WARNING '❌ Exceção no vídeo %: %',
                    v_video_record.video_youtube_id, SQLERRM;
        END;
    END LOOP;

    -- Retornar resumo
    RETURN format(
        'Scanner %s processado: %s/%s vídeos completos, %s com erro',
        scanner_id_param,
        v_videos_completos,
        v_total_videos,
        v_videos_com_erro
    );
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- Orquestrador de Scanner (Batch Processing)
--
-- Esta função processa TODOS os vídeos de um scanner em lote.
--
-- FUNCIONAMENTO:
-- 1. Busca todos vídeos do scanner na pipeline_processing
-- 2. Para cada vídeo NÃO completo (pipeline_completo = FALSE):
--    - Chama process_pipeline_step_for_video(video_youtube_id)
--    - Avança 1 step por vez
--    - Marca erros e sucessos
-- 3. Retorna resumo: quantos completos, quantos com erro
--
-- IMPORTANTE:
-- - Processa apenas vídeos incompletos
-- - Avança 1 step por chamada (não processa step completo de uma vez)
-- - Para processar até completar, precisa chamar múltiplas vezes
-- - Ideal para cron job que executa a cada X minutos
--
-- EXEMPLO DE USO:
-- ```sql
-- -- Inicializar scanner com cache de IDs
-- SELECT initialize_scanner_processing(584);
--
-- -- Processar 1 rodada (avança 1 step em cada vídeo)
-- SELECT process_scanner_videos(584);
-- -- Resultado: "Scanner 584 processado: 0/2 vídeos completos, 0 com erro"
--
-- -- Chamar novamente (avança mais 1 step)
-- SELECT process_scanner_videos(584);
--
-- -- Continuar chamando até todos completarem
-- SELECT process_scanner_videos(584);
-- -- Resultado: "Scanner 584 processado: 2/2 vídeos completos, 0 com erro"
-- ```
--
-- INTEGRAÇÃO COM CRON:
-- ```sql
-- -- Agendar para rodar a cada 5 minutos
-- SELECT cron.schedule(
--   'process_scanner_584',
--   '*/5 * * * *',  -- A cada 5 minutos
--   'SELECT process_scanner_videos(584)'
-- );
-- ```
--
-- VANTAGENS:
-- - Processa múltiplos vídeos em paralelo (cada um no seu step)
-- - Resiliência a erros (um vídeo com erro não trava os outros)
-- - Progressão incremental (pode parar e retomar a qualquer momento)
-- - Ideal para processamento assíncrono
-- =============================================
