-- =============================================
-- Function: check_and_dispatch_browser_tasks
-- Description: Verifica se há tasks pendentes antes de chamar Edge Function
--              Economiza chamadas Edge quando não há trabalho
-- Created: 2026-01-02
-- Cron: browser-dispatch-smart (cada 1 minuto)
-- =============================================

DROP FUNCTION IF EXISTS check_and_dispatch_browser_tasks();

CREATE OR REPLACE FUNCTION public.check_and_dispatch_browser_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pending_count INT;
  v_request_id BIGINT;
BEGIN
  -- Verificar se há tasks pendentes (custo ~0)
  SELECT COUNT(*) INTO v_pending_count
  FROM browser_tasks
  WHERE status = 'pending'
    AND (scheduled_for IS NULL OR scheduled_for <= NOW());

  -- Se não há tasks, retornar sem chamar Edge
  IF v_pending_count = 0 THEN
    RETURN jsonb_build_object(
      'called_edge', false,
      'reason', 'no_pending_tasks',
      'pending_count', 0,
      'checked_at', NOW()
    );
  END IF;

  -- Há tasks! Chamar Edge Function via pg_net
  SELECT net.http_post(
    url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RETURN jsonb_build_object(
    'called_edge', true,
    'pending_count', v_pending_count,
    'request_id', v_request_id,
    'checked_at', NOW()
  );
END;
$$;

-- Dar permissão
GRANT EXECUTE ON FUNCTION check_and_dispatch_browser_tasks() TO service_role;

-- =============================================
-- Cron Job: browser-dispatch-smart
-- =============================================
-- SELECT cron.schedule(
--   'browser-dispatch-smart',
--   '* * * * *',
--   $$SELECT check_and_dispatch_browser_tasks();$$
-- );
