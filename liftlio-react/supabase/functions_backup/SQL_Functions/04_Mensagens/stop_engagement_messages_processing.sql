CREATE OR REPLACE FUNCTION public.stop_engagement_messages_processing(p_project_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_job_name TEXT := 'process_engagement_messages_' || p_project_id::text;
  v_job_exists BOOLEAN;
BEGIN
  -- Verifica se existe um job para este projeto
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job_name
  ) INTO v_job_exists;

  IF v_job_exists THEN
    PERFORM cron.unschedule(v_job_name);
    RETURN 'Processamento interrompido para o projeto ID: ' || p_project_id;
  ELSE
    RETURN 'Não há processamento em andamento para o projeto ID: ' || p_project_id;
  END IF;
END;
$function$