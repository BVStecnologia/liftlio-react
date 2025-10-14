-- =============================================
-- Função: check_comments_and_start_messages
-- Descrição: Verifica comentários analisados e inicia processamento de mensagens automaticamente
-- Criado: 2025-01-23
-- Atualizado: Sistema de orquestração automática do fluxo de mensagens
-- =============================================

DROP FUNCTION IF EXISTS check_comments_and_start_messages(integer);

CREATE OR REPLACE FUNCTION public.check_comments_and_start_messages(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    comment_stats RECORD;
    v_job_exists BOOLEAN;
BEGIN
    -- Remove agendamento atual se existir
    SELECT EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = 'check_comments_' || project_id::text
    ) INTO v_job_exists;

    IF v_job_exists THEN
        PERFORM cron.unschedule('check_comments_' || project_id::text);
    END IF;

    -- Verifica status dos comentários
    SELECT * INTO comment_stats FROM contar_comentarios_analisados(project_id);

    IF comment_stats.comentarios_nao_analisados = 0 THEN
        -- Agenda o processamento de mensagens em vez de executar diretamente
        PERFORM cron.schedule(
            'process_messages_' || project_id::text,
            '5 seconds',
            format('SELECT start_messages_batch(%s, %s)', project_id, 5)
        );
    ELSE
        -- Re-agenda verificação para mais tarde
        PERFORM cron.schedule(
            'check_comments_' || project_id::text,
            '30 seconds',
            format('SELECT check_comments_and_start_messages(%s)', project_id)
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro na verificação de comentários: %', SQLERRM;

    -- Re-agenda em caso de erro
    PERFORM cron.schedule(
        'check_comments_' || project_id::text,
        '1 minute',
        format('SELECT check_comments_and_start_messages(%s)', project_id)
    );
END;
$function$