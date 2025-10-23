-- =============================================
-- Função: monitor_top_channels_for_project
-- Descrição: Monitora os top canais do YouTube de um projeto baseado em rank_position
--            com sistema Anti-Spam integrado usando can_comment_on_channel()
-- Parâmetros: p_project_id INTEGER - ID do projeto
-- Retorno: JSONB com estatísticas de processamento
-- Segurança: SECURITY DEFINER habilitado
-- Criado: 2025
-- Atualizado: 23/10/2025 - CORRIGIDO: Removido JOIN com tabela inexistente
-- =============================================

DROP FUNCTION IF EXISTS public.monitor_top_channels_for_project(integer);

CREATE OR REPLACE FUNCTION public.monitor_top_channels_for_project(p_project_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
    v_channels_processed INTEGER := 0;
    v_channels_skipped INTEGER := 0;
    v_messages_created INTEGER := 0;
    v_channel RECORD;
    v_qtd_monitoramento INTEGER;
    v_can_comment BOOLEAN;
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

    -- Log inicial
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'MONITOR_TOP_CHANNELS_START',
        format('Iniciando monitoramento de top canais - Projeto: %s, Qtd: %s',
            p_project_id, v_qtd_monitoramento),
        true
    );

    -- Processar top canais baseado em rank_position
    FOR v_channel IN
        SELECT
            c.id,
            c.channel_id,
            c."Nome",
            c.rank_position,
            c.ranking_score
        FROM "Canais do youtube" c
        WHERE c."Projeto" = p_project_id
          AND c.is_active = true
          AND c.rank_position IS NOT NULL
          AND c.rank_position <= v_qtd_monitoramento
        ORDER BY c.rank_position
    LOOP
        -- ⭐ ANTI-SPAM: Verificar se pode comentar neste canal
        v_can_comment := can_comment_on_channel(v_channel.channel_id, p_project_id);

        IF NOT v_can_comment THEN
            -- Canal bloqueado - registrar nos logs com detalhes
            v_channels_skipped := v_channels_skipped + 1;

            INSERT INTO system_logs (operation, details, success)
            VALUES (
                'CHANNEL_SKIPPED_ANTISPAM',
                format('[WARNING] Canal %s (ID: %s) bloqueado por Anti-Spam - Rank: %s, Projeto: %s',
                    v_channel."Nome", v_channel.channel_id, v_channel.rank_position, p_project_id),
                true
            );

            RAISE NOTICE 'Canal % (%) pulado - bloqueado por Anti-Spam (rank: %)',
                v_channel."Nome", v_channel.channel_id, v_channel.rank_position;

            CONTINUE; -- pula para próximo canal sem processar
        END IF;

        -- Canal aprovado - processar
        v_channels_processed := v_channels_processed + 1;

        -- Log de canal sendo processado
        INSERT INTO system_logs (operation, details, success)
        VALUES (
            'CHANNEL_PROCESSING',
            format('Processando canal %s (ID: %s) - Rank: %s, Score: %s, Projeto: %s',
                v_channel."Nome", v_channel.channel_id, v_channel.rank_position,
                v_channel.ranking_score, p_project_id),
            true
        );

        -- Processar vídeos do canal
        BEGIN
            PERFORM process_channel_videos(v_channel.channel_id, p_project_id);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log erro no processamento
                INSERT INTO system_logs (operation, details, success)
                VALUES (
                    'CHANNEL_PROCESSING_ERROR',
                    format('[ERROR] Canal %s (ID: %s) - Projeto: %s - Erro: %s (SQLSTATE: %s)',
                        v_channel."Nome", v_channel.channel_id, p_project_id, SQLERRM, SQLSTATE),
                    false
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
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'MONITOR_TOP_CHANNELS_COMPLETE',
        format('Monitoramento concluído - Projeto: %s, Processados: %s, Pulados: %s, Mensagens: %s',
            p_project_id, v_channels_processed, v_channels_skipped, v_messages_created),
        true
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log erro crítico
        INSERT INTO system_logs (operation, details, success)
        VALUES (
            'MONITOR_TOP_CHANNELS_CRITICAL_ERROR',
            format('[CRITICAL ERROR] Projeto: %s - Erro: %s (SQLSTATE: %s)',
                p_project_id, SQLERRM, SQLSTATE),
            false
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'project_id', p_project_id,
            'timestamp', NOW()
        );
END;
$function$;

-- Comentário de documentação
COMMENT ON FUNCTION public.monitor_top_channels_for_project(integer) IS
'Monitora os top canais do YouTube de um projeto com sistema Anti-Spam integrado.
Verifica can_comment_on_channel() antes de processar cada canal.';
