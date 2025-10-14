-- =============================================
-- Função: get_youtube_trends
-- Descrição: Obtém tendências do YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_trends(integer);

CREATE OR REPLACE FUNCTION public.get_youtube_trends(p_days_back integer DEFAULT 200)
 RETURNS TABLE(id bigint, topic text, category text, status text, volume bigint, growth numeric, velocity numeric, momentum numeric, engagement_rate numeric, video_count integer, channel_count integer, quality_score numeric, sentiment_score numeric, sentiment_label text, top_channels jsonb, temporal_data jsonb, scores jsonb, insights jsonb, region text, is_active boolean, first_seen timestamp with time zone, last_seen timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.topic,
        t.category,
        t.status,
        t.volume,
        t.growth,
        t.velocity,
        t.momentum,
        t.engagement_rate,
        t.video_count,
        t.channel_count,
        t.quality_score,
        t.sentiment_score,
        t.sentiment_label,
        t.top_channels,
        t.temporal_data,
        t.scores,
        t.insights,
        t.region,
        t.is_active,
        t.first_seen,
        t.last_seen,
        t.updated_at
    FROM youtube_trends_current t
    WHERE t.updated_at >= now() - (p_days_back || ' days')::interval
    ORDER BY t.updated_at DESC;
END;
$function$;