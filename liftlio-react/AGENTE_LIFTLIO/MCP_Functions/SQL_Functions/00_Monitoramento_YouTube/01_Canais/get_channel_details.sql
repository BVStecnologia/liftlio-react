-- =============================================
-- Função: get_channel_details
-- Descrição: Obtém detalhes de canais para análise
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS get_channel_details(BIGINT, INTEGER);

CREATE OR REPLACE FUNCTION get_channel_details(
    p_project_id BIGINT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    channel_name TEXT,
    channel_id TEXT,
    ranking_score FLOAT,
    rank_position INTEGER,
    subscriber_count INTEGER,
    view_count BIGINT,
    video_count INTEGER,
    is_top_30 BOOLEAN,
    monitoring_msgs BIGINT,
    response_msgs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c."Nome" as channel_name,
        c.channel_id,
        cp.ranking_score,
        cp.rank_position,
        c.subscriber_count,
        c.view_count,
        c.video_count,
        (cp.rank_position <= 30) as is_top_30,

        -- Contagem de mensagens de monitoramento
        (SELECT COUNT(*) FROM "Mensagens" m
         JOIN "Videos" v ON m.video = v.id
         WHERE v.channel_id_yotube = c.channel_id
         AND m.project_id = p_project_id
         AND m.tipo_msg = 1) as monitoring_msgs,

        -- Contagem de mensagens de resposta
        (SELECT COUNT(*) FROM "Mensagens" m
         JOIN "Videos" v ON m.video = v.id
         WHERE v.channel_id_yotube = c.channel_id
         AND m.project_id = p_project_id
         AND m.tipo_msg = 2) as response_msgs

    FROM "Canais do youtube" c
    JOIN "Canais do youtube_Projeto" cp ON cp."Canais do youtube_id" = c.id
    WHERE cp."Projeto_id" = p_project_id
    ORDER BY cp.rank_position NULLS LAST, cp.ranking_score DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;