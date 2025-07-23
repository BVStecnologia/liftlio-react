-- View: channel_metrics_dashboard  
-- Descrição: View complexa que calcula métricas detalhadas por canal incluindo scoring e ranking
-- Última atualização: Consulta do banco em 22/01/2025

CREATE OR REPLACE VIEW public.channel_metrics_dashboard AS
WITH canais_do_projeto AS (
    -- Dados básicos dos canais ativos
    SELECT 
        cy.id AS canal_id,
        cy."Nome" AS nome_canal,
        cy.channel_id,
        cy."Projeto" AS projeto_id,
        p."Project name" AS nome_projeto,
        cy.is_active,
        cy.subscriber_count,
        cy.view_count AS canal_view_count,
        cy.video_count AS canal_video_count
    FROM "Canais do youtube" cy
    LEFT JOIN "Projeto" p ON (cy."Projeto" = p.id)
    WHERE cy.is_active = true
),
videos_por_canal AS (
    -- Métricas de vídeos por canal
    SELECT 
        cp.canal_id,
        cp.projeto_id,
        count(DISTINCT v.id) AS videos_encontrados,
        COALESCE(sum(v.view_count), 0::numeric) AS total_views_videos,
        COALESCE(sum(v.like_count), 0::numeric) AS total_likes_videos,
        COALESCE(sum(v.comment_count), 0::numeric) AS comentarios_reportados,
        COALESCE(avg(v.relevance_score), 0::double precision) AS media_relevance_score
    FROM canais_do_projeto cp
    LEFT JOIN "Videos" v ON (v.channel_id_yotube::text = cp.channel_id)
    GROUP BY cp.canal_id, cp.projeto_id
),
comentarios_por_canal AS (
    -- Métricas de comentários por canal
    SELECT 
        cp.canal_id,
        count(DISTINCT cm.id) AS comentarios_reais,
        COALESCE(avg((NULLIF(cm.lead_score, ''::text))::double precision), 0::double precision) AS media_lead_score,
        count(DISTINCT CASE
            WHEN cm.led = true THEN cm.id
            ELSE NULL::bigint
        END) AS comentarios_leads,
        max(cm.published_at) AS ultimo_comentario_data
    FROM canais_do_projeto cp
    LEFT JOIN "Videos" v ON (v.channel_id_yotube::text = cp.channel_id)
    LEFT JOIN "Comentarios_Principais" cm ON (cm.video_id = v.id)
    GROUP BY cp.canal_id
),
mensagens_por_canal AS (
    -- Métricas de mensagens por canal
    SELECT 
        cp.canal_id,
        count(DISTINCT m.id) AS total_mensagens,
        count(DISTINCT CASE
            WHEN m.respondido = true THEN m.id
            ELSE NULL::bigint
        END) AS mensagens_respondidas
    FROM canais_do_projeto cp
    LEFT JOIN "Videos" v ON (v.channel_id_yotube::text = cp.channel_id)
    LEFT JOIN "Comentarios_Principais" cm ON (cm.video_id = v.id)
    LEFT JOIN "Mensagens" m ON (m."Comentario_Principais" = cm.id)
    GROUP BY cp.canal_id
),
max_values AS (
    -- Valores máximos para normalização do scoring
    SELECT 
        cp.projeto_id,
        max(cp.subscriber_count) AS max_subscriber_count,
        max(vpc.total_views_videos) AS max_total_views,
        max(cpc.comentarios_reais) AS max_total_comments,
        max(cpc.media_lead_score) AS max_lead_score,
        max(cpc.comentarios_leads + COALESCE(mpc.mensagens_respondidas, 0::bigint)) AS max_total_leads
    FROM canais_do_projeto cp
    LEFT JOIN videos_por_canal vpc ON (cp.canal_id = vpc.canal_id)
    LEFT JOIN comentarios_por_canal cpc ON (cp.canal_id = cpc.canal_id)
    LEFT JOIN mensagens_por_canal mpc ON (cp.canal_id = mpc.canal_id)
    GROUP BY cp.projeto_id
),
combined_metrics AS (
    -- Combinação de todas as métricas
    SELECT 
        cp.canal_id,
        cp.nome_canal,
        cp.channel_id,
        cp.projeto_id,
        cp.nome_projeto,
        cp.is_active,
        cp.subscriber_count,
        cp.canal_view_count,
        cp.canal_video_count,
        vpc.videos_encontrados,
        vpc.total_views_videos,
        vpc.total_likes_videos,
        vpc.comentarios_reportados,
        vpc.media_relevance_score,
        COALESCE(cpc.comentarios_reais, 0::bigint) AS comentarios_reais,
        COALESCE(cpc.media_lead_score, 0::double precision) AS media_lead_score,
        COALESCE(cpc.comentarios_leads, 0::bigint) AS comentarios_leads,
        cpc.ultimo_comentario_data,
        COALESCE(mpc.total_mensagens, 0::bigint) AS total_mensagens,
        COALESCE(mpc.mensagens_respondidas, 0::bigint) AS mensagens_respondidas,
        -- Total de leads = comentários leads + mensagens respondidas
        (COALESCE(cpc.comentarios_leads, 0::bigint) + COALESCE(mpc.mensagens_respondidas, 0::bigint)) AS total_leads,
        -- Taxa de engajamento
        CASE
            WHEN COALESCE(vpc.videos_encontrados, 0::bigint) > 0 
            THEN (COALESCE(cpc.comentarios_reais, 0::bigint)::double precision / vpc.videos_encontrados::double precision)
            ELSE 0::double precision
        END AS engagement_rate
    FROM canais_do_projeto cp
    LEFT JOIN videos_por_canal vpc ON (cp.canal_id = vpc.canal_id)
    LEFT JOIN comentarios_por_canal cpc ON (cp.canal_id = cpc.canal_id)
    LEFT JOIN mensagens_por_canal mpc ON (cp.canal_id = mpc.canal_id)
),
scoring AS (
    -- Cálculo do score do canal (ponderado)
    SELECT 
        cm.*,
        -- Score calculado com pesos:
        -- 15% subscriber_count
        -- 20% total_views
        -- 30% comentarios_reais
        -- 20% media_lead_score
        -- 15% total_leads
        (
            CASE
                WHEN mv.max_subscriber_count > 0 
                THEN (cm.subscriber_count::double precision / mv.max_subscriber_count::double precision * 15::double precision)
                ELSE 0::double precision
            END +
            CASE
                WHEN mv.max_total_views > 0::numeric 
                THEN (cm.total_views_videos::double precision / mv.max_total_views::double precision * 20::double precision)
                ELSE 0::double precision
            END +
            CASE
                WHEN mv.max_total_comments > 0 
                THEN (cm.comentarios_reais::double precision / mv.max_total_comments::double precision * 30::double precision)
                ELSE 0::double precision
            END +
            CASE
                WHEN mv.max_lead_score > 0::double precision 
                THEN (cm.media_lead_score / mv.max_lead_score * 20::double precision)
                ELSE 0::double precision
            END +
            CASE
                WHEN mv.max_total_leads > 0 
                THEN (cm.total_leads::double precision / mv.max_total_leads::double precision * 15::double precision)
                ELSE 0::double precision
            END
        ) AS canal_score
    FROM combined_metrics cm
    JOIN max_values mv ON (cm.projeto_id = mv.projeto_id)
)
-- Resultado final com ranking
SELECT 
    s.*,
    rank() OVER (PARTITION BY s.projeto_id ORDER BY s.canal_score DESC) AS ranking_posicao
FROM scoring s;