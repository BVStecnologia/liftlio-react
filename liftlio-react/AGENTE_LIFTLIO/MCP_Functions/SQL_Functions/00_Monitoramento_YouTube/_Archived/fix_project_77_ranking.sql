-- =============================================
-- Função: fix_project_77_ranking
-- Descrição: Corrige o sistema de ranking do Projeto 77
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS fix_project_77_ranking();

CREATE OR REPLACE FUNCTION fix_project_77_ranking()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_channels_updated INTEGER := 0;
BEGIN
    -- Primeiro, calcular e atribuir ranking_score para todos os canais
    UPDATE "Canais do youtube_Projeto" cyp
    SET ranking_score = (
        SELECT
            -- Score baseado em métricas do canal
            CASE
                WHEN c.subscriber_count IS NOT NULL THEN
                    (LEAST(c.subscriber_count::float / 1000000, 1) * 40) +
                    (LEAST(COALESCE(c.view_count, 0)::float / GREATEST(c.video_count, 1) / 100000, 1) * 30) +
                    (LEAST(COALESCE(c.video_count, 1)::float / 100, 1) * 30)
                ELSE
                    50 -- Score padrão se não houver métricas
            END
        FROM "Canais do youtube" c
        WHERE c.id = cyp."Canais do youtube_id"
    )
    WHERE cyp."Projeto_id" = 77
      AND cyp.ranking_score IS NULL;

    GET DIAGNOSTICS v_channels_updated = ROW_COUNT;

    -- Depois, atribuir rank_position baseado no ranking_score
    WITH ranked AS (
        SELECT
            "Canais do youtube_id",
            ROW_NUMBER() OVER (ORDER BY ranking_score DESC NULLS LAST) as new_rank
        FROM "Canais do youtube_Projeto"
        WHERE "Projeto_id" = 77
    )
    UPDATE "Canais do youtube_Projeto" cyp
    SET rank_position = r.new_rank
    FROM ranked r
    WHERE cyp."Canais do youtube_id" = r."Canais do youtube_id"
      AND cyp."Projeto_id" = 77;

    -- Verificar e criar mensagens de monitoramento para os top 30
    WITH top_channels AS (
        SELECT
            c.id as channel_id,
            c.channel_id as youtube_channel_id,
            c."Nome"
        FROM "Canais do youtube" c
        JOIN "Canais do youtube_Projeto" cyp ON cyp."Canais do youtube_id" = c.id
        WHERE cyp."Projeto_id" = 77
          AND cyp.rank_position <= 30
        ORDER BY cyp.rank_position
    )
    SELECT COUNT(*) INTO v_channels_updated
    FROM top_channels;

    v_result := jsonb_build_object(
        'success', true,
        'channels_with_ranking', v_channels_updated,
        'top_30_channels', (
            SELECT COUNT(*)
            FROM "Canais do youtube_Projeto"
            WHERE "Projeto_id" = 77
              AND rank_position <= 30
        ),
        'timestamp', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;