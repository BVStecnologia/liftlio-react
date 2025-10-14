-- =============================================
-- Função: get_visitor_journey_map
-- Descrição: Mapeia jornada dos visitantes com análise geográfica e estágios
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.get_visitor_journey_map(p_project_id integer, p_time_window interval DEFAULT '00:30:00'::interval)
 RETURNS TABLE(location_country character varying, location_city text, journey_stage text, visitor_count bigint, last_activity timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH visitor_stages AS (
    -- Determinar o estágio atual de cada visitante único
    SELECT DISTINCT ON (a.visitor_id)
      a.visitor_id,
      a.country,
      COALESCE(a.custom_data->>'city', 'Unknown') as city,
      CASE
        WHEN a.event_type IN ('purchase', 'payment_success') THEN 'purchased'
        WHEN a.event_type IN ('checkout_start', 'checkout') THEN 'checkout'
        WHEN a.event_type IN ('add_to_cart', 'cart_view') THEN 'cart'
        WHEN a.event_type IN ('product_view', 'click') THEN 'browsing'
        ELSE 'visiting'
      END as stage,
      a.created_at
    FROM analytics a
    WHERE
      a.project_id = p_project_id
      AND a.created_at >= NOW() - p_time_window
    ORDER BY a.visitor_id, a.created_at DESC
  )
  SELECT
    vs.country::varchar as location_country,
    vs.city::text as location_city,
    vs.stage::text as journey_stage,
    COUNT(DISTINCT vs.visitor_id) as visitor_count,
    MAX(vs.created_at) as last_activity
  FROM visitor_stages vs
  GROUP BY vs.country, vs.city, vs.stage
  ORDER BY visitor_count DESC;
END;
$function$