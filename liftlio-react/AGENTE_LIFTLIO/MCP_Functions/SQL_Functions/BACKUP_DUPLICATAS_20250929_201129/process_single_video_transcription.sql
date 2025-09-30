-- =============================================
-- Função: process_single_video_transcription
-- Descrição: Processa transcrição de um único vídeo
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_single_video_transcription();

CREATE OR REPLACE FUNCTION public.process_single_video_transcription()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_id text;
    v_transcription text;
    v_transcription_id int8;
    v_next_exists boolean;
BEGIN
    -- Seleciona um vídeo não processado
    SELECT "VIDEO" INTO v_video_id
    FROM "Videos"
    WHERE transcript IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN 'Não há vídeos para processar';
    END IF;

    -- Tenta fazer a transcrição
    SELECT youtube_transcribe(v_video_id) INTO v_transcription;

    -- Cria o registro de transcrição
    INSERT INTO "Videos_trancricao" (
        video_id,
        trancription,
        contem,
        created_at
    )
    VALUES (
        v_video_id,
        COALESCE(v_transcription, ''),
        v_transcription IS NOT NULL AND v_transcription != '',
        now()
    )
    RETURNING id INTO v_transcription_id;

    -- Atualiza o vídeo
    UPDATE "Videos"
    SET transcript = v_transcription_id
    WHERE "VIDEO" = v_video_id;

    -- Verifica se existe próximo vídeo para processar
    SELECT EXISTS (
        SELECT 1
        FROM "Videos"
        WHERE transcript IS NULL
        AND "VIDEO" != v_video_id
    ) INTO v_next_exists;

    -- Se existir próximo, agenda processamento
    IF v_next_exists THEN
        PERFORM pg_sleep(3);
        PERFORM process_single_video_transcription();
    END IF;

    RETURN 'Processado vídeo: ' || v_video_id;
END;
$function$;