-- =============================================
-- Função: process_video_transcription_batch
-- Descrição: Processa transcrições de vídeos em lote
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_video_transcription_batch();

CREATE OR REPLACE FUNCTION public.process_video_transcription_batch()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_id text;
    v_video_table_id bigint;
    v_transcription text;
    v_transcription_id int8;
    v_job_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Iniciando processamento de transcrição em lote';

    -- Seleciona um vídeo não processado e captura seu ID interno
    SELECT "VIDEO", id INTO v_video_id, v_video_table_id
    FROM "Videos"
    WHERE transcript IS NULL
    LIMIT 1;

    IF v_video_id IS NULL THEN
        RAISE NOTICE 'Nenhum vídeo pendente encontrado';
        -- Verifica e remove o job se existir
        SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_video_transcription')
        INTO v_job_exists;

        IF v_job_exists THEN
            PERFORM cron.unschedule('process_video_transcription');
            RAISE NOTICE 'Job desagendado';
        END IF;
        RETURN;
    END IF;

    RAISE NOTICE 'Processando vídeo ID: %, table ID: %', v_video_id, v_video_table_id;

    -- Obtenha a transcrição do vídeo
    SELECT youtube_transcribe(v_video_id) INTO v_transcription;
    RAISE NOTICE 'Resultado da transcrição obtido, tamanho: %',
                 CASE WHEN v_transcription IS NULL THEN 'NULL' ELSE length(v_transcription)::text END;

    -- SOLUÇÃO PARA REFERÊNCIA CIRCULAR:
    -- 1. Primeiro insira na tabela Videos_trancricao sem referenciar Videos
    INSERT INTO "Videos_trancricao" (
        video_id,
        trancription,
        contem,
        created_at
        -- Temporariamente NÃO inserimos "table video" aqui para evitar o ciclo
    )
    VALUES (
        v_video_id,
        v_transcription,
        v_transcription IS NOT NULL AND length(trim(coalesce(v_transcription, ''))) > 0,
        now()
    )
    RETURNING id INTO v_transcription_id;

    RAISE NOTICE 'Transcrição inserida com ID: %', v_transcription_id;

    -- 2. Atualize a tabela Videos com a referência à transcrição
    UPDATE "Videos"
    SET transcript = v_transcription_id
    WHERE "VIDEO" = v_video_id;

    RAISE NOTICE 'Vídeo atualizado com ID de transcrição';

    -- 3. Agora atualize a tabela Videos_trancricao com a referência ao vídeo
    UPDATE "Videos_trancricao"
    SET "table video" = v_video_table_id
    WHERE id = v_transcription_id;

    RAISE NOTICE 'Transcrição atualizada com referência ao vídeo';

    -- Verifica se há mais vídeos para processar
    IF EXISTS (
        SELECT 1
        FROM "Videos"
        WHERE transcript IS NULL
        AND "VIDEO" != v_video_id
    ) THEN
        -- Agenda próxima execução
        PERFORM cron.schedule(
            'process_video_transcription',
            '3 seconds',
            'SELECT process_video_transcription_batch()'
        );
        RAISE NOTICE 'Próxima execução agendada para daqui 3 segundos';
    ELSE
        RAISE NOTICE 'Não há mais vídeos pendentes para processar';
    END IF;
END;
$function$;