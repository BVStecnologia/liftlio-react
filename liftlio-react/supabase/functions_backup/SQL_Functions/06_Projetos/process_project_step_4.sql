-- =============================================
-- Fun��o: process_project_step_4
-- Descri��o: Processa o passo 4 de um projeto
-- Criado: 2025-01-24
-- Atualizado: Fun��o para processar passo 4 com cron
-- =============================================

CREATE OR REPLACE FUNCTION public.process_project_step_4(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remove este agendamento
    PERFORM cron.unschedule('project_step_4_' || project_id::text);

    -- Inicia an�lise de v�deos
    PERFORM start_video_analysis_processing(project_id);

    -- Agenda verifica��o de conclus�o
    PERFORM cron.schedule(
        'check_analysis_' || project_id::text,
        '30 seconds',
        format('SELECT check_analysis_and_continue(%s)', project_id)
    );
END;
$function$