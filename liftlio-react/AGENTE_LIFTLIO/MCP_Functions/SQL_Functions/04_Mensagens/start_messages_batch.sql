CREATE OR REPLACE FUNCTION public.start_messages_batch(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remove agendamento atual
    PERFORM cron.unschedule('process_messages_' || project_id::text);

    -- Processa um lote de mensagens
    PERFORM start_comments_message_processing(project_id, batch_size);

    -- Verifica se há mais mensagens para processar
    IF EXISTS (
        SELECT 1
        FROM "Comentarios_Principais" c
        JOIN "Videos" v ON c.video_id = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND c.mensagem_gerada = false
    ) THEN
        -- Agenda próximo lote
        PERFORM cron.schedule(
            'process_messages_' || project_id::text,
            '30 seconds',
            format('SELECT start_messages_batch(%s, %s)', project_id, batch_size)
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro no processamento de mensagens: %', SQLERRM;

    -- Re-agenda em caso de erro
    PERFORM cron.schedule(
        'process_messages_' || project_id::text,
        '1 minute',
        format('SELECT start_messages_batch(%s, %s)', project_id, batch_size)
    );
END;
$function$