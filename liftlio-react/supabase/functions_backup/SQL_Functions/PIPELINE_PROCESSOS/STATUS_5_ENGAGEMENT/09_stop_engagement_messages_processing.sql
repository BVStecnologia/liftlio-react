-- =============================================
-- Função: stop_engagement_messages_processing
-- Tipo: Control (gerenciamento de jobs)
--
-- Descrição:
--   Interrompe o processamento automático de engagement de um projeto.
--   Remove o job do pg_cron.
--
-- Entrada:
--   p_project_id INTEGER - ID do projeto
--
-- Saída:
--   TEXT - Mensagem de status
--
-- Conexões:
--   → Contraparte de: start_engagement_messages_processing
--   → Remove job via: cron.unschedule()
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

DROP FUNCTION IF EXISTS stop_engagement_messages_processing(INTEGER);

CREATE OR REPLACE FUNCTION public.stop_engagement_messages_processing(p_project_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_job_name TEXT := 'process_engagement_messages_' || p_project_id::text;
  v_job_exists BOOLEAN;
BEGIN
  -- Verifica se existe um job para este projeto
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job_name
  ) INTO v_job_exists;

  IF v_job_exists THEN
    PERFORM cron.unschedule(v_job_name);
    RETURN 'Processamento interrompido para o projeto ID: ' || p_project_id;
  ELSE
    RETURN 'Não há processamento em andamento para o projeto ID: ' || p_project_id;
  END IF;
END;
$function$
