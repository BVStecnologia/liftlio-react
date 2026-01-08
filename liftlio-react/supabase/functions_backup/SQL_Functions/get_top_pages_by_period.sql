-- =============================================
-- Function: get_top_pages_by_period
-- Description: Retorna páginas mais visitadas por período
-- EXCLUI: páginas /admin + localhost (apenas visitantes reais)
-- Params: period_days (1=hoje, 7=semana, 30=mês), user_timezone, max_results
-- Atualizado: 2026-01-08
-- =============================================

DROP FUNCTION IF EXISTS get_top_pages_by_period(integer, text, integer);

CREATE OR REPLACE FUNCTION public.get_top_pages_by_period(
  period_days INTEGER DEFAULT 1,
  user_timezone TEXT DEFAULT 'UTC',
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  page_path TEXT,
  page_title TEXT,
  visitor_count BIGINT,
  view_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_start TIMESTAMPTZ;
BEGIN
  period_start := DATE_TRUNC('day', NOW() AT TIME ZONE user_timezone)
                  - (INTERVAL '1 day' * (period_days - 1));
  period_start := period_start AT TIME ZONE user_timezone;

  RETURN QUERY
  SELECT
    COALESCE(aa.page_path, '/')::TEXT as page_path,
    MAX(aa.page_title)::TEXT as page_title,
    COUNT(DISTINCT aa.visitor_id) as visitor_count,
    COUNT(*) as view_count
  FROM admin_analytics aa
  WHERE aa.event_type = 'pageview'
    AND aa.created_at >= period_start
    AND aa.page_path IS NOT NULL
    AND aa.page_path != ''
    AND aa.page_path NOT LIKE '/admin%'
    AND (aa.referrer IS NULL OR aa.referrer NOT ILIKE '%localhost%')
  GROUP BY aa.page_path
  ORDER BY visitor_count DESC, view_count DESC
  LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_pages_by_period(integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages_by_period(integer, text, integer) TO service_role;
