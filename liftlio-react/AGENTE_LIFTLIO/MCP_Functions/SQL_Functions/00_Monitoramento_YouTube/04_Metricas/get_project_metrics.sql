-- =============================================
-- Função: get_project_metrics
-- Descrição: Obtém métricas detalhadas de um projeto
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS get_project_metrics(BIGINT);

CREATE OR REPLACE FUNCTION get_project_metrics(p_project_id BIGINT)
RETURNS TABLE (
    total_channels BIGINT,
    channels_with_ranking BIGINT,
    channels_without_ranking BIGINT,
    top_30_channels BIGINT,
    monitoring_messages BIGINT,
    response_messages BIGINT,
    total_videos BIGINT,
    monitored_videos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Total de canais vinculados
        (SELECT COUNT(*) FROM "Canais do youtube_Projeto" WHERE "Projeto_id" = p_project_id),

        -- Canais com ranking_score
        (SELECT COUNT(*) FROM "Canais do youtube_Projeto"
         WHERE "Projeto_id" = p_project_id AND ranking_score IS NOT NULL),

        -- Canais sem ranking_score
        (SELECT COUNT(*) FROM "Canais do youtube_Projeto"
         WHERE "Projeto_id" = p_project_id AND ranking_score IS NULL),

        -- Top 30 canais (com rank_position <= 30)
        (SELECT COUNT(*) FROM "Canais do youtube_Projeto"
         WHERE "Projeto_id" = p_project_id AND rank_position <= 30),

        -- Mensagens de monitoramento (tipo_msg = 1)
        (SELECT COUNT(*) FROM "Mensagens"
         WHERE project_id = p_project_id AND tipo_msg = 1),

        -- Mensagens de resposta (tipo_msg = 2)
        (SELECT COUNT(*) FROM "Mensagens"
         WHERE project_id = p_project_id AND tipo_msg = 2),

        -- Total de vídeos
        (SELECT COUNT(*) FROM "Videos" v
         JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
         JOIN "Canais do youtube_Projeto" cp ON cp."Canais do youtube_id" = c.id
         WHERE cp."Projeto_id" = p_project_id),

        -- Vídeos monitorados (com mensagens)
        (SELECT COUNT(DISTINCT m.video) FROM "Mensagens" m
         WHERE m.project_id = p_project_id AND m.video IS NOT NULL);
END;
$$ LANGUAGE plpgsql;