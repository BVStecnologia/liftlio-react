-- =============================================
-- Função: trigger_video_transcription
-- Descrição: Trigger para agendar processamento de transcrição de vídeos
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_video_transcription()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Agenda o primeiro processamento
    PERFORM cron.schedule(
        'process_video_transcription',
        '3 seconds',
        'SELECT process_video_transcription_batch()'
    );
    RETURN NEW;
END;
$function$