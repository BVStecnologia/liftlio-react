-- Ferramenta: channel_performance_analysis
-- Descrição: Análise completa de performance por canal
-- Autor: Claude
-- Data: 22/07/2025
-- Versão: 1.1
-- Correção: Videos.Channel contém NOME do canal, não ID

-- DROP obrigatório para recriar a função
DROP FUNCTION IF EXISTS channel_performance_analysis(BIGINT, INTEGER);

CREATE OR REPLACE FUNCTION channel_performance_analysis(
    p_project_id BIGINT,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    channel_id TEXT,
    channel_name TEXT,
    subscriber_count INTEGER,
    total_videos BIGINT,
    monitored_videos BIGINT,
    total_comments BIGINT,
    total_posts BIGINT,
    posts_responded BIGINT,
    response_rate NUMERIC,
    avg_response_time_hours NUMERIC,
    posts_last_7_days BIGINT,
    posts_last_30_days BIGINT,
    avg_lead_score NUMERIC,
    total_engagement_posts BIGINT,
    total_lead_posts BIGINT,
    best_performing_video JSONB,
    posting_schedule JSONB,
    performance_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH channel_stats AS (
        SELECT 
            c.channel_id,
            c."Nome" as channel_name,
            c.subscriber_count::INTEGER,
            COUNT(DISTINCT v.id) as total_videos,
            COUNT(DISTINCT v.id) FILTER (WHERE v.monitored = true) as monitored_videos
        FROM "Canais do youtube" c
        LEFT JOIN "Videos" v ON v."Channel" = c."Nome" -- CORRIGIDO: JOIN por nome
        LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE c."Projeto" = p_project_id
        AND c.is_active = true
        AND (s."Projeto_id" = p_project_id OR s."Projeto_id" IS NULL)
        GROUP BY c.channel_id, c."Nome", c.subscriber_count
    ),
    comment_stats AS (
        SELECT 
            v."Channel" as channel_name, -- CORRIGIDO: usar nome
            COUNT(DISTINCT cp.id) as total_comments,
            AVG(CASE 
                WHEN cp.lead_score ~ '^\d+$' THEN 
                    CASE 
                        WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                        ELSE cp.lead_score::numeric
                    END
                ELSE NULL 
            END) as avg_lead_score
        FROM "Comentarios_Principais" cp
        JOIN "Videos" v ON cp.video_id = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = p_project_id
        GROUP BY v."Channel"
    ),
    post_stats AS (
        SELECT 
            v."Channel" as channel_name, -- CORRIGIDO: usar nome
            COUNT(DISTINCT smp.id) as total_posts,
            COUNT(DISTINCT smp.id) FILTER (WHERE smp.postado IS NOT NULL) as posts_responded,
            COUNT(DISTINCT smp.id) FILTER (
                WHERE smp.postado >= CURRENT_DATE - INTERVAL '7 days'
            ) as posts_last_7_days,
            COUNT(DISTINCT smp.id) FILTER (
                WHERE smp.postado >= CURRENT_DATE - INTERVAL '30 days'
            ) as posts_last_30_days,
            COUNT(DISTINCT smp.id) FILTER (WHERE m.tipo_msg = 1) as total_lead_posts,
            COUNT(DISTINCT smp.id) FILTER (WHERE m.tipo_msg = 2) as total_engagement_posts,
            AVG(
                CASE 
                    WHEN smp.postado IS NOT NULL AND m.created_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (smp.postado - m.created_at)) / 3600
                    ELSE NULL
                END
            ) as avg_response_time_hours
        FROM "Settings messages posts" smp
        JOIN "Mensagens" m ON smp."Mensagens" = m.id
        JOIN "Videos" v ON smp."Videos" = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = p_project_id
        AND smp.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        GROUP BY v."Channel"
    ),
    best_video AS (
        SELECT DISTINCT ON (v."Channel")
            v."Channel" as channel_name, -- CORRIGIDO: usar nome
            jsonb_build_object(
                'video_id', v.id,
                'video_title', v.video_title,
                'view_count', v.view_count,
                'posts_generated', COUNT(smp.id),
                'avg_lead_score', AVG(
                    CASE 
                        WHEN cp.lead_score ~ '^\d+$' THEN 
                            CASE 
                                WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                                ELSE cp.lead_score::numeric
                            END
                        ELSE NULL 
                    END
                )
            ) as best_video_data
        FROM "Videos" v
        LEFT JOIN "Settings messages posts" smp ON smp."Videos" = v.id
        LEFT JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = p_project_id
        GROUP BY v."Channel", v.id, v.video_title, v.view_count
        ORDER BY v."Channel", COUNT(smp.id) DESC, AVG(
            CASE 
                WHEN cp.lead_score ~ '^\d+$' THEN 
                    CASE 
                        WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                        ELSE cp.lead_score::numeric
                    END
                ELSE NULL 
            END
        ) DESC NULLS LAST
    ),
    posting_hours AS (
        SELECT 
            v."Channel" as channel_name, -- CORRIGIDO: usar nome
            jsonb_build_object(
                'most_active_hour', MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM smp.postado)),
                'most_active_day', MODE() WITHIN GROUP (ORDER BY TO_CHAR(smp.postado, 'Day')),
                'posts_by_hour', jsonb_object_agg(
                    EXTRACT(HOUR FROM smp.postado)::text, 
                    count_by_hour
                )
            ) as schedule_data
        FROM "Settings messages posts" smp
        JOIN "Videos" v ON smp."Videos" = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id,
        LATERAL (
            SELECT COUNT(*) as count_by_hour
            FROM "Settings messages posts" smp2
            JOIN "Videos" v2 ON smp2."Videos" = v2.id
            WHERE v2."Channel" = v."Channel"
            AND EXTRACT(HOUR FROM smp2.postado) = EXTRACT(HOUR FROM smp.postado)
        ) counts
        WHERE s."Projeto_id" = p_project_id
        AND smp.postado IS NOT NULL
        GROUP BY v."Channel"
    )
    SELECT 
        cs.channel_id,
        cs.channel_name,
        cs.subscriber_count,
        cs.total_videos,
        cs.monitored_videos,
        COALESCE(cms.total_comments, 0)::BIGINT as total_comments,
        COALESCE(ps.total_posts, 0)::BIGINT as total_posts,
        COALESCE(ps.posts_responded, 0)::BIGINT as posts_responded,
        CASE 
            WHEN COALESCE(ps.total_posts, 0) > 0 
            THEN ROUND((COALESCE(ps.posts_responded, 0)::numeric / ps.total_posts::numeric) * 100, 2)
            ELSE 0 
        END as response_rate,
        ROUND(COALESCE(ps.avg_response_time_hours, 0), 2) as avg_response_time_hours,
        COALESCE(ps.posts_last_7_days, 0)::BIGINT as posts_last_7_days,
        COALESCE(ps.posts_last_30_days, 0)::BIGINT as posts_last_30_days,
        ROUND(COALESCE(cms.avg_lead_score, 0), 2) as avg_lead_score,
        COALESCE(ps.total_engagement_posts, 0)::BIGINT as total_engagement_posts,
        COALESCE(ps.total_lead_posts, 0)::BIGINT as total_lead_posts,
        COALESCE(bv.best_video_data, '{}'::jsonb) as best_performing_video,
        COALESCE(ph.schedule_data, '{}'::jsonb) as posting_schedule,
        -- Performance Score: Combinação ponderada de métricas
        ROUND(
            (
                -- Atividade (30%)
                (CASE 
                    WHEN COALESCE(ps.posts_last_30_days, 0) > 0 
                    THEN LEAST(ps.posts_last_30_days::numeric / 30, 1) * 30
                    ELSE 0 
                END) +
                -- Taxa de resposta (25%)
                (CASE 
                    WHEN COALESCE(ps.total_posts, 0) > 0 
                    THEN (COALESCE(ps.posts_responded, 0)::numeric / ps.total_posts::numeric) * 25
                    ELSE 0 
                END) +
                -- Qualidade dos leads (25%)
                (COALESCE(cms.avg_lead_score, 0) / 100 * 25) +
                -- Engajamento (20%)
                (CASE 
                    WHEN cs.subscriber_count > 0 
                    THEN LEAST(COALESCE(cms.total_comments, 0)::numeric / (cs.subscriber_count::numeric / 1000), 1) * 20
                    ELSE 0 
                END)
            ), 2
        ) as performance_score
    FROM channel_stats cs
    LEFT JOIN comment_stats cms ON cs.channel_name = cms.channel_name -- CORRIGIDO: JOIN por nome
    LEFT JOIN post_stats ps ON cs.channel_name = ps.channel_name -- CORRIGIDO: JOIN por nome
    LEFT JOIN best_video bv ON cs.channel_name = bv.channel_name -- CORRIGIDO: JOIN por nome
    LEFT JOIN posting_hours ph ON cs.channel_name = ph.channel_name -- CORRIGIDO: JOIN por nome
    ORDER BY performance_score DESC;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION channel_performance_analysis(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION channel_performance_analysis(BIGINT, INTEGER) TO anon;

-- TESTE: Executar com projeto 58
-- SELECT * FROM channel_performance_analysis(58, 30);

-- Exemplo de resultado com dados reais:
/*
{
    "channel_id": "UCWD0OMrAWdSUan3Hh_q9QCA",
    "channel_name": "Nico | AI Ranking",
    "subscriber_count": 24000,
    "total_videos": 4,
    "monitored_videos": 2,
    "total_comments": 15,
    "total_posts": 14,
    "posts_responded": 13,
    "response_rate": 92.86,
    "avg_response_time_hours": 1613.50,
    "posts_last_7_days": 2,
    "posts_last_30_days": 13,
    "avg_lead_score": 78.00,
    "total_engagement_posts": 14,
    "total_lead_posts": 0,
    "best_performing_video": {
        "video_id": 27825,
        "video_title": "How To Write SEO Articles With AI That Rank & Get Traffic",
        "view_count": 5289,
        "posts_generated": 17,
        "avg_lead_score": 76.47
    },
    "posting_schedule": {
        "most_active_hour": 23,
        "most_active_day": "Friday",
        "posts_by_hour": {"1": 4, "12": 2, "13": 4, ...}
    },
    "performance_score": 68.21
}
*/