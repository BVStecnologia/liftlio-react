-- =============================================
-- Função: start_video_analysis_processing
-- Descrição: Inicia análise de vídeos com Claude
-- Status: 3 → 4 (quando completo)
-- Criado: 2025-01-27
-- =============================================

CREATE OR REPLACE FUNCTION public.start_video_analysis_processing(project_id integer, batch_size integer DEFAULT 5)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Inicia o processamento dos vídeos
  PERFORM process_video_analysis_batch(project_id, batch_size);
  RAISE NOTICE 'Started video analysis processing for project ID: %', project_id;
END;
$function$