-- =============================================
-- Função: get_analytics_with_demo_fallback
-- Descrição: Retorna dados de analytics reais ou demo se não houver dados
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_analytics_with_demo_fallback(integer, timestamp without time zone);

CREATE OR REPLACE FUNCTION public.get_analytics_with_demo_fallback(p_project_id integer, p_start_date timestamp without time zone)
 RETURNS SETOF analytics
 LANGUAGE sql
 STABLE
AS $function$
  WITH real_data AS (
    SELECT * FROM analytics
    WHERE project_id = p_project_id::BIGINT
      AND created_at >= p_start_date
  ),
  demo_data AS (
    SELECT
      (n * 100 + s)::BIGINT AS id,
      p_project_id::BIGINT AS project_id,
      'visitor_' || n || '_' || s AS visitor_id,
      'session_' || n || '_' || s AS session_id,
      'pageview' AS event_type,
      'https://liftlio.com/' AS url,
      CASE
        -- 85% Liftlio Organic (dominante)
        WHEN s <= 85 THEN
          CASE (s % 4)
            WHEN 0 THEN 'https://google.com/search?q=liftlio'
            WHEN 1 THEN 'https://liftlio.com'
            WHEN 2 THEN 'https://bing.com/search?q=liftlio+video'
            ELSE 'https://google.com/search?q=liftlio+analytics'
          END
        -- 5% Paid Ads
        WHEN s <= 90 THEN 'https://google.com'
        -- 7% Social Media
        WHEN s <= 97 THEN
          CASE (s % 4)
            WHEN 0 THEN 'https://facebook.com'
            WHEN 1 THEN 'https://instagram.com'
            WHEN 2 THEN 'https://linkedin.com'
            ELSE 'https://twitter.com'
          END
        -- 3% Direct
        ELSE ''
      END AS referrer,
      CASE
        WHEN s <= 85 THEN 'liftlio'
        WHEN s <= 90 THEN 'google'
        WHEN s <= 97 THEN
          CASE (s % 4)
            WHEN 0 THEN 'facebook'
            WHEN 1 THEN 'instagram'
            WHEN 2 THEN 'linkedin'
            ELSE 'twitter'
          END
        ELSE NULL
      END AS utm_source,
      CASE
        WHEN s <= 85 THEN 'organic'
        WHEN s <= 90 THEN 'cpc'
        WHEN s <= 97 THEN 'social'
        ELSE 'direct'
      END AS utm_medium,
      NULL AS utm_campaign,
      CASE (s % 3)
        WHEN 0 THEN 'Desktop'
        WHEN 1 THEN 'Mobile'
        ELSE 'Tablet'
      END AS device_type,
      CASE (s % 3)
        WHEN 0 THEN 'Chrome'
        WHEN 1 THEN 'Safari'
        ELSE 'Firefox'
      END AS browser,
      'BR' AS country,
      -- Distribuir ao longo dos últimos 7 dias
      (NOW() - (n || ' days')::INTERVAL + ((s % 24) || ' hours')::INTERVAL)::TIMESTAMP AS created_at,
      75 + (s % 25) AS scroll_depth,
      180 + (s * 2) AS time_on_page,
      NULL AS click_target,
      jsonb_build_object('demo', true) AS custom_data,
      CASE
        WHEN s <= 85 THEN true
        ELSE false
      END AS is_organic
    FROM
      (SELECT * FROM generate_series(6, 0, -1) AS n) days,
      LATERAL (
        SELECT generate_series(
          1,
          CASE
            WHEN n = 6 THEN 20
            WHEN n = 5 THEN 25
            WHEN n = 4 THEN 30
            WHEN n = 3 THEN 35
            WHEN n = 2 THEN 45
            WHEN n = 1 THEN 60
            WHEN n = 0 THEN 80
          END
        ) AS s
      ) visitors
  )
  SELECT * FROM (
    SELECT * FROM real_data
    UNION ALL
    SELECT * FROM demo_data WHERE NOT EXISTS (SELECT 1 FROM real_data)
  ) AS combined_data
  ORDER BY created_at DESC;
$function$;