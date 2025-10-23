-- =============================================
-- Função: monitor_top_channels_for_project
-- Descrição: Monitora os top canais de um projeto com validação anti-spam aprimorada
-- Criado: 2025-01-23
-- Atualizado: 2025-01-03 (Integração Anti-Spam Sistema melhorada com logs detalhados)
-- Atualizado: 2025-10-23 - Adicionada verificação de Mentions disponíveis
--                          Não monitora canais se customer sem Mentions
-- =============================================

DROP FUNCTION IF EXISTS monitor_top_channels_for_project(INTEGER);

CREATE OR REPLACE FUNCTION monitor_top_channels_for_project(p_project_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_channels_processed INTEGER := 0;
    v_channels_skipped INTEGER := 0;
    v_messages_created INTEGER := 0;
    v_channel RECORD;
    v_qtd_monitoramento INTEGER;
    v_can_comment BOOLEAN;
    v_mentions_disponiveis INTEGER;  -- NOVO
    v_user_id TEXT;                  -- NOVO
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

    -- ⭐ NOVO: Verificar se customer tem Mentions disponíveis
    SELECT p."User id", COALESCE(c."Mentions", 0)
    INTO v_user_id, v_mentions_disponiveis
    FROM "Projeto" p
    LEFT JOIN customers c ON p."User id" = c.user_id
    WHERE p.id = p_project_id;

    IF v_mentions_disponiveis <= 0 THEN
        -- Log de quota esgotada
        INSERT INTO "Logs" (level, message, details, function_name, created_at)
        VALUES (
            'warning',
            'Monitoramento cancelado - Customer sem Mentions',
            jsonb_build_object(
                'project_id', p_project_id,
                'user_id', v_user_id,
                'mentions_available', v_mentions_disponiveis,
                'reason', 'no_quota'
            ),
            'monitor_top_channels_for_project',
            NOW()
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer has no Mentions available',
            'project_id', p_project_id,
            'mentions_available', v_mentions_disponiveis,
            'reason', 'no_quota'
        );
    END IF;

    RAISE NOTICE 'Customer tem % Mentions disponíveis. Continuando monitoramento.',
                 v_mentions_disponiveis;

    -- Log inicial
    INSERT INTO "Logs" (level, message, details, function_name, created_at)
    VALUES (
        'info',
        'Iniciando monitoramento de top canais',
        jsonb_build_object(
            'project_id', p_project_id,
            'qtd_monitoramento', v_qtd_monitoramento,
            'timestamp', NOW()
        ),
        'monitor_top_channels_for_project',
        NOW()
    );

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
        -- ⭐ ANTI-SPAM: Verificar se pode comentar neste canal
        v_can_comment := can_comment_on_channel(v_channel.channel_id, p_project_id);

        IF NOT v_can_comment THEN
            -- Canal bloqueado - registrar nos logs com detalhes
            v_channels_skipped := v_channels_skipped + 1;

            INSERT INTO "Logs" (level, message, details, function_name, created_at)
            VALUES (
                'warning',
                format('Canal %s bloqueado por Anti-Spam', v_channel."Nome"),
                jsonb_build_object(
                    'project_id', p_project_id,
                    'channel_id', v_channel.channel_id,
                    'channel_name', v_channel."Nome",
                    'rank_position', v_channel.rank_position,
                    'ranking_score', v_channel.ranking_score,
                    'reason', 'anti_spam_block'
                ),
                'monitor_top_channels_for_project',
                NOW()
            );

            RAISE NOTICE 'Canal % (%) pulado - bloqueado por Anti-Spam (rank: %)',
                v_channel."Nome", v_channel.channel_id, v_channel.rank_position;

            CONTINUE; -- pula para próximo canal sem processar
        END IF;

        -- Canal aprovado - processar
        v_channels_processed := v_channels_processed + 1;

        -- Log de canal sendo processado
        INSERT INTO "Logs" (level, message, details, function_name, created_at)
        VALUES (
            'info',
            format('Processando canal %s', v_channel."Nome"),
            jsonb_build_object(
                'project_id', p_project_id,
                'channel_id', v_channel.channel_id,
                'channel_name', v_channel."Nome",
                'rank_position', v_channel.rank_position,
                'ranking_score', v_channel.ranking_score
            ),
            'monitor_top_channels_for_project',
            NOW()
        );

        -- Processar vídeos do canal
        BEGIN
            PERFORM process_channel_videos(v_channel.channel_id, p_project_id);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log erro no processamento
                INSERT INTO "Logs" (level, message, details, function_name, created_at)
                VALUES (
                    'error',
                    format('Erro ao processar vídeos do canal %s', v_channel."Nome"),
                    jsonb_build_object(
                        'project_id', p_project_id,
                        'channel_id', v_channel.channel_id,
                        'error', SQLERRM,
                        'sqlstate', SQLSTATE
                    ),
                    'monitor_top_channels_for_project',
                    NOW()
                );
        END;
    END LOOP;

    -- Contar mensagens criadas
    SELECT COUNT(*) INTO v_messages_created
    FROM "Mensagens"
    WHERE project_id = p_project_id
      AND tipo_msg = 1
      AND created_at >= NOW() - INTERVAL '1 hour';

    -- Preparar resultado final
    v_result := jsonb_build_object(
        'success', true,
        'project_id', p_project_id,
        'channels_processed', v_channels_processed,
        'channels_skipped', v_channels_skipped,
        'total_channels_evaluated', v_channels_processed + v_channels_skipped,
        'messages_created', v_messages_created,
        'monitoring_limit', v_qtd_monitoramento,
        'timestamp', NOW()
    );

    -- Log final com estatísticas
    INSERT INTO "Logs" (level, message, details, function_name, created_at)
    VALUES (
        'info',
        'Monitoramento de canais concluído',
        v_result,
        'monitor_top_channels_for_project',
        NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log erro crítico
        INSERT INTO "Logs" (level, message, details, function_name, created_at)
        VALUES (
            'error',
            'Erro crítico no monitoramento de canais',
            jsonb_build_object(
                'project_id', p_project_id,
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'timestamp', NOW()
            ),
            'monitor_top_channels_for_project',
            NOW()
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'project_id', p_project_id,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql;

-- Comentário para documentação
COMMENT ON FUNCTION monitor_top_channels_for_project(INTEGER) IS
'Monitora os principais canais de um projeto com validação anti-spam aprimorada.
Verifica se pode comentar em cada canal antes de processar usando can_comment_on_channel().
Registra logs detalhados de canais processados e bloqueados.
Retorna estatísticas completas incluindo canais pulados por anti-spam.';