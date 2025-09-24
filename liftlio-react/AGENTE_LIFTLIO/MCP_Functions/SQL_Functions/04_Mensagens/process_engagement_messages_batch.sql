CREATE OR REPLACE FUNCTION public.process_engagement_messages_batch(p_project_id integer, batch_size integer DEFAULT 10)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_comentarios_nao_processados INTEGER;
  v_job_exists BOOLEAN;
  v_result RECORD;
  v_processed_count INTEGER := 0;
  v_job_name TEXT := 'process_engagement_messages_' || p_project_id::text;
BEGIN
  -- Verifica se j� existe um job em execu��o para este projeto
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job_name
  ) INTO v_job_exists;

  -- Verifica quantos coment�rios ainda n�o foram processados
  SELECT COUNT(*) INTO v_comentarios_nao_processados
  FROM public."Comentarios_Principais"
  WHERE "project_id" = p_project_id
  AND "comentario_analizado" = true
  AND "mensagem" = false;

  RAISE NOTICE 'Projeto ID: %. Coment�rios pendentes: %', p_project_id, v_comentarios_nao_processados;

  -- Se n�o h� mais coment�rios para processar, finaliza o job e atualiza o status
  IF v_comentarios_nao_processados = 0 THEN
    -- Remove o job agendado se existir
    IF v_job_exists THEN
      PERFORM cron.unschedule(v_job_name);
      RAISE NOTICE 'Job de processamento removido para projeto ID: %', p_project_id;
    END IF;

    -- Atualiza o status do projeto para 6
    UPDATE public."Projeto"
    SET "status" = '6'
    WHERE "id" = p_project_id;

    -- Chama a nova fun��o para agendar postagens (substituindo a antiga)
    PERFORM agendar_postagens_todos_projetos();

    RAISE NOTICE 'Todos os coment�rios processados. Status do projeto atualizado para 6.';
    RETURN;
  END IF;

  -- Processa o pr�ximo lote de coment�rios
  RAISE NOTICE 'Processando pr�ximo lote de coment�rios para projeto ID: %', p_project_id;

  -- Chama a fun��o para processar as mensagens
  FOR v_result IN
    SELECT * FROM process_and_create_messages_engagement(p_project_id)
  LOOP
    v_processed_count := v_processed_count + 1;
    IF v_processed_count <= 5 THEN -- Limita o log para n�o ficar muito extenso
      RAISE NOTICE 'Mensagem processada: % para coment�rio %: %',
        v_result.message_id, v_result.cp_id, v_result.status;
    ELSIF v_processed_count = 6 THEN
      RAISE NOTICE '... e mais mensagens processadas';
    END IF;
  END LOOP;

  RAISE NOTICE 'Lote processado: % mensagens. Verificando se h� mais coment�rios...', v_processed_count;

  -- Verifica novamente quantos coment�rios ainda n�o foram processados ap�s este lote
  SELECT COUNT(*) INTO v_comentarios_nao_processados
  FROM public."Comentarios_Principais"
  WHERE "project_id" = p_project_id
  AND "comentario_analizado" = true
  AND "mensagem" = false;

  -- Se ainda h� coment�rios, agenda o pr�ximo lote
  IF v_comentarios_nao_processados > 0 THEN
    -- Se o job j� existe, n�o precisamos reagendar
    IF NOT v_job_exists THEN
      PERFORM cron.schedule(
        v_job_name,
        '30 seconds', -- Intervalo entre execu��es
        format('SELECT process_engagement_messages_batch(%s, %s)', p_project_id, batch_size)
      );
      RAISE NOTICE 'Job agendado para processar pr�ximo lote em 30 segundos';
    ELSE
      RAISE NOTICE 'Job j� existe - pr�ximo lote ser� processado automaticamente';
    END IF;
  ELSE
    -- N�o h� mais coment�rios, finaliza o job e atualiza o status
    IF v_job_exists THEN
      PERFORM cron.unschedule(v_job_name);
    END IF;

    UPDATE public."Projeto"
    SET "status" = '6'
    WHERE "id" = p_project_id;

    -- Chama a nova fun��o para agendar postagens (substituindo a antiga)
    PERFORM agendar_postagens_todos_projetos();

    RAISE NOTICE 'Todos os coment�rios processados ap�s este lote. Status do projeto atualizado para 6.';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro durante o processamento em lote: %', SQLERRM;

  -- Em caso de erro, ainda mant�m o job agendado para tentar novamente
  IF NOT v_job_exists THEN
    PERFORM cron.schedule(
      v_job_name,
      '60 seconds', -- Intervalo maior em caso de erro
      format('SELECT process_engagement_messages_batch(%s, %s)', p_project_id, batch_size)
    );
    RAISE NOTICE 'Ocorreu um erro, reagendando para tentar novamente em 60 segundos';
  END IF;
END;
$function$