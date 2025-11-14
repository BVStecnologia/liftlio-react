-- =============================================
-- Função: process_videos_batch
-- Descrição: Processa vídeos em batch para buscar comentários
-- Dependência de: start_video_processing
-- Criado: 2025-01-27
-- Atualizado: 2025-01-30 - Corrigido bug de loop STATUS 2 ↔ 3
-- =============================================

CREATE OR REPLACE FUNCTION public.process_videos_batch(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    pending_count INTEGER;
    job_exists BOOLEAN;
BEGIN
  -- Conta vídeos pendentes antes do processamento
  SELECT COUNT(*)
  INTO pending_count
  FROM "Videos" v
  JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
  WHERE s."Projeto_id" = project_id
    AND v.comentarios_atualizados = false
    AND v.comentarios_desativados = false;

  -- Processa os vídeos pendentes
  PERFORM process_pending_videos(project_id, batch_size);

  -- Verifica se ainda há vídeos pendentes
  IF EXISTS (
    SELECT 1
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id
      AND v.comentarios_atualizados = false
      AND v.comentarios_desativados = false
  ) THEN
    -- Verifica se o job já existe antes de criar
    SELECT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'process_videos_' || project_id::text
    ) INTO job_exists;

    -- Remove o job existente para recriar com novos parâmetros
    IF job_exists THEN
      PERFORM cron.unschedule('process_videos_' || project_id::text);
    END IF;

    -- Agenda a próxima execução
    PERFORM cron.schedule(
      'process_videos_' || project_id::text,
      '5 seconds',
      format('SELECT process_videos_batch(%s, %s)', project_id, batch_size)
    );
  ELSE
    -- Verifica se o job existe antes de tentar removê-lo
    SELECT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'process_videos_' || project_id::text
    ) INTO job_exists;

    -- Remove o job agendado apenas se ele existir
    IF job_exists THEN
      PERFORM cron.unschedule('process_videos_' || project_id::text);
    END IF;

    -- ✅ CORREÇÃO (2025-01-30): Mantém status em '3'
    -- BUG CORRIGIDO: Linha 58 estava revertendo para status='2', causando loop infinito
    -- O status já foi corretamente definido para '3' pela função start_video_processing()
    -- Não alteramos o status aqui para permitir que o pipeline avance para análise de vídeos

    -- CÓDIGO REMOVIDO (causava o bug):
    -- UPDATE public."Projeto"
    -- SET status = '2'
    -- WHERE id = project_id;

  END IF;
END;
$function$