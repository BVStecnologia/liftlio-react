-- =============================================
-- Função: process_project_step_3
-- Descrição: Processa o passo 3 de um projeto
-- Criado: 2025-01-24
-- Atualizado: Função para processar passo 3 com cron
-- =============================================

CREATE OR REPLACE FUNCTION public.process_project_step_3(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remove este agendamento
    PERFORM cron.unschedule('project_step_3_' || project_id::text);

    -- Inicia processamento de vídeos
    PERFORM start_video_processing(project_id);

    -- Agenda verificação de conclusão
    PERFORM cron.schedule(
        'check_videos_' || project_id::text,
        '30 seconds',
        format('SELECT check_videos_and_continue(%s)', project_id)
    );
END;
$function$