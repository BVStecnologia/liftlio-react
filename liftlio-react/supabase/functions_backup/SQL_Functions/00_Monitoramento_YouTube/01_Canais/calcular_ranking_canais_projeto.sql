-- =============================================
-- Função: calcular_ranking_canais_projeto
-- Descrição: Calcula ranking_score e rank_position para canais de um projeto
-- Parâmetros: p_projeto_id BIGINT - ID do projeto
-- Retorno: TABLE(canais_atualizados, canais_total)
-- Criado: 23/10/2025
-- Atualizado: 23/10/2025
-- =============================================

DROP FUNCTION IF EXISTS public.calcular_ranking_canais_projeto(bigint);

CREATE OR REPLACE FUNCTION public.calcular_ranking_canais_projeto(
    p_projeto_id bigint
)
RETURNS TABLE(canais_atualizados integer, canais_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_canais_atualizados integer := 0;
    v_canais_total integer := 0;
BEGIN
    -- Log início
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'CALC_RANKING_START',
        format('Iniciando cálculo de ranking - Projeto: %s', p_projeto_id),
        true
    );

    -- Calcular ranking_score e rank_position em uma única operação
    WITH canal_scores AS (
        SELECT
            id,
            -- Fórmula de ranking (pesos ajustáveis):
            -- - 40%: total_leads (número de leads gerados)
            -- - 30%: engagement_rate (taxa de engajamento × 100)
            -- - 20%: subscriber_count/1000 (inscritos do canal)
            -- - 10%: recência da última lead (7d=10, 30d=5, >30d=0)
            (
                COALESCE(total_leads, 0) * 0.4 +
                COALESCE(engagement_rate, 0) * 100 * 0.3 +
                COALESCE(subscriber_count, 0)::numeric / 1000 * 0.2 +
                CASE
                    WHEN last_lead_interaction >= NOW() - INTERVAL '7 days' THEN 10
                    WHEN last_lead_interaction >= NOW() - INTERVAL '30 days' THEN 5
                    ELSE 0
                END * 0.1
            ) AS score
        FROM "Canais do youtube"
        WHERE "Projeto" = p_projeto_id
          AND is_active = true
          AND desativado_pelo_user = false
    ),
    ranked_canais AS (
        SELECT
            id,
            score,
            ROW_NUMBER() OVER (ORDER BY score DESC, id ASC) AS position
        FROM canal_scores
    )
    UPDATE "Canais do youtube" c
    SET
        ranking_score = rc.score,
        rank_position = rc.position::integer
    FROM ranked_canais rc
    WHERE c.id = rc.id;

    -- Contar canais atualizados
    GET DIAGNOSTICS v_canais_atualizados = ROW_COUNT;

    -- Contar canais totais do projeto
    SELECT COUNT(*) INTO v_canais_total
    FROM "Canais do youtube"
    WHERE "Projeto" = p_projeto_id
      AND is_active = true
      AND desativado_pelo_user = false;

    -- Log conclusão
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'CALC_RANKING_COMPLETE',
        format('Ranking calculado - Projeto: %s, Atualizados: %s, Total: %s',
            p_projeto_id, v_canais_atualizados, v_canais_total),
        true
    );

    RETURN QUERY SELECT v_canais_atualizados, v_canais_total;

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (operation, details, success)
        VALUES (
            'CALC_RANKING_ERROR',
            format('Erro ao calcular ranking - Projeto: %s, Erro: %s', p_projeto_id, SQLERRM),
            false
        );
        RAISE;
END;
$$;

-- Comentário de documentação
COMMENT ON FUNCTION public.calcular_ranking_canais_projeto(bigint) IS
'Calcula ranking_score e rank_position para canais de um projeto baseado em:
- 40% total_leads (leads gerados)
- 30% engagement_rate × 100 (engajamento)
- 20% subscriber_count / 1000 (inscritos)
- 10% recência última lead (7d=10pts, 30d=5pts, >30d=0pts)';
