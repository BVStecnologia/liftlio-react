-- =============================================
-- Função: get_journey_funnel_stats
-- Descrição: Retorna estatísticas do funil de conversão por visitante
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.get_journey_funnel_stats(p_project_id integer, p_time_window interval DEFAULT '00:30:00'::interval)
 RETURNS TABLE(total_visitors bigint, browsing_count bigint, cart_count bigint, checkout_count bigint, purchased_count bigint, conversion_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH visitor_stages AS (
    SELECT DISTINCT ON (visitor_id)
      visitor_id,
      CASE
        WHEN event_type IN ('purchase', 'payment_success') THEN 'purchased'
        WHEN event_type IN ('checkout_start', 'checkout') THEN 'checkout'
        WHEN event_type IN ('add_to_cart', 'cart_view') THEN 'cart'
        WHEN event_type IN ('product_view', 'click') THEN 'browsing'
        ELSE 'visiting'
      END as stage
    FROM analytics
    WHERE
      project_id = p_project_id
      AND created_at >= NOW() - p_time_window
    ORDER BY visitor_id, created_at DESC
  )
  SELECT
    COUNT(DISTINCT visitor_id) as total_visitors,
    COUNT(DISTINCT CASE WHEN stage IN ('browsing', 'visiting') THEN visitor_id END) as browsing_count,
    COUNT(DISTINCT CASE WHEN stage = 'cart' THEN visitor_id END) as cart_count,
    COUNT(DISTINCT CASE WHEN stage = 'checkout' THEN visitor_id END) as checkout_count,
    COUNT(DISTINCT CASE WHEN stage = 'purchased' THEN visitor_id END) as purchased_count,
    CASE
      WHEN COUNT(DISTINCT visitor_id) > 0
      THEN ROUND(COUNT(DISTINCT CASE WHEN stage = 'purchased' THEN visitor_id END)::numeric / COUNT(DISTINCT visitor_id) * 100, 2)
      ELSE 0
    END as conversion_rate
  FROM visitor_stages;
END;
$function$