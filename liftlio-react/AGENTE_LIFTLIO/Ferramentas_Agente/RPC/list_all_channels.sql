-- Ferramenta: list_all_channels
-- Descrição: Lista todos os canais monitorados com estatísticas completas
-- Autor: Claude
-- Data: 22/01/2025
-- Versão: 1.0

-- DROP obrigatório para recriar a função
DROP FUNCTION IF EXISTS list_all_channels(BIGINT);

CREATE OR REPLACE FUNCTION list_all_channels(
    p_project_id BIGINT
)
RETURNS TABLE (
    channel_name TEXT,
    channel_id TEXT,
    subscriber_count INTEGER,
    is_active BOOLEAN,
    total_videos BIGINT,
    monitored_videos BIGINT,
    total_posts BIGINT,
    posts_responded BIGINT,
    total_comments BIGINT,
    avg_lead_score NUMERIC,
    response_rate NUMERIC,
    last_video_date DATE,
    last_post_date TIMESTAMP,
    channel_category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH channel_base AS (
        SELECT 
            c."Nome" as ch_name,
            c.channel_id as ch_id,
            c.subscriber_count as subs,
            c.is_active as active,
            COUNT(DISTINCT v.id) as tot_videos,
            COUNT(DISTINCT v.id) FILTER (WHERE v.monitored = true) as mon_videos
        FROM "Canais do youtube" c
        LEFT JOIN "Videos" v ON v."Channel" = c."Nome"
        LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE c."Projeto" = p_project_id
        AND (s."Projeto_id" = p_project_id OR s."Projeto_id" IS NULL)
        GROUP BY c."Nome", c.channel_id, c.subscriber_count, c.is_active
    ),
    post_stats AS (
        SELECT 
            v."Channel" as ch_name,
            COUNT(DISTINCT smp.id) as tot_posts,
            COUNT(DISTINCT smp.id) FILTER (WHERE smp.postado IS NOT NULL) as resp_posts,
            COUNT(DISTINCT cp.id) as tot_comments,
            AVG(
                CASE 
                    WHEN cp.lead_score ~ '^\\d+$' THEN 
                        CASE 
                            WHEN LENGTH(cp.lead_score) = 1 THEN cp.lead_score::numeric * 10
                            ELSE cp.lead_score::numeric
                        END
                    ELSE NULL 
                END
            ) as avg_score,
            MAX(smp.postado) as last_post
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        LEFT JOIN "Settings messages posts" smp ON smp."Videos" = v.id
        LEFT JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
        WHERE s."Projeto_id" = p_project_id
        GROUP BY v."Channel"
    ),
    video_dates AS (
        SELECT 
            v."Channel" as ch_name,
            MAX(v.created_at::DATE) as last_vid_date
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = p_project_id
        GROUP BY v."Channel"
    )
    SELECT 
        cb.ch_name::TEXT,
        cb.ch_id::TEXT,
        cb.subs::INTEGER,
        cb.active,
        cb.tot_videos,
        cb.mon_videos,
        COALESCE(ps.tot_posts, 0)::BIGINT,
        COALESCE(ps.resp_posts, 0)::BIGINT,
        COALESCE(ps.tot_comments, 0)::BIGINT,
        ROUND(COALESCE(ps.avg_score, 0), 2)::NUMERIC,
        CASE 
            WHEN COALESCE(ps.tot_posts, 0) > 0 
            THEN ROUND((COALESCE(ps.resp_posts, 0)::numeric / ps.tot_posts::numeric) * 100, 2)
            ELSE 0 
        END::NUMERIC,
        vd.last_vid_date,
        ps.last_post,
        CASE 
            WHEN cb.subs >= 1000000 THEN 'Mega (1M+)'
            WHEN cb.subs >= 500000 THEN 'Grande (500K-1M)'
            WHEN cb.subs >= 100000 THEN 'Médio (100K-500K)'
            WHEN cb.subs >= 50000 THEN 'Pequeno-Médio (50K-100K)'
            WHEN cb.subs >= 10000 THEN 'Pequeno (10K-50K)'
            ELSE 'Micro (<10K)'
        END::TEXT
    FROM channel_base cb
    LEFT JOIN post_stats ps ON cb.ch_name = ps.ch_name
    LEFT JOIN video_dates vd ON cb.ch_name = vd.ch_name
    WHERE cb.active = true
    ORDER BY cb.subs DESC;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION list_all_channels(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_channels(BIGINT) TO anon;

-- TESTE: Executar com projeto 58
-- SELECT * FROM list_all_channels(58);

-- Exemplo de resultado com todos os 18 canais
/*
Mega (1M+):
1. CarterPCs - 1,650,000 inscritos

Grande (500K-1M):
2. Complete Technology - 670,000 inscritos

Médio (100K-500K):
3. Darrel Wilson - 445,000 inscritos
4. Shark Numbers - 320,000 inscritos
5. Real Money Strategies - 215,000 inscritos
6. Kimberly Mitchell - 156,000 inscritos
7. Income stream surfers - 137,000 inscritos

Pequeno (10K-50K):
8. UNmiss - 29,300 inscritos
9. WordsAtScale - 24,800 inscritos
10. Nico | AI Ranking - 24,000 inscritos
11. Insights4UToday - 22,000 inscritos
12. Robert Okello - 19,700 inscritos
13. CanEye - 19,100 inscritos
14. Think Smart - 16,800 inscritos
15. Study With Nuha - 15,000 inscritos
16. Alamin - 14,200 inscritos

Micro (<10K):
17. Kingsway Collins - 5,610 inscritos
18. Tadhg Blommerde - 1,770 inscritos
*/