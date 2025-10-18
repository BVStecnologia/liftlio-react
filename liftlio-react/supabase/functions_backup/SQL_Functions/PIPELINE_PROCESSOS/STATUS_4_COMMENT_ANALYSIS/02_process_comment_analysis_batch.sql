-- =============================================
-- Função: process_comment_analysis_batch
-- Descrição: Processa lote de análise de comentários e gerencia job agendado
-- Criado: 2024-01-24
-- Atualizado: 2025-10-16 - Adicionada proteção anti-loop para evitar chamadas infinitas de Claude API
--                          quando atualizar_comentarios_analisados falha ou retorna 0 atualizados
-- Atualizado: 2025-10-17 - Adicionado sistema de lock para evitar race conditions entre cron jobs
--                          Lock com timeout de 5 minutos (auto-recovery) + liberação manual
-- =============================================

DROP FUNCTION IF EXISTS process_comment_analysis_batch(integer, integer);

CREATE OR REPLACE FUNCTION public.process_comment_analysis_batch(project_id integer, batch_size integer)
 RETURNS TEXT
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_locked_project_id INTEGER;
  v_comentarios_nao_analisados INTEGER;
  v_resultado TEXT;
  v_job_exists BOOLEAN;
  v_num_atualizados INTEGER;
BEGIN
  -- ========================================
  -- SISTEMA DE LOCK: Evita race conditions
  -- ========================================
  -- Tenta pegar lock para processar este projeto
  -- Lock expira em 5 minutos automaticamente (auto-recovery se processo morrer)
  UPDATE public."Projeto"
  SET processing_locked_until = NOW() + INTERVAL '5 minutes'
  WHERE id = project_id
  AND (processing_locked_until IS NULL OR processing_locked_until < NOW())
  RETURNING id INTO v_locked_project_id;

  -- Se não conseguiu lock, significa que outro processo já está processando
  IF v_locked_project_id IS NULL THEN
    RAISE NOTICE 'Project % already locked by another process, skipping batch', project_id;
    RETURN 'LOCKED';
  END IF;

  RAISE NOTICE 'Project % lock acquired, starting batch processing', project_id;

  -- ========================================
  -- PROCESSAMENTO DO BATCH
  -- ========================================

  -- Verifica quantos comentários ainda não foram analisados
  SELECT comentarios_nao_analisados INTO v_comentarios_nao_analisados
  FROM contar_comentarios_analisados(project_id);

  IF v_comentarios_nao_analisados > 0 THEN
    -- Chama a função para analisar o próximo lote de comentários
    SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;

    RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

    -- PROTEÇÃO ANTI-LOOP: Verificar se houve sucesso real
    IF v_resultado LIKE '%Erro%' OR
       v_resultado LIKE '%retornou um resultado nulo%' OR
       v_resultado LIKE '%não é um array JSON válido%' OR
       v_resultado IS NULL THEN

        -- Log do erro
        RAISE WARNING 'Análise de comentários FALHOU para projeto %: %', project_id, v_resultado;

        -- Remover job agendado se existir
        SELECT EXISTS (
          SELECT 1 FROM cron.job
          WHERE jobname = 'process_comment_analysis_' || project_id::text
        ) INTO v_job_exists;

        IF v_job_exists THEN
          PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
        END IF;

        -- Marcar projeto com erro voltando para STATUS 4
        UPDATE public."Projeto"
        SET status = '4', -- Manter em 4 para retry manual
            processing_locked_until = NULL -- Liberar lock
        WHERE id = project_id;

        -- IMPORTANTE: Sair SEM reagendar para evitar loop infinito de Claude API
        RETURN 'ERROR: ' || v_resultado;
    END IF;

    -- Verificar se realmente atualizou algo (evita loop com "Atualizados: 0")
    IF v_resultado LIKE 'Processados:%Atualizados:%' THEN
        -- Extrair número de atualizados usando regex
        v_num_atualizados := COALESCE(
            substring(v_resultado from 'Atualizados: (\d+)')::INTEGER,
            0
        );

        IF v_num_atualizados = 0 THEN
            RAISE WARNING 'Nenhum comentário foi atualizado para projeto %, possível problema de IDs ou todos já processados', project_id;

            -- Remover job se existir
            SELECT EXISTS (
              SELECT 1 FROM cron.job
              WHERE jobname = 'process_comment_analysis_' || project_id::text
            ) INTO v_job_exists;

            IF v_job_exists THEN
              PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
            END IF;

            -- Liberar lock antes de sair
            UPDATE public."Projeto"
            SET processing_locked_until = NULL
            WHERE id = project_id;

            -- Também parar neste caso para evitar loop
            RETURN 'NO_UPDATE: 0 comments updated';
        END IF;
    END IF;

    -- Só agenda próxima execução se tudo ocorreu bem
    PERFORM cron.schedule(
      'process_comment_analysis_' || project_id::text,
      '10 seconds',
      format('SELECT process_comment_analysis_batch(%s, %s)', project_id, batch_size)
    );

    -- Liberar lock após processamento bem-sucedido
    UPDATE public."Projeto"
    SET processing_locked_until = NULL
    WHERE id = project_id;

    RETURN 'SUCCESS: Batch processed, ' || v_comentarios_nao_analisados::TEXT || ' remaining';

  ELSE
    -- Verifica se o job existe antes de tentar removê-lo
    SELECT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'process_comment_analysis_' || project_id::text
    ) INTO v_job_exists;

    -- Remove o job agendado apenas se ele existir
    IF v_job_exists THEN
      PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
    END IF;

    -- Atualiza o status do projeto para 5 quando todos os comentários foram processados
    UPDATE public."Projeto"
    SET status = '5',
        processing_locked_until = NULL -- Liberar lock
    WHERE id = project_id;

    RAISE NOTICE 'All comments processed for project ID: %', project_id;
    RETURN 'COMPLETED: All comments processed, advancing to STATUS 5';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- ========================================
    -- EXCEPTION HANDLER: Sempre libera lock
    -- ========================================
    RAISE WARNING 'Exception in process_comment_analysis_batch for project %: %', project_id, SQLERRM;

    -- Garantir que lock seja liberado mesmo em caso de erro
    UPDATE public."Projeto"
    SET processing_locked_until = NULL
    WHERE id = project_id;

    -- Re-raise a exceção para não esconder o erro
    RAISE;
END;
$function$;
