-- =============================================
-- Fun��o: process_project_step_1
-- Descri��o: Processa o passo 1 de um projeto
-- Criado: 2025-01-24
-- Atualizado: Fun��o para processar passo 1 com cron
-- =============================================

CREATE OR REPLACE FUNCTION public.process_project_step_1(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remove este agendamento
    PERFORM cron.unschedule('project_step_1_' || project_id::text);

    -- Executa atualiza��o de cache
    PERFORM atualizar_cache_e_stats(project_id);

    -- Agenda pr�ximo passo
    PERFORM cron.schedule(
        'project_step_2_' || project_id::text,
        '5 seconds',
        format('SELECT process_project_step_2(%s)', project_id)
    );
END;
$function$