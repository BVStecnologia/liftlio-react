-- =============================================
-- Função: process_video_transcription (TRIGGER)
-- Descrição: Trigger para processar transcrição de vídeos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_video_transcription();

CREATE OR REPLACE FUNCTION public.process_video_transcription()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    is_processing boolean;
    transcription_id int8;
BEGIN
    -- Log inicial
    RAISE NOTICE 'Iniciando processamento para vídeo: %', NEW.VIDEO;

    -- Verifica se já está processando
    SELECT COALESCE(current_setting('app.is_processing', true)::boolean, false) INTO is_processing;

    IF is_processing THEN
        RAISE NOTICE 'Já existe um processamento em andamento, aguardando...';
        RETURN NEW;
    END IF;

    -- Marca como processando
    PERFORM set_config('app.is_processing', 'true', false);
    RAISE NOTICE 'Marcado como processando';

    BEGIN
        -- Chama a função de transcrição
        RAISE NOTICE 'Chamando youtube_transcribe para o vídeo: %', NEW.VIDEO;
        PERFORM youtube_transcribe(NEW.VIDEO);

        -- Aguarda até encontrar a transcrição
        RAISE NOTICE 'Aguardando criação da transcrição...';
        FOR i IN 1..30 LOOP
            SELECT id INTO transcription_id
            FROM "Videos_trancricao"
            WHERE video_id = NEW.VIDEO
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND THEN
                RAISE NOTICE 'Transcrição encontrada com ID: %', transcription_id;
                -- Atualiza o transcript
                UPDATE "Videos"
                SET transcript = transcription_id
                WHERE VIDEO = NEW.VIDEO;
                RAISE NOTICE 'Tabela Videos atualizada com sucesso';
                EXIT;
            END IF;

            RAISE NOTICE 'Tentativa % - Aguardando 1 segundo...', i;
            PERFORM pg_sleep(1);
        END LOOP;

        IF NOT FOUND THEN
            RAISE NOTICE 'Timeout: Transcrição não encontrada após 30 segundos';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro no processamento: %', SQLERRM;
    END;

    -- Marca como não processando
    PERFORM set_config('app.is_processing', 'false', false);
    RAISE NOTICE 'Processamento finalizado';

    RETURN NEW;
END;
$function$;