-- =============================================
-- Fun��o: process_comment_analysis_batch
-- Descri��o: Processa lote de an�lise de coment�rios e gerencia job agendado
-- Criado: 2024-01-24
-- Atualizado: 2025-10-16 - Adicionada prote��o anti-loop para evitar chamadas infinitas de Claude API
--                          quando atualizar_comentarios_analisados falha ou retorna 0 atualizados
-- =============================================

DROP FUNCTION IF EXISTS process_comment_analysis_batch(integer, integer);

CREATE OR REPLACE FUNCTION public.process_comment_analysis_batch(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_comentarios_nao_analisados INTEGER;
  v_resultado TEXT;
  v_job_exists BOOLEAN;
  v_num_atualizados INTEGER;
BEGIN
  -- Verifica quantos coment�rios ainda n�o foram analisados
  SELECT comentarios_nao_analisados INTO v_comentarios_nao_analisados
  FROM contar_comentarios_analisados(project_id);

  IF v_comentarios_nao_analisados > 0 THEN
    -- Chama a fun��o para analisar o pr�ximo lote de coment�rios
    SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;

    RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

    -- PROTEÇÃO ANTI-LOOP: Verificar se houve sucesso real
    IF v_resultado LIKE '%Erro%' OR
       v_resultado LIKE '%retornou um resultado nulo%' OR
       v_resultado LIKE '%n�o � um array JSON v�lido%' OR
       v_resultado IS NULL THEN

        -- Log do erro
        RAISE WARNING 'An�lise de coment�rios FALHOU para projeto %: %', project_id, v_resultado;

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
        SET status = '4' -- Manter em 4 para retry manual
        WHERE id = project_id;

        -- IMPORTANTE: Sair SEM reagendar para evitar loop infinito de Claude API
        RETURN;
    END IF;

    -- Verificar se realmente atualizou algo (evita loop com "Atualizados: 0")
    IF v_resultado LIKE 'Processados:%Atualizados:%' THEN
        -- Extrair n�mero de atualizados usando regex
        v_num_atualizados := COALESCE(
            substring(v_resultado from 'Atualizados: (\d+)')::INTEGER,
            0
        );

        IF v_num_atualizados = 0 THEN
            RAISE WARNING 'Nenhum coment�rio foi atualizado para projeto %, poss�vel problema de IDs ou todos j� processados', project_id;

            -- Remover job se existir
            SELECT EXISTS (
              SELECT 1 FROM cron.job
              WHERE jobname = 'process_comment_analysis_' || project_id::text
            ) INTO v_job_exists;

            IF v_job_exists THEN
              PERFORM cron.unschedule('process_comment_analysis_' || project_id::text);
            END IF;

            -- Tamb�m parar neste caso para evitar loop
            RETURN;
        END IF;
    END IF;

    -- S� agenda pr�xima execu��o se tudo ocorreu bem
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