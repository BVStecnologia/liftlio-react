-- =============================================
-- Function: get_admin_location_stats_v2
-- Description: Retorna top países e cidades por período
-- EXCLUI: páginas /admin + localhost (apenas visitantes reais)
-- Params: period_days (1=hoje, 7=semana, 30=mês), user_timezone
-- Atualizado: 2026-01-08
-- =============================================

DROP FUNCTION IF EXISTS get_admin_location_stats();
DROP FUNCTION IF EXISTS get_admin_location_stats_v2(integer, text);

CREATE OR REPLACE FUNCTION public.get_admin_location_stats_v2(
  period_days INTEGER DEFAULT 1,
  user_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE(top_countries JSONB, top_cities JSONB)
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
  WITH visitor_country AS (
    SELECT DISTINCT ON (aa.visitor_id)
      aa.visitor_id,
      COALESCE(aa.country, 'Unknown') as country
    FROM admin_analytics aa
    WHERE aa.event_type = 'pageview'
      AND aa.created_at >= period_start
      AND (aa.page_path IS NULL OR aa.page_path NOT LIKE '/admin%')
      AND (aa.referrer IS NULL OR aa.referrer NOT ILIKE '%localhost%')
    GROUP BY aa.visitor_id, aa.country
    ORDER BY aa.visitor_id, COUNT(*) DESC
  ),
  visitor_city AS (
    SELECT DISTINCT ON (aa.visitor_id)
      aa.visitor_id,
      aa.custom_data->>'city' as city,
      COALESCE(aa.country, 'Unknown') as country
    FROM admin_analytics aa
    WHERE aa.event_type = 'pageview'
      AND aa.created_at >= period_start
      AND aa.custom_data->>'city' IS NOT NULL
      AND aa.custom_data->>'city' != 'Unknown'
      AND aa.custom_data->>'city' != ''
      AND (aa.page_path IS NULL OR aa.page_path NOT LIKE '/admin%')
      AND (aa.referrer IS NULL OR aa.referrer NOT ILIKE '%localhost%')
    GROUP BY aa.visitor_id, aa.custom_data->>'city', aa.country
    ORDER BY aa.visitor_id, COUNT(*) DESC
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
     FROM (
       SELECT vc.country, COUNT(*) as visits
       FROM visitor_country vc
       GROUP BY vc.country
       ORDER BY visits DESC
       LIMIT 10
     ) c
    ) as top_countries,
    (SELECT COALESCE(jsonb_agg(row_to_json(ci)), '[]'::jsonb)
     FROM (
       SELECT vci.city, vci.country, COUNT(*) as visits
       FROM visitor_city vci
       GROUP BY vci.city, vci.country
       ORDER BY visits DESC
       LIMIT 10
     ) ci
    ) as top_cities;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_location_stats_v2(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_location_stats_v2(integer, text) TO service_role;
