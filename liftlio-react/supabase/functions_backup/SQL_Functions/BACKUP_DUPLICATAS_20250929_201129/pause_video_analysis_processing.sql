-- =============================================
-- Função: pause_video_analysis_processing
-- Descrição: Pausa o processamento de análise de vídeos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.pause_video_analysis_processing(integer);

CREATE OR REPLACE FUNCTION public.pause_video_analysis_processing(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Notifica pausa do processamento
  PERFORM notify_process_status(project_id, 'Video_Analysis_Process_Paused');

  -- Remove o job agendado
  PERFORM cron.unschedule('process_video_analysis_' || project_id::text);
  RAISE NOTICE 'Paused video analysis processing for project ID: %', project_id;
END;
$function$;