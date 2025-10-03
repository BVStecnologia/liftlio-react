-- =============================================
-- Fun��o: process_comment_analysis_batch
-- Descri��o: Processa lote de an�lise de coment�rios e gerencia job agendado
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.process_comment_analysis_batch(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_comentarios_nao_analisados INTEGER;
  v_resultado TEXT;
  v_job_exists BOOLEAN;
BEGIN
  -- Verifica quantos coment�rios ainda n�o foram analisados
  SELECT comentarios_nao_analisados INTO v_comentarios_nao_analisados
  FROM contar_comentarios_analisados(project_id);

  IF v_comentarios_nao_analisados > 0 THEN
    -- Chama a fun��o para analisar o pr�ximo lote de coment�rios
    SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;

    RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

    -- Agenda a pr�xima execu��o
    PERFORM cron.schedule(
      'process_comment_analysis_' || project_id::text,
      '5 seconds',
      format('SELECT process_comment_analysis_batch(%s, %s)', project_id, batch_size)
    );

  ELSE
    -- Verifica se o job existe antes de tentar remov�-lo
    SELECT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'process_comment_analysis_' || project_id::text
    ) INTO v_job_exists;

    -- Remove o job agendado apenas se ele existir
    IF v_job_exists THEN
      PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
    END IF;

    -- Atualiza o status do projeto para 4 quando todos os coment�rios foram processados
    UPDATE public."Projeto"
    SET status = '5'
    WHERE id = project_id;

    RAISE NOTICE 'All comments processed for project ID: %', project_id;
  END IF;
END;
$function$