-- =============================================
-- Função: obter_canais_nao_registrados
-- Descrição: Retorna canais descobertos que ainda não foram registrados oficialmente
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS obter_canais_nao_registrados(BIGINT);

CREATE OR REPLACE FUNCTION obter_canais_nao_registrados(id_projeto BIGINT)
RETURNS TABLE (
    canal_id TEXT,
    nome_canal TEXT,
    total_videos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd."Canal" AS canal_id,
        cd."Nome do canal" AS nome_canal,
        COUNT(DISTINCT cd.video_id) AS total_videos
    FROM "Canais descobertos" cd
    LEFT JOIN "Canais do youtube" cy ON cd."Canal" = cy.channel_id
    WHERE
        cd.projeto = id_projeto
        AND cy.id IS NULL
    GROUP BY cd."Canal", cd."Nome do canal"
    ORDER BY total_videos DESC;
END;
$$ LANGUAGE plpgsql;