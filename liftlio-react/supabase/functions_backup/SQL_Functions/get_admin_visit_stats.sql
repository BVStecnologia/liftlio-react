-- =============================================
-- Function: get_admin_visit_stats
-- Description: Retorna estatísticas de visitas para o admin dashboard
-- EXCLUI: páginas /admin + localhost (apenas visitantes reais)
-- Atualizado: 2026-01-08
-- =============================================

DROP FUNCTION IF EXISTS get_admin_visit_stats(text);

CREATE OR REPLACE FUNCTION public.get_admin_visit_stats(
  user_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE(visits_today bigint, visits_week bigint, visits_month bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_start TIMESTAMPTZ := DATE_TRUNC('day', NOW() AT TIME ZONE user_timezone) AT TIME ZONE user_timezone;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT visitor_id) FILTER (
      WHERE created_at >= today_start
    )::BIGINT as visits_today,
    COUNT(DISTINCT visitor_id) FILTER (
      WHERE created_at >= today_start - INTERVAL '6 days'
    )::BIGINT as visits_week,
    COUNT(DISTINCT visitor_id) FILTER (
      WHERE created_at >= today_start - INTERVAL '29 days'
    )::BIGINT as visits_month
  FROM admin_analytics
  WHERE event_type = 'pageview'
    AND (page_path IS NULL OR page_path NOT LIKE '/admin%')
    AND (referrer IS NULL OR referrer NOT ILIKE '%localhost%');
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_visit_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_visit_stats(text) TO service_role;
