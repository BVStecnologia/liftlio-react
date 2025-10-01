-- =============================================
-- Função: monitor_top_channels_for_project
-- Descrição: Monitora os top canais de um projeto
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS monitor_top_channels_for_project(INTEGER);

CREATE OR REPLACE FUNCTION monitor_top_channels_for_project(p_project_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_channels_processed INTEGER := 0;
    v_messages_created INTEGER := 0;
    v_channel RECORD;
    v_qtd_monitoramento INTEGER;
BEGIN
    -- Buscar quantidade de canais para monitorar
    SELECT qtdmonitoramento INTO v_qtd_monitoramento
    FROM "Projeto"
    WHERE id = p_project_id;

    IF v_qtd_monitoramento IS NULL OR v_qtd_monitoramento = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project monitoring quantity not configured',
            'project_id', p_project_id
        );
    END IF;

    -- Processar top canais baseado em rank_position
    FOR v_channel IN
        SELECT
            c.channel_id,
            c."Nome",
            cyp.rank_position,
            cyp.ranking_score
        FROM "Canais do youtube" c
        JOIN "Canais do youtube_Projeto" cyp ON cyp."Canais do youtube_id" = c.id
        WHERE cyp."Projeto_id" = p_project_id
          AND cyp.rank_position <= v_qtd_monitoramento
        ORDER BY cyp.rank_position
    LOOP
        v_channels_processed := v_channels_processed + 1;

        -- Processar vídeos do canal
        PERFORM process_channel_videos(v_channel.channel_id, p_project_id);
    END LOOP;

    -- Contar mensagens criadas
    SELECT COUNT(*) INTO v_messages_created
    FROM "Mensagens"
    WHERE project_id = p_project_id
      AND tipo_msg = 1
      AND created_at >= NOW() - INTERVAL '1 hour';

    v_result := jsonb_build_object(
        'success', true,
        'project_id', p_project_id,
        'channels_processed', v_channels_processed,
        'messages_created', v_messages_created,
        'monitoring_limit', v_qtd_monitoramento,
        'timestamp', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'project_id', p_project_id
        );
END;
$$ LANGUAGE plpgsql;