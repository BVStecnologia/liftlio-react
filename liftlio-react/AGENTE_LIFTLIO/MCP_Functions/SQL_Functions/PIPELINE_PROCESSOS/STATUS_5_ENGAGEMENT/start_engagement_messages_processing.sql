CREATE OR REPLACE FUNCTION public.start_engagement_messages_processing(p_project_id integer, batch_size integer DEFAULT 10)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_job_name TEXT := 'process_engagement_messages_' || p_project_id::text;
  v_job_exists BOOLEAN;
  v_comentarios_nao_processados INTEGER;
BEGIN
  -- Verifica se já existe um job em execução para este projeto
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job_name
  ) INTO v_job_exists;

  IF v_job_exists THEN
    RETURN 'Já existe um processamento em andamento para este projeto.';
  END IF;

  -- Verifica quantos comentários existem para processar
  SELECT COUNT(*) INTO v_comentarios_nao_processados
  FROM public."Comentarios_Principais"
  WHERE "project_id" = p_project_id
  AND "comentario_analizado" = true
  AND "mensagem" = false;

  IF v_comentarios_nao_processados = 0 THEN
    UPDATE public."Projeto"
    SET "status" = '6'
    WHERE "id" = p_project_id;

    RETURN 'Não há comentários pendentes para processamento. Status do projeto atualizado para 6.';
  END IF;

  -- Inicia o processamento imediatamente
  PERFORM process_engagement_messages_batch(p_project_id, batch_size);

  RETURN format('Processamento iniciado para %s comentários pendentes no projeto ID: %s',
                v_comentarios_nao_processados, p_project_id);
END;
$function$