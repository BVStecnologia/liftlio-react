-- =============================================
-- Função: process_video_analysis_batch
-- Descrição: Processa análise de vídeos em lote
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_video_analysis_batch(integer, integer);

CREATE OR REPLACE FUNCTION public.process_video_analysis_batch(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_video_id BIGINT;
  pending_count INTEGER;
  v_job_exists BOOLEAN;
BEGIN
  -- Conta vídeos pendentes
  SELECT COUNT(*)
  INTO pending_count
  FROM "Videos" v
  JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
  WHERE s."Projeto_id" = project_id
    AND (v.relevance_reason IS NULL OR v.relevance_reason = '');

  -- Processa os vídeos pendentes
  FOR v_video_id IN (
    SELECT v.id
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id
      AND (v.relevance_reason IS NULL OR v.relevance_reason = '')
    LIMIT batch_size
  ) LOOP
    PERFORM update_video_analysis(v_video_id);
    RAISE NOTICE 'Processed video ID: %', v_video_id;
  END LOOP;

  -- Verifica se ainda há vídeos pendentes
  IF EXISTS (
    SELECT 1
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id
      AND (v.relevance_reason IS NULL OR v.relevance_reason = '')
  ) THEN
    -- Agenda a próxima execução
    BEGIN
      PERFORM cron.schedule(
        'process_video_analysis_' || project_id::text,
        '5 seconds',
        format('SELECT process_video_analysis_batch(%s, %s)', project_id, batch_size)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao agendar próximo lote: %', SQLERRM;
    END;
  ELSE
    -- Verifica se o job existe antes de tentar removê-lo
    SELECT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'process_video_analysis_' || project_id::text
    ) INTO v_job_exists;

    IF v_job_exists THEN
      PERFORM cron.unschedule('process_video_analysis_' || project_id::text);
    END IF;

    -- Atualiza o status do projeto para 3 quando todos os vídeos foram analisados
    UPDATE public."Projeto"
    SET status = '4'
    WHERE id = project_id;

    RAISE NOTICE 'All videos processed for project ID: %', project_id;
  END IF;
END;
$function$;