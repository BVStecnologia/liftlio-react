-- =============================================
-- Fun��o: pause_comment_analysis_processing
-- Descri��o: Pausa o processamento de an�lise de coment�rios removendo o job agendado
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.pause_comment_analysis_processing(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Remove o job agendado
  PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
  RAISE NOTICE 'Paused comment analysis processing for project ID: %', project_id;
END;
$function$