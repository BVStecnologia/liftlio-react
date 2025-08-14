-- ========================================
-- SISTEMA DE AGREGAÇÃO DE JORNADA DO VISITANTE
-- Criado: 14/08/2025
-- Objetivo: Agregar visitantes por localização e estágio da jornada
-- ========================================

-- 1. FUNÇÃO PRINCIPAL: Agregação por Localização e Estágio
-- Retorna quantos visitantes estão em cada estágio da jornada por cidade
DROP FUNCTION IF EXISTS get_visitor_journey_map(integer, interval);

CREATE OR REPLACE FUNCTION get_visitor_journey_map(
  p_project_id integer,
  p_time_window interval DEFAULT '30 minutes'
)
RETURNS TABLE (
  location_country varchar,
  location_city text,
  journey_stage text,
  visitor_count bigint,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
AS $$
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
$$;

-- 2. ESTATÍSTICAS DO FUNIL DE CONVERSÃO
-- Retorna métricas gerais do funil de conversão
DROP FUNCTION IF EXISTS get_journey_funnel_stats(integer, interval);

CREATE OR REPLACE FUNCTION get_journey_funnel_stats(
  p_project_id integer,
  p_time_window interval DEFAULT '30 minutes'
)
RETURNS TABLE (
  total_visitors bigint,
  browsing_count bigint,
  cart_count bigint,
  checkout_count bigint,
  purchased_count bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
AS $$
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
$$;

-- 3. EVENTOS EM TEMPO REAL POR ESTÁGIO
-- Retorna os eventos mais recentes organizados por estágio da jornada
DROP FUNCTION IF EXISTS get_realtime_journey_events(integer, interval);

CREATE OR REPLACE FUNCTION get_realtime_journey_events(
  p_project_id integer,
  p_time_window interval DEFAULT '5 minutes'
)
RETURNS TABLE (
  visitor_id text,
  country varchar,
  city text,
  stage text,
  page_url text,
  created_at timestamp with time zone,
  time_ago text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.visitor_id::text,
    a.country::varchar,
    COALESCE(a.custom_data->>'city', 'Unknown')::text as city,
    CASE 
      WHEN a.event_type IN ('purchase', 'payment_success') THEN 'purchased'
      WHEN a.event_type IN ('checkout_start', 'checkout') THEN 'checkout'
      WHEN a.event_type IN ('add_to_cart', 'cart_view') THEN 'cart'
      WHEN a.event_type IN ('product_view', 'click') THEN 'browsing'
      ELSE 'visiting'
    END::text as stage,
    a.url::text as page_url,
    a.created_at,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - a.created_at)) < 60 THEN 'Just now'
      WHEN EXTRACT(EPOCH FROM (NOW() - a.created_at)) < 3600 THEN 
        CONCAT(FLOOR(EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 60)::text, 'm ago')
      ELSE 
        CONCAT(FLOOR(EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 3600)::text, 'h ago')
    END::text as time_ago
  FROM analytics a
  WHERE 
    a.project_id = p_project_id
    AND a.created_at >= NOW() - p_time_window
  ORDER BY a.created_at DESC
  LIMIT 20;
END;
$$;

-- ========================================
-- EXEMPLOS DE USO
-- ========================================

-- 1. Obter mapa de visitantes por localização e estágio (últimos 30 minutos)
-- SELECT * FROM get_visitor_journey_map(58, '30 minutes'::interval);

-- 2. Obter estatísticas do funil de conversão (última hora)
-- SELECT * FROM get_journey_funnel_stats(58, '1 hour'::interval);

-- 3. Obter eventos recentes em tempo real (últimos 5 minutos)
-- SELECT * FROM get_realtime_journey_events(58, '5 minutes'::interval);

-- ========================================
-- BENEFÍCIOS
-- ========================================
-- 1. Agregação no banco de dados (mais eficiente)
-- 2. Escala para milhares de visitantes
-- 3. Mostra jornada completa do cliente
-- 4. Reduz transferência de dados
-- 5. Permite visualização tipo Shopify Live View