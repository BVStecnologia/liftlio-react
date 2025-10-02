-- =============================================
-- Função: get_top_cities_by_visits
-- Descrição: Retorna top cidades por número de visitas
-- Criado: 2025-10-01
-- Usado por: Analytics.tsx (TopCities component)
-- =============================================

DROP FUNCTION IF EXISTS public.get_top_cities_by_visits(bigint, integer);

CREATE OR REPLACE FUNCTION public.get_top_cities_by_visits(
    p_project_id bigint,
    p_limit integer DEFAULT 10
)
RETURNS TABLE(
    city text,
    country text,
    visit_count bigint,
    unique_visitors bigint,
    percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH city_stats AS (
        SELECT
            COALESCE(a.custom_data->>'city', 'Unknown') as city_name,
            COALESCE(a.country, 'Unknown') as country_name,
            COUNT(*) as visits,
            COUNT(DISTINCT a.visitor_id) as unique_vis
        FROM analytics a
        WHERE a.project_id = p_project_id
          AND a.custom_data IS NOT NULL
          AND a.custom_data->>'city' IS NOT NULL
        GROUP BY city_name, country_name
    ),
    total_visits AS (
        SELECT SUM(visits) as total
        FROM city_stats
    )
    SELECT
        cs.city_name::text,
        cs.country_name::text,
        cs.visits::bigint,
        cs.unique_vis::bigint,
        ROUND((cs.visits::numeric / NULLIF(tv.total, 0) * 100), 2)::numeric as pct
    FROM city_stats cs
    CROSS JOIN total_visits tv
    ORDER BY cs.visits DESC
    LIMIT p_limit;
END;
$$;
