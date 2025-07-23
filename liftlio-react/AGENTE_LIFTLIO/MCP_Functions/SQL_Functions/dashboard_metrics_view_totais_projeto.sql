-- View: dashboard_metrics
-- Descrição: View que consolida métricas totais por projeto (vídeos, comentários, engajamentos, leads)
-- Última atualização: Consulta do banco em 22/01/2025

CREATE OR REPLACE VIEW public.dashboard_metrics AS
WITH video_counts AS (
    -- Total de vídeos por projeto
    SELECT s."Projeto_id" AS project_id,
        count(DISTINCT v.id) AS total_videos
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON (v.scanner_id = s.id)
    GROUP BY s."Projeto_id"
),
comment_counts AS (
    -- Total de comentários por projeto
    SELECT s."Projeto_id" AS project_id,
        count(DISTINCT cp.id) AS total_comments
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON (cp.video_id = v.id)
    JOIN "Scanner de videos do youtube" s ON (v.scanner_id = s.id)
    GROUP BY s."Projeto_id"
),
engagement_counts AS (
    -- Total de engajamentos (mensagens tipo 2) por projeto
    SELECT s."Projeto_id" AS project_id,
        count(DISTINCT m.id) AS total_engagements
    FROM "Mensagens" m
    JOIN "Comentarios_Principais" cp ON (m."Comentario_Principais" = cp.id)
    JOIN "Videos" v ON (cp.video_id = v.id)
    JOIN "Scanner de videos do youtube" s ON (v.scanner_id = s.id)
    WHERE m.tipo_msg = 2  -- Tipo 2 = Engajamento
    GROUP BY s."Projeto_id"
),
led_counts AS (
    -- Total de leads (comentários marcados como lead com mensagem tipo 1) por projeto
    SELECT s."Projeto_id" AS project_id,
        count(DISTINCT cp.id) AS total_leads
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON (cp.video_id = v.id)
    JOIN "Scanner de videos do youtube" s ON (v.scanner_id = s.id)
    JOIN "Mensagens" m ON (m."Comentario_Principais" = cp.id)
    WHERE cp.led = true AND m.tipo_msg = 1  -- Tipo 1 = Lead
    GROUP BY s."Projeto_id"
)
SELECT p.project_id,
    COALESCE(vc.total_videos, 0::bigint) AS total_videos,
    COALESCE(cc.total_comments, 0::bigint) AS total_comments,
    COALESCE(ec.total_engagements, 0::bigint) AS total_engagements,
    COALESCE(lc.total_leads, 0::bigint) AS total_leads
FROM (
    SELECT DISTINCT s."Projeto_id" AS project_id
    FROM "Scanner de videos do youtube" s
) p
LEFT JOIN video_counts vc ON (p.project_id = vc.project_id)
LEFT JOIN comment_counts cc ON (p.project_id = cc.project_id)
LEFT JOIN engagement_counts ec ON (p.project_id = ec.project_id)
LEFT JOIN led_counts lc ON (p.project_id = lc.project_id)
ORDER BY p.project_id;