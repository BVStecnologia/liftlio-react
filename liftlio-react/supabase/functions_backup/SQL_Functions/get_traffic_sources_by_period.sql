-- =============================================
-- Function: get_traffic_sources_by_period
-- Description: Retorna fontes de tráfego agregadas por período
-- EXCLUI: páginas /admin + localhost (apenas visitantes reais)
-- Params: period_days (1=hoje, 7=semana, 30=mês), user_timezone
-- Atualizado: 2026-01-08
-- =============================================

DROP FUNCTION IF EXISTS get_traffic_sources_by_period(integer, text);

CREATE OR REPLACE FUNCTION public.get_traffic_sources_by_period(
  period_days INTEGER DEFAULT 1,
  user_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE(
  source TEXT,
  visitor_count BIGINT,
  percentage NUMERIC
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
  WITH source_data AS (
    SELECT
      COALESCE(
        custom_data->>'traffic_source',
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer ILIKE '%google%' THEN 'Google'
          WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%fb.%' THEN 'Facebook'
          WHEN referrer ILIKE '%twitter%' OR referrer ILIKE '%t.co%' THEN 'Twitter/X'
          WHEN referrer ILIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer ILIKE '%youtube%' THEN 'YouTube'
          WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
          WHEN referrer ILIKE '%bing%' THEN 'Bing'
          WHEN referrer ILIKE '%liftlio%' THEN 'Liftlio Internal'
          WHEN referrer ILIKE '%claude%' THEN 'Claude AI'
          ELSE 'Other'
        END
      ) as traffic_source,
      aa.visitor_id
    FROM admin_analytics aa
    WHERE aa.event_type = 'pageview'
      AND aa.created_at >= period_start
      AND (aa.page_path IS NULL OR aa.page_path NOT LIKE '/admin%')
      AND (aa.referrer IS NULL OR aa.referrer NOT ILIKE '%localhost%')
  ),
  aggregated AS (
    SELECT
      sd.traffic_source,
      COUNT(DISTINCT sd.visitor_id) as visitors
    FROM source_data sd
    GROUP BY sd.traffic_source
  ),
  total AS (
    SELECT COALESCE(SUM(visitors), 0) as total_visitors FROM aggregated
  )
  SELECT
    aggregated.traffic_source::TEXT as source,
    aggregated.visitors as visitor_count,
    ROUND((aggregated.visitors::NUMERIC / NULLIF(total.total_visitors, 0)) * 100, 1) as percentage
  FROM aggregated, total
  ORDER BY aggregated.visitors DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION get_traffic_sources_by_period(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_sources_by_period(integer, text) TO service_role;
