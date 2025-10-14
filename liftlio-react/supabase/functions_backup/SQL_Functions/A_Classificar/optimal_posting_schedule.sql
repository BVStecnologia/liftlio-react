-- =============================================
-- Função: optimal_posting_schedule
-- Descrição: Análise de horários ótimos para postagem com métricas de performance
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.optimal_posting_schedule(p_project_id bigint, p_days_back integer DEFAULT 30)
 RETURNS TABLE(time_slot text, hour_of_day integer, day_of_week text, day_number integer, total_posts bigint, posts_responded bigint, response_rate numeric, avg_response_time_hours numeric, avg_lead_score numeric, high_quality_leads bigint, comment_activity_level text, avg_video_age_days numeric, performance_score numeric, recommendations jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH posting_data AS (
        SELECT
            EXTRACT(HOUR FROM cp.published_at) as comment_hour,
            EXTRACT(DOW FROM cp.published_at) as comment_dow,
            TO_CHAR(cp.published_at, 'Day') as day_name,
            cp.id as comment_id,
            cp.lead_score,
            cp.like_count as comment_likes,
            smp.id as post_id,
            smp.postado,
            EXTRACT(EPOCH FROM (smp.postado - cp.published_at)) / 3600 as response_time_hours,
            EXTRACT(DAY FROM cp.published_at - v.created_at) as video_age_days,
            m.tipo_msg
        FROM "Comentarios_Principais" cp
        JOIN "Videos" v ON cp.video_id = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        LEFT JOIN "Settings messages posts" smp ON smp."Comentarios_Principal" = cp.id
        LEFT JOIN "Mensagens" m ON smp."Mensagens" = m.id
        WHERE s."Projeto_id" = p_project_id
        AND cp.published_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    ),
    hourly_stats AS (
        SELECT
            comment_hour::INTEGER as hr,
            comment_dow::INTEGER as dow,
            TRIM(day_name) as dname,
            COUNT(DISTINCT comment_id) as total_comments,
            COUNT(DISTINCT post_id) as tot_posts,
            COUNT(DISTINCT post_id) FILTER (WHERE postado IS NOT NULL) as resp_posts,
            AVG(CASE WHEN response_time_hours IS NOT NULL THEN response_time_hours END) as avg_resp_time,
            AVG(
                CASE
                    WHEN lead_score ~ '^\\d+$' THEN
                        CASE
                            WHEN LENGTH(lead_score) = 1 THEN lead_score::numeric * 10
                            ELSE lead_score::numeric
                        END
                    ELSE NULL
                END
            ) as avg_lscore,
            COUNT(DISTINCT post_id) FILTER (
                WHERE lead_score IS NOT NULL
                AND lead_score ~ '^\\d+$'
                AND (
                    CASE
                        WHEN LENGTH(lead_score) = 1 THEN lead_score::numeric * 10
                        ELSE lead_score::numeric
                    END
                ) >= 70
            ) as hq_leads,
            AVG(comment_likes) as avg_comment_likes,
            AVG(video_age_days) as avg_vid_age
        FROM posting_data
        GROUP BY comment_hour, comment_dow, day_name
    ),
    percentile_calc AS (
        SELECT
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_comments) as p75,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_comments) as p25
        FROM hourly_stats
    ),
    activity_levels AS (
        SELECT
            hs.hr,
            hs.dow,
            hs.dname,
            hs.total_comments,
            hs.tot_posts,
            hs.resp_posts,
            hs.avg_resp_time,
            hs.avg_lscore,
            hs.hq_leads,
            hs.avg_comment_likes,
            hs.avg_vid_age,
            CASE
                WHEN hs.total_comments >= pc.p75 THEN 'High'
                WHEN hs.total_comments >= pc.p25 THEN 'Medium'
                ELSE 'Low'
            END as activity_level
        FROM hourly_stats hs
        CROSS JOIN percentile_calc pc
    )
    SELECT
        (LEFT(al.dname, 3) || ' ' ||
         LPAD(al.hr::text, 2, '0') || ':00-' ||
         LPAD(((al.hr + 1) % 24)::text, 2, '0') || ':00'
        )::TEXT,
        al.hr::INTEGER,
        al.dname::TEXT,
        al.dow::INTEGER,
        al.tot_posts::BIGINT,
        al.resp_posts::BIGINT,
        CASE
            WHEN al.tot_posts > 0
            THEN ROUND((al.resp_posts::numeric / al.tot_posts::numeric) * 100, 2)
            ELSE 0
        END::NUMERIC,
        ROUND(COALESCE(al.avg_resp_time, 0), 2)::NUMERIC,
        ROUND(COALESCE(al.avg_lscore, 0), 2)::NUMERIC,
        al.hq_leads::BIGINT,
        al.activity_level::TEXT,
        ROUND(al.avg_vid_age, 2)::NUMERIC,
        -- Performance Score (0-100)
        ROUND(
            (
                -- Atividade de comentários (30%)
                CASE
                    WHEN al.activity_level = 'High' THEN 30
                    WHEN al.activity_level = 'Medium' THEN 20
                    ELSE 10
                END +
                -- Qualidade dos leads (30%)
                (COALESCE(al.avg_lscore, 0) / 100 * 30) +
                -- Taxa de resposta (20%)
                CASE
                    WHEN al.tot_posts > 0
                    THEN (al.resp_posts::numeric / al.tot_posts::numeric) * 20
                    ELSE 0
                END +
                -- Tempo de resposta (20%) - quanto menor, melhor
                CASE
                    WHEN al.avg_resp_time IS NOT NULL
                    THEN GREATEST(0, 20 - (al.avg_resp_time / 24 * 20))
                    ELSE 10
                END
            ), 2
        )::NUMERIC,
        -- Recomendações
        jsonb_build_object(
            'is_optimal',
            CASE
                WHEN al.activity_level = 'High' AND COALESCE(al.avg_lscore, 0) >= 60 THEN true
                ELSE false
            END,
            'activity_status', al.activity_level,
            'recommendation',
            CASE
                WHEN al.activity_level = 'High' AND COALESCE(al.avg_lscore, 0) >= 70
                    THEN 'Horário premium - priorizar postagens'
                WHEN al.activity_level = 'High' AND COALESCE(al.avg_lscore, 0) >= 50
                    THEN 'Bom horário - alta atividade'
                WHEN al.activity_level = 'Medium' AND COALESCE(al.avg_lscore, 0) >= 60
                    THEN 'Horário alternativo - boa qualidade'
                WHEN al.activity_level = 'Low'
                    THEN 'Baixa atividade - evitar se possível'
                ELSE 'Horário regular'
            END,
            'best_for',
            CASE
                WHEN al.hr BETWEEN 9 AND 17 THEN 'Business hours engagement'
                WHEN al.hr BETWEEN 18 AND 22 THEN 'Evening peak engagement'
                WHEN al.hr BETWEEN 6 AND 8 THEN 'Early morning catch-up'
                ELSE 'Off-peak hours'
            END
        )
    FROM activity_levels al
    ORDER BY 13 DESC, 5 DESC; -- performance_score, total_posts
END;
$function$