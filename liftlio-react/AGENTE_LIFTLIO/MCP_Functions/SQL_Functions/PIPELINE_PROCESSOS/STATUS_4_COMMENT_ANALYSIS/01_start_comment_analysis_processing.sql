CREATE OR REPLACE FUNCTION public.start_comment_analysis_processing(project_id integer, batch_size integer DEFAULT 5)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Inicia o processamento dos comentários
  PERFORM process_comment_analysis_batch(project_id, batch_size);
  RAISE NOTICE 'Started comment analysis processing for project ID: %', project_id;
END;
$function$