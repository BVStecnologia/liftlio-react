-- =============================================
-- Função: start_video_processing
-- Descrição: Inicia processamento de vídeos em batch
-- Dependência de: update_video_stats
-- Criado: 2025-01-27
-- =============================================

CREATE OR REPLACE FUNCTION public.start_video_processing(project_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Inicia o processamento dos vídeos
  PERFORM process_videos_batch(project_id, 5);
END;
$function$