-- =============================================
-- Função: process_engagement_messages_batch
-- Tipo: Batch Processor (processador em lotes)
--
-- Descrição:
--   Processa mensagens de engagement em lotes.
--   Gerencia jobs do cron e faz chamadas recursivas se necessário.
--
-- Entrada:
--   p_project_id INTEGER - ID do projeto
--   batch_size INTEGER - Tamanho do lote (default: 10)
--
-- Saída:
--   TEXT - Status do processamento (LOCKED, SUCCESS, COMPLETED, ERROR)
--
-- Conexões:
--   → Chamada por: 04_start_engagement_messages_processing (linha 37)
--   → Chama: 02_process_and_create_messages_engagement (linha 53)
--   → Pode chamar a si mesmo recursivamente via cron.schedule
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Documentação completa e organização
-- Atualizado: 2025-10-17 - Adicionado sistema de lock para evitar race conditions entre cron jobs
--                          Lock com timeout de 5 minutos (auto-recovery) + liberação manual
-- Atualizado: 2025-10-18 - Otimização: substituído agendar_postagens_todos_projetos() por
--                          agendar_postagens_diarias(p_project_id) para agendar apenas o projeto específico
-- Atualizado: 2025-10-25 - PROTEÇÃO CONTRA LOOP INFINITO: Detecta zero sucessos e para job
--                          Se processar comentários mas ZERO message_id válidos = para tudo
--                          Evita gastar créditos em loop infinito quando Claude offline/erro
-- =============================================

DROP FUNCTION IF EXISTS process_engagement_messages_batch(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.process_engagement_messages_batch(p_project_id integer, batch_size integer DEFAULT 10)
 RETURNS TEXT
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_locked_project_id INTEGER;
  v_comentarios_nao_processados INTEGER;
  v_job_exists BOOLEAN;
  v_result RECORD;
  v_processed_count INTEGER := 0;
  v_success_count INTEGER := 0;  -- Conta sucessos reais (message_id NOT NULL)
  v_job_name TEXT := 'process_engagement_messages_' || p_project_id::text;
BEGIN
  -- ========================================
  -- SISTEMA DE LOCK: Evita race conditions
  -- ========================================
  -- Tenta pegar lock para processar este projeto
  -- Lock expira em 5 minutos automaticamente (auto-recovery se processo morrer)
  UPDATE public."Projeto"
  SET processing_locked_until = NOW() + INTERVAL '5 minutes'
  WHERE id = p_project_id
  AND (processing_locked_until IS NULL OR processing_locked_until < NOW())
  RETURNING id INTO v_locked_project_id;

  -- Se não conseguiu lock, significa que outro processo já está processando
  IF v_locked_project_id IS NULL THEN
    RAISE NOTICE 'Project % already locked by another process, skipping batch', p_project_id;
    RETURN 'LOCKED';
  END IF;

  RAISE NOTICE 'Project % lock acquired, starting engagement batch processing', p_project_id;

  -- ========================================
  -- PROCESSAMENTO DO BATCH
  -- ========================================

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

    -- Atualiza o status do projeto para 6 e libera lock
    UPDATE public."Projeto"
    SET "status" = '6',
        processing_locked_until = NULL
    WHERE "id" = p_project_id;

    -- Agenda postagens diárias especificamente para este projeto
    PERFORM agendar_postagens_diarias(p_project_id);

    RAISE NOTICE 'Todos os comentários processados. Status do projeto atualizado para 6.';
    RETURN 'COMPLETED: All comments processed, advancing to STATUS 6';
  END IF;

  -- Processa o próximo lote de comentários
  RAISE NOTICE 'Processando próximo lote de comentários para projeto ID: %', p_project_id;

  -- Chama a função para processar as mensagens
  FOR v_result IN
    SELECT * FROM process_and_create_messages_engagement(p_project_id)
  LOOP
    v_processed_count := v_processed_count + 1;

    -- Conta sucessos reais (proteção contra loop infinito)
    IF v_result.message_id IS NOT NULL THEN
      v_success_count := v_success_count + 1;
    END IF;

    IF v_processed_count <= 5 THEN -- Limita o log para não ficar muito extenso
      RAISE NOTICE 'Mensagem processada: % para comentário %: %',
        v_result.message_id, v_result.cp_id, v_result.status;
    ELSIF v_processed_count = 6 THEN
      RAISE NOTICE '... e mais mensagens processadas';
    END IF;
  END LOOP;

  RAISE NOTICE 'Lote processado: % mensagens. Verificando se há mais comentários...', v_processed_count;

  -- ========================================
  -- PROTEÇÃO CONTRA LOOP INFINITO
  -- ========================================
  -- Se processou comentários mas ZERO sucessos = problema sistêmico (Claude offline/erro)
  IF v_processed_count > 0 AND v_success_count = 0 THEN
    RAISE WARNING 'ZERO sucessos no lote (% tentativas). Parando para evitar loop infinito.', v_processed_count;

    -- Libera lock
    UPDATE public."Projeto"
    SET processing_locked_until = NULL
    WHERE id = p_project_id;

    -- Remove job se existir
    IF v_job_exists THEN
      PERFORM cron.unschedule(v_job_name);
      RAISE NOTICE 'Job removido devido a zero sucessos';
    END IF;

    RETURN 'ERROR: Zero sucessos - possível Claude offline ou erro sistemático';
  END IF;

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
        '10 seconds', -- Intervalo entre execuções (otimizado para verificação rápida com lock)
        format('SELECT process_engagement_messages_batch(%s, %s)', p_project_id, batch_size)
      );
      RAISE NOTICE 'Job agendado para processar próximo lote em 10 segundos';
    ELSE
      RAISE NOTICE 'Job já existe - próximo lote será processado automaticamente';
    END IF;

    -- Liberar lock após agendar próximo batch
    UPDATE public."Projeto"
    SET processing_locked_until = NULL
    WHERE id = p_project_id;

    RETURN 'SUCCESS: Batch processed (' || v_processed_count::TEXT || ' messages), ' || v_comentarios_nao_processados::TEXT || ' remaining';
  ELSE
    -- Não há mais comentários, finaliza o job e atualiza o status
    IF v_job_exists THEN
      PERFORM cron.unschedule(v_job_name);
    END IF;

    -- Atualiza status para 6 e libera lock
    UPDATE public."Projeto"
    SET "status" = '6',
        processing_locked_until = NULL
    WHERE "id" = p_project_id;

    -- Agenda postagens diárias especificamente para este projeto
    PERFORM agendar_postagens_diarias(p_project_id);

    RAISE NOTICE 'Todos os comentários processados após este lote. Status do projeto atualizado para 6.';
    RETURN 'COMPLETED: All comments processed after this batch, advancing to STATUS 6';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- ========================================
    -- EXCEPTION HANDLER: Sempre libera lock
    -- ========================================
    RAISE WARNING 'Erro durante o processamento em lote para projeto %: %', p_project_id, SQLERRM;

    -- Garantir que lock seja liberado mesmo em caso de erro
    UPDATE public."Projeto"
    SET processing_locked_until = NULL
    WHERE id = p_project_id;

    -- Em caso de erro, ainda mantém o job agendado para tentar novamente
    IF NOT v_job_exists THEN
      PERFORM cron.schedule(
        v_job_name,
        '30 seconds', -- Intervalo maior em caso de erro (30 segundos)
        format('SELECT process_engagement_messages_batch(%s, %s)', p_project_id, batch_size)
      );
      RAISE NOTICE 'Ocorreu um erro, reagendando para tentar novamente em 30 segundos';
    END IF;

    -- Re-raise a exceção para não esconder o erro
    RAISE;
END;
$function$;
