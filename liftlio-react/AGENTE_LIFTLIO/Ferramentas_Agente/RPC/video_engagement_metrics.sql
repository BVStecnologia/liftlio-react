-- Ferramenta: video_engagement_metrics
-- Descrição: Análise detalhada de engajamento por vídeo
-- Autor: Claude
-- Data: 22/01/2025
-- Versão: 1.4 - Corrigido ambiguidade de colunas

-- DROP obrigatório para recriar a função
DROP FUNCTION IF EXISTS video_engagement_metrics(BIGINT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION video_engagement_metrics(
    p_project_id BIGINT,
    p_limit INTEGER DEFAULT 50,
    p_min_comments INTEGER DEFAULT 5
)
RETURNS TABLE (
    video_id BIGINT,
    video_youtube_id TEXT,
    video_title TEXT,
    channel_name TEXT,
    created_date DATE,
    days_since_created INTEGER,
    view_count BIGINT,
    like_count BIGINT,
    comment_count BIGINT,
    monitored_comments BIGINT,
    total_posts BIGINT,
    posts_responded BIGINT,
    response_rate NUMERIC,
    avg_lead_score NUMERIC,
    high_quality_leads BIGINT,
    engagement_posts BIGINT,
    lead_posts BIGINT,
    avg_comment_likes NUMERIC,
    engagement_rate NUMERIC,
    posts_per_1k_views NUMERIC,
    lead_quality_index NUMERIC,
    posting_timeline JSONB,
    top_comments JSONB,
    engagement_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH video_basic AS (
        SELECT 
            v.id as vid_id,
            v."VIDEO" as youtube_id,
            v.video_title,
            v."Channel" as channel_name,
            v.created_at::DATE as created_date,
            EXTRACT(DAY FROM NOW() - v.created_at)::INTEGER as days_old,
            v.view_count::BIGINT,
            v.like_count::BIGINT,
            v.comment_count::BIGINT,
            COUNT(DISTINCT cp.id) as monitored_comments
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        LEFT JOIN "Comentarios_Principais" cp ON cp.video_id = v.id
        WHERE s."Projeto_id" = p_project_id
        AND v.monitored = true
        GROUP BY v.id, v."VIDEO", v.video_title, v."Channel", v.created_at, v.view_count, v.like_count, v.comment_count
        HAVING COUNT(DISTINCT cp.id) >= p_min_comments
    ),
    post_metrics AS (
        SELECT 
            v.id as vid_id,
            COUNT(DISTINCT smp.id) as total_posts,
            COUNT(DISTINCT smp.id) FILTER (WHERE smp.postado IS NOT NULL) as posts_responded,
            COUNT(DISTINCT smp.id) FILTER (WHERE m.tipo_msg = 1) as lead_posts,
            COUNT(DISTINCT smp.id) FILTER (WHERE m.tipo_msg = 2) as engagement_posts,
            COUNT(DISTINCT smp.id) FILTER (
                WHERE cp.lead_score IS NOT NULL 
                AND cp.lead_score ~ '^\\d+$'
                AND (
                    CASE 
                        WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                        ELSE cp.lead_score::numeric
                    END
                ) >= 70
            ) as high_quality_leads,
            AVG(
                CASE 
                    WHEN cp.lead_score ~ '^\\d+$' THEN 
                        CASE 
                            WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                            ELSE cp.lead_score::numeric
                        END
                    ELSE NULL 
                END
            ) as avg_lead_score,
            AVG(cp.like_count) as avg_comment_likes
        FROM "Videos" v
        JOIN "Settings messages posts" smp ON smp."Videos" = v.id
        LEFT JOIN "Mensagens" m ON smp."Mensagens" = m.id
        LEFT JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = p_project_id
        GROUP BY v.id
    ),
    posting_patterns AS (
        SELECT 
            v.id as vid_id,
            jsonb_build_object(
                'first_post_hours', 
                CASE 
                    WHEN MIN(smp.created_at) IS NOT NULL AND v.created_at IS NOT NULL
                    THEN ROUND(EXTRACT(EPOCH FROM (MIN(smp.created_at) - v.created_at)) / 3600, 2)
                    ELSE NULL
                END,
                'last_post_hours',
                CASE 
                    WHEN MAX(smp.created_at) IS NOT NULL AND v.created_at IS NOT NULL
                    THEN ROUND(EXTRACT(EPOCH FROM (MAX(smp.created_at) - v.created_at)) / 3600, 2)
                    ELSE NULL
                END,
                'total_posts_timeline', COUNT(smp.id),
                'peak_activity_day',
                CASE 
                    WHEN COUNT(smp.id) > 0 
                    THEN EXTRACT(DAY FROM MODE() WITHIN GROUP (ORDER BY smp.created_at - v.created_at))
                    ELSE NULL
                END
            ) as timeline_data
        FROM "Videos" v
        LEFT JOIN "Settings messages posts" smp ON smp."Videos" = v.id
        GROUP BY v.id
    ),
    top_comments_ranked AS (
        SELECT 
            cp.video_id as vid_id,
            cp.id as comment_id,
            cp.author_name,
            cp.text_display,
            cp.like_count,
            cp.lead_score,
            COUNT(smp.id) as post_count,
            ROW_NUMBER() OVER (
                PARTITION BY cp.video_id 
                ORDER BY 
                    CASE 
                        WHEN cp.lead_score ~ '^\\d+$' THEN 
                            CASE 
                                WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                                ELSE cp.lead_score::numeric
                            END
                        ELSE 0 
                    END DESC,
                    cp.like_count DESC
            ) as rn
        FROM "Comentarios_Principais" cp
        LEFT JOIN "Settings messages posts" smp ON smp."Comentarios_Principal" = cp.id
        GROUP BY cp.video_id, cp.id, cp.author_name, cp.text_display, cp.like_count, cp.lead_score
    ),
    top_comments_agg AS (
        SELECT 
            tcr.vid_id,
            jsonb_agg(
                jsonb_build_object(
                    'comment_id', tcr.comment_id,
                    'author', tcr.author_name,
                    'text', LEFT(tcr.text_display, 100),
                    'likes', tcr.like_count,
                    'lead_score', 
                    CASE 
                        WHEN tcr.lead_score ~ '^\\d+$' THEN 
                            CASE 
                                WHEN LENGTH(tcr.lead_score) = 1 THEN tcr.lead_score::numeric * 10
                                ELSE tcr.lead_score::numeric
                            END
                        ELSE NULL 
                    END,
                    'posts_generated', tcr.post_count
                )
                ORDER BY tcr.rn
            ) as top_comments_data
        FROM top_comments_ranked tcr
        WHERE tcr.rn <= 3
        GROUP BY tcr.vid_id
    )
    SELECT 
        vb.vid_id::BIGINT,
        vb.youtube_id::TEXT,
        vb.video_title::TEXT,
        vb.channel_name::TEXT,
        vb.created_date,
        vb.days_old,
        vb.view_count,
        vb.like_count,
        vb.comment_count,
        vb.monitored_comments::BIGINT,
        COALESCE(pm.total_posts, 0)::BIGINT,
        COALESCE(pm.posts_responded, 0)::BIGINT,
        CASE 
            WHEN COALESCE(pm.total_posts, 0) > 0 
            THEN ROUND((COALESCE(pm.posts_responded, 0)::numeric / pm.total_posts::numeric) * 100, 2)
            ELSE 0 
        END::NUMERIC,
        ROUND(COALESCE(pm.avg_lead_score, 0), 2)::NUMERIC,
        COALESCE(pm.high_quality_leads, 0)::BIGINT,
        COALESCE(pm.engagement_posts, 0)::BIGINT,
        COALESCE(pm.lead_posts, 0)::BIGINT,
        ROUND(COALESCE(pm.avg_comment_likes, 0), 2)::NUMERIC,
        -- Taxa de engajamento: (likes + comentários) / views * 100
        CASE 
            WHEN vb.view_count > 0 
            THEN ROUND(((vb.like_count + vb.comment_count)::numeric / vb.view_count::numeric) * 100, 4)
            ELSE 0 
        END::NUMERIC,
        -- Posts por 1000 views
        CASE 
            WHEN vb.view_count > 0 
            THEN ROUND((COALESCE(pm.total_posts, 0)::numeric / vb.view_count::numeric) * 1000, 2)
            ELSE 0 
        END::NUMERIC,
        -- Índice de qualidade de leads (0-100)
        ROUND(
            CASE 
                WHEN COALESCE(pm.total_posts, 0) > 0 
                THEN (
                    (COALESCE(pm.avg_lead_score, 0) * 0.4) +
                    ((COALESCE(pm.high_quality_leads, 0)::numeric / pm.total_posts::numeric) * 100 * 0.3) +
                    (LEAST(COALESCE(pm.avg_comment_likes, 0) / 10, 10) * 10 * 0.3)
                )
                ELSE 0 
            END, 2
        )::NUMERIC,
        COALESCE(pp.timeline_data, '{}'::jsonb),
        COALESCE(tc.top_comments_data, '[]'::jsonb),
        -- Score de engajamento (0-100)
        ROUND(
            (
                -- Taxa de engajamento (30%)
                LEAST(
                    CASE 
                        WHEN vb.view_count > 0 
                        THEN ((vb.like_count + vb.comment_count)::numeric / vb.view_count::numeric) * 100
                        ELSE 0 
                    END * 10, 
                    30
                ) +
                -- Posts gerados (25%)
                LEAST(
                    CASE 
                        WHEN vb.view_count > 0 
                        THEN (COALESCE(pm.total_posts, 0)::numeric / vb.view_count::numeric) * 1000 * 5
                        ELSE 0 
                    END, 
                    25
                ) +
                -- Qualidade dos leads (25%)
                (COALESCE(pm.avg_lead_score, 0) / 100 * 25) +
                -- Taxa de resposta (20%)
                (
                    CASE 
                        WHEN COALESCE(pm.total_posts, 0) > 0 
                        THEN (COALESCE(pm.posts_responded, 0)::numeric / pm.total_posts::numeric) * 20
                        ELSE 0 
                    END
                )
            ), 2
        )::NUMERIC
    FROM video_basic vb
    LEFT JOIN post_metrics pm ON vb.vid_id = pm.vid_id
    LEFT JOIN posting_patterns pp ON vb.vid_id = pp.vid_id
    LEFT JOIN top_comments_agg tc ON vb.vid_id = tc.vid_id
    ORDER BY 24 DESC -- engagement_score
    LIMIT p_limit;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION video_engagement_metrics(BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION video_engagement_metrics(BIGINT, INTEGER, INTEGER) TO anon;

-- TESTE: Executar com projeto 58
-- SELECT * FROM video_engagement_metrics(58, 10, 0);

-- Exemplo de resultado:
/*
{
    "video_id": 27843,
    "video_youtube_id": "u-CLbqrZ3O8",
    "video_title": "Ricci Companies need to stop saying AI #carterpcs #tech #techtok #techfacts #ai #chatgpt",
    "channel_name": "CarterPCs",
    "created_date": "2025-05-08",
    "days_since_created": 75,
    "view_count": 300729,
    "like_count": 19652,
    "comment_count": 258,
    "monitored_comments": 0,
    "total_posts": 0,
    "posts_responded": 0,
    "response_rate": 0,
    "avg_lead_score": 0.00,
    "high_quality_leads": 0,
    "engagement_posts": 0,
    "lead_posts": 0,
    "avg_comment_likes": 0.00,
    "engagement_rate": 6.6206,
    "posts_per_1k_views": 0.00,
    "lead_quality_index": 0.00,
    "posting_timeline": {
        "last_post_hours": null,
        "first_post_hours": null,
        "peak_activity_day": null,
        "total_posts_timeline": 0
    },
    "top_comments": [],
    "engagement_score": 30.00
}
*/