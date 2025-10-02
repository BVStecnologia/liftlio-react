-- =============================================
-- Função: get_trends_summary
-- Descrição: Retorna resumo estatístico dos trends do YouTube por região
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.get_trends_summary(p_region text DEFAULT 'US'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_result jsonb;
    v_status_agg jsonb;
    v_category_agg jsonb;
    v_top_growing jsonb;
    v_top_declining jsonb;
    v_last_update timestamp with time zone;
    v_total_active int;
    v_avg_growth decimal;
    v_avg_sentiment decimal;
BEGIN
    -- Total de trends ativas
    SELECT
        COUNT(*),
        AVG(growth),
        AVG(sentiment_score)
    INTO v_total_active, v_avg_growth, v_avg_sentiment
    FROM youtube_trends_current
    WHERE is_active = true AND region = p_region;

    -- Agregação por status
    SELECT jsonb_object_agg(status, count) INTO v_status_agg
    FROM (
        SELECT status, COUNT(*) as count
        FROM youtube_trends_current
        WHERE is_active = true AND region = p_region
        GROUP BY status
    ) s;

    -- Agregação por categoria
    SELECT jsonb_object_agg(category, count) INTO v_category_agg
    FROM (
        SELECT category, COUNT(*) as count
        FROM youtube_trends_current
        WHERE is_active = true AND region = p_region
        GROUP BY category
    ) c;

    -- Top growing
    SELECT jsonb_agg(
        jsonb_build_object(
            'topic', topic,
            'growth', growth,
            'category', category,
            'volume', volume
        )
    ) INTO v_top_growing
    FROM (
        SELECT topic, growth, category, volume
        FROM youtube_trends_current
        WHERE is_active = true AND region = p_region AND growth > 0
        ORDER BY growth DESC
        LIMIT 5
    ) tg;

    -- Top declining
    SELECT jsonb_agg(
        jsonb_build_object(
            'topic', topic,
            'growth', growth,
            'category', category,
            'volume', volume
        )
    ) INTO v_top_declining
    FROM (
        SELECT topic, growth, category, volume
        FROM youtube_trends_current
        WHERE is_active = true AND region = p_region AND growth < 0
        ORDER BY growth ASC
        LIMIT 5
    ) td;

    -- Última atualização
    SELECT MAX(updated_at) INTO v_last_update
    FROM youtube_trends_current
    WHERE region = p_region;

    -- Montar resultado final
    v_result := jsonb_build_object(
        'total_active', COALESCE(v_total_active, 0),
        'avg_growth', COALESCE(v_avg_growth, 0),
        'avg_sentiment', COALESCE(v_avg_sentiment, 0),
        'by_status', COALESCE(v_status_agg, '{}'::jsonb),
        'by_category', COALESCE(v_category_agg, '{}'::jsonb),
        'top_growing', COALESCE(v_top_growing, '[]'::jsonb),
        'top_declining', COALESCE(v_top_declining, '[]'::jsonb),
        'last_update', v_last_update
    );

    RETURN v_result;
END;
$function$