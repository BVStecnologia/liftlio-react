-- =============================================
-- Fun��o: process_project_step_2
-- Descri��o: Processa o passo 2 de um projeto
-- Criado: 2025-01-24
-- Atualizado: Fun��o para processar passo 2 com cron
-- =============================================

CREATE OR REPLACE FUNCTION public.process_project_step_2(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    result TEXT;
BEGIN
    -- Remove este agendamento
    PERFORM cron.unschedule('project_step_2_' || project_id::text);

    -- Remove duplicados
    result := remove_duplicate_videos(project_id);
    RAISE NOTICE 'Remo��o de duplicados: %', result;

    -- Agenda pr�ximo passo
    PERFORM cron.schedule(
        'project_step_3_' || project_id::text,
        '5 seconds',
        format('SELECT process_project_step_3(%s)', project_id)
    );
END;
$function$