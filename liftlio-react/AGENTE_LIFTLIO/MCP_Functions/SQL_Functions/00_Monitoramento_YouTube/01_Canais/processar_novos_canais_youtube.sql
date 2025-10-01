-- =============================================
-- Função: processar_novos_canais_youtube
-- Descrição: Processa e rankeia novos canais do YouTube para um projeto
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS processar_novos_canais_youtube(INTEGER);

CREATE OR REPLACE FUNCTION processar_novos_canais_youtube(p_projeto_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_canais_processados INTEGER := 0;
    v_canais_atualizados INTEGER := 0;
    v_canal RECORD;
    v_relevance_score FLOAT;
    v_projeto_keywords TEXT;
BEGIN
    -- Buscar keywords do projeto para cálculo de relevância
    SELECT "Keywords" INTO v_projeto_keywords
    FROM "Projeto"
    WHERE id = p_projeto_id;

    -- Processar cada canal vinculado ao projeto
    FOR v_canal IN
        SELECT DISTINCT
            cy.id as canal_id,
            cy.channel_id,
            cy."Nome",
            cy.subscriber_count,
            cy.view_count,
            cy.video_count,
            cyp.rank_position,
            cyp.ranking_score
        FROM "Canais do youtube" cy
        INNER JOIN "Canais do youtube_Projeto" cyp ON cyp."Canais do youtube_id" = cy.id
        WHERE cyp."Projeto_id" = p_projeto_id
    LOOP
        v_canais_processados := v_canais_processados + 1;

        -- Calcular score de relevância baseado em métricas e keywords
        v_relevance_score := 0;

        -- Componente de popularidade (40% do score)
        IF v_canal.subscriber_count IS NOT NULL THEN
            v_relevance_score := v_relevance_score +
                (LEAST(v_canal.subscriber_count::float / 1000000, 1) * 0.4);
        END IF;

        -- Componente de engajamento (30% do score)
        IF v_canal.view_count IS NOT NULL AND v_canal.video_count IS NOT NULL AND v_canal.video_count > 0 THEN
            v_relevance_score := v_relevance_score +
                (LEAST((v_canal.view_count::float / v_canal.video_count) / 100000, 1) * 0.3);
        END IF;

        -- Componente de atividade (30% do score)
        IF v_canal.video_count IS NOT NULL THEN
            v_relevance_score := v_relevance_score +
                (LEAST(v_canal.video_count::float / 1000, 1) * 0.3);
        END IF;

        -- Normalizar score para 0-100
        v_relevance_score := v_relevance_score * 100;

        -- Atualizar ranking_score se mudou significativamente (mais de 5 pontos)
        IF v_canal.ranking_score IS NULL OR ABS(v_canal.ranking_score - v_relevance_score) > 5 THEN
            UPDATE "Canais do youtube_Projeto"
            SET
                ranking_score = v_relevance_score,
                updated_at = NOW()
            WHERE "Canais do youtube_id" = v_canal.canal_id
                AND "Projeto_id" = p_projeto_id;

            v_canais_atualizados := v_canais_atualizados + 1;
        END IF;
    END LOOP;

    -- Recalcular posições de ranking baseado nos scores
    WITH ranked_channels AS (
        SELECT
            "Canais do youtube_id",
            ROW_NUMBER() OVER (ORDER BY ranking_score DESC NULLS LAST) as new_rank
        FROM "Canais do youtube_Projeto"
        WHERE "Projeto_id" = p_projeto_id
    )
    UPDATE "Canais do youtube_Projeto" cyp
    SET rank_position = rc.new_rank
    FROM ranked_channels rc
    WHERE cyp."Canais do youtube_id" = rc."Canais do youtube_id"
        AND cyp."Projeto_id" = p_projeto_id;

    -- Construir resultado
    v_result := jsonb_build_object(
        'success', true,
        'projeto_id', p_projeto_id,
        'canais_processados', v_canais_processados,
        'rankings_atualizados', v_canais_atualizados,
        'timestamp', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'projeto_id', p_projeto_id,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql;