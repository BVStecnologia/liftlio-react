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
  -- Verifica se já existe um job em execução para este projeto
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job_name
  ) INTO v_job_exists;

  -- Verifica quantos comentários ainda não foram processados
  SELECT COUNT(*) INTO v_comentarios_nao_processados
  FROM public."Comentarios_Principais"
  WHERE "project_id" = p_project_id
  AND "comentario_analizado" = true
  AND "mensagem" = false;

  RAISE NOTICE 'Projeto ID: %. Comentários pendentes: %', p_project_id, v_comentarios_nao_processados;

  -- Se não há mais comentários para processar, finaliza o job e atualiza o status
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

    -- Chama a nova função para agendar postagens (substituindo a antiga)
    PERFORM agendar_postagens_todos_projetos();

    RAISE NOTICE 'Todos os comentários processados. Status do projeto atualizado para 6.';
    RETURN;
  END IF;

  -- Processa o próximo lote de comentários
  RAISE NOTICE 'Processando próximo lote de comentários para projeto ID: %', p_project_id;

  -- Chama a função para processar as mensagens
  FOR v_result IN
    SELECT * FROM process_and_create_messages_engagement(p_project_id)
  LOOP
    v_processed_count := v_processed_count + 1;
    IF v_processed_count <= 5 THEN -- Limita o log para não ficar muito extenso
      RAISE NOTICE 'Mensagem processada: % para comentário %: %',
        v_result.message_id, v_result.cp_id, v_result.status;
    ELSIF v_processed_count = 6 THEN
      RAISE NOTICE '... e mais mensagens processadas';
    END IF;
  END LOOP;

  RAISE NOTICE 'Lote processado: % mensagens. Verificando se há mais comentários...', v_processed_count;

  -- Verifica novamente quantos comentários ainda não foram processados após este lote
  SELECT COUNT(*) INTO v_comentarios_nao_processados
  FROM public."Comentarios_Principais"
  WHERE "project_id" = p_project_id
  AND "comentario_analizado" = true
  AND "mensagem" = false;

  -- Se ainda há comentários, agenda o próximo lote
  IF v_comentarios_nao_processados > 0 THEN
    -- Se o job já existe, não precisamos reagendar
    IF NOT v_job_exists THEN
      PERFORM cron.schedule(
        v_job_name,
        '30 seconds', -- Intervalo entre execuções
        format('SELECT process_engagement_messages_batch(%s, %s)', p_project_id, batch_size)
      );
      RAISE NOTICE 'Job agendado para processar próximo lote em 30 segundos';
    ELSE
      RAISE NOTICE 'Job já existe - próximo lote será processado automaticamente';
    END IF;
  ELSE
    -- Não há mais comentários, finaliza o job e atualiza o status
    IF v_job_exists THEN
      PERFORM cron.unschedule(v_job_name);
    END IF;

    UPDATE public."Projeto"
    SET "status" = '6'
    WHERE "id" = p_project_id;

    -- Chama a nova função para agendar postagens (substituindo a antiga)
    PERFORM agendar_postagens_todos_projetos();

    RAISE NOTICE 'Todos os comentários processados após este lote. Status do projeto atualizado para 6.';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro durante o processamento em lote: %', SQLERRM;

  -- Em caso de erro, ainda mantém o job agendado para tentar novamente
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