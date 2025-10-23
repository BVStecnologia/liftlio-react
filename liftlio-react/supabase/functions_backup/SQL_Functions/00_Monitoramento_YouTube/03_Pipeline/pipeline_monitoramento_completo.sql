-- =============================================
-- Função: pipeline_monitoramento_completo
-- Descrição: Pipeline completo de monitoramento YouTube
--            Executa em sequência:
--            1. Calcula ranking dos canais
--            2. Monitora top channels e processa vídeos
-- Retorno: TABLE com estatísticas por projeto
-- CRON: A cada 3 horas (recomendado)
-- Criado: 23/10/2025
-- =============================================

DROP FUNCTION IF EXISTS public.pipeline_monitoramento_completo();

CREATE OR REPLACE FUNCTION public.pipeline_monitoramento_completo()
RETURNS TABLE(
    projeto_id BIGINT,
    canais_ranqueados INTEGER,
    canais_processados INTEGER,
    canais_pulados INTEGER,
    mensagens_criadas INTEGER,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    projeto_record RECORD;
    v_ranking_result RECORD;
    v_monitor_result JSONB;
    v_mentions INTEGER;
BEGIN
    -- Log início do pipeline
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'PIPELINE_START',
        'Iniciando pipeline completo de monitoramento YouTube',
        true
    );

    -- Loop em todos os projetos com YouTube ativo
    FOR projeto_record IN
        SELECT
            p.id,
            p.qtdmonitoramento,
            p."Youtube Active",
            p.integracao_valida,
            p.status,
            COALESCE(c."Mentions", 0) as mentions
        FROM "Projeto" p
        LEFT JOIN customers c ON c.user_id = p."User id"
        WHERE p."Youtube Active" = TRUE
        ORDER BY p.id
    LOOP
        BEGIN
            -- ============================================
            -- VERIFICAÇÕES OBRIGATÓRIAS
            -- ============================================

            -- 1. Verificar se YouTube está ativo
            IF NOT COALESCE(projeto_record."Youtube Active", false) THEN
                INSERT INTO system_logs (operation, details, success)
                VALUES (
                    'PIPELINE_SKIPPED',
                    format('Projeto %s pulado - YouTube não ativo', projeto_record.id),
                    true
                );

                RETURN QUERY SELECT
                    projeto_record.id,
                    0, 0, 0, 0,
                    true,
                    'YouTube não ativo'::TEXT;

                CONTINUE;
            END IF;

            -- 2. Verificar se tem integração válida
            IF NOT COALESCE(projeto_record.integracao_valida, false) THEN
                INSERT INTO system_logs (operation, details, success)
                VALUES (
                    'PIPELINE_SKIPPED',
                    format('Projeto %s pulado - Integração YouTube inválida', projeto_record.id),
                    true
                );

                RETURN QUERY SELECT
                    projeto_record.id,
                    0, 0, 0, 0,
                    true,
                    'Integração YouTube inválida'::TEXT;

                CONTINUE;
            END IF;

            -- 3. Verificar se tem Mentions disponíveis
            IF projeto_record.mentions <= 0 THEN
                INSERT INTO system_logs (operation, details, success)
                VALUES (
                    'PIPELINE_SKIPPED',
                    format('Projeto %s pulado - Sem Mentions disponíveis', projeto_record.id),
                    true
                );

                RETURN QUERY SELECT
                    projeto_record.id,
                    0, 0, 0, 0,
                    true,
                    'Sem Mentions disponíveis'::TEXT;

                CONTINUE;
            END IF;

            -- ============================================
            -- ETAPA 1: Calcular Ranking dos Canais
            -- ============================================
            INSERT INTO system_logs (operation, details, success)
            VALUES (
                'PIPELINE_STEP_1',
                format('Projeto %s: Calculando ranking de canais', projeto_record.id),
                true
            );

            SELECT * INTO v_ranking_result
            FROM calcular_ranking_canais_projeto(projeto_record.id);

            -- ============================================
            -- ETAPA 2: Monitorar Top Channels
            -- ============================================
            INSERT INTO system_logs (operation, details, success)
            VALUES (
                'PIPELINE_STEP_2',
                format('Projeto %s: Monitorando top channels', projeto_record.id),
                true
            );

            SELECT * INTO v_monitor_result
            FROM monitor_top_channels_for_project(projeto_record.id);

            -- ============================================
            -- Log Sucesso e Retorno
            -- ============================================
            INSERT INTO system_logs (operation, details, success)
            VALUES (
                'PIPELINE_SUCCESS',
                format('Projeto %s concluído - Ranqueados: %s, Processados: %s, Mensagens: %s',
                    projeto_record.id,
                    v_ranking_result.canais_atualizados,
                    v_monitor_result->>'channels_processed',
                    v_monitor_result->>'messages_created'
                ),
                true
            );

            RETURN QUERY SELECT
                projeto_record.id,
                v_ranking_result.canais_atualizados,
                (v_monitor_result->>'channels_processed')::INTEGER,
                (v_monitor_result->>'channels_skipped')::INTEGER,
                (v_monitor_result->>'messages_created')::INTEGER,
                true,
                NULL::TEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Log erro mas continua para próximo projeto
            INSERT INTO system_logs (operation, details, success)
            VALUES (
                'PIPELINE_ERROR',
                format('[ERROR] Projeto %s - Erro: %s (SQLSTATE: %s)',
                    projeto_record.id, SQLERRM, SQLSTATE),
                false
            );

            RETURN QUERY SELECT
                projeto_record.id,
                0, 0, 0, 0,
                false,
                SQLERRM;
        END;
    END LOOP;

    -- Log final do pipeline
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'PIPELINE_COMPLETE',
        'Pipeline completo de monitoramento YouTube finalizado',
        true
    );

END;
$$;

-- Comentário de documentação
COMMENT ON FUNCTION public.pipeline_monitoramento_completo() IS
'Pipeline completo de monitoramento YouTube que executa em sequência:
1. Calcula ranking_score e rank_position (calcular_ranking_canais_projeto)
2. Monitora top channels e processa vídeos (monitor_top_channels_for_project)
Processa todos os projetos com "Youtube Active" = TRUE.
Retorna estatísticas detalhadas por projeto processado.';

-- =============================================
-- COMO CRIAR O CRON JOB NO SUPABASE:
-- =============================================

/*
-- Executar no SQL Editor do Supabase:

SELECT cron.schedule(
    'pipeline_monitoramento_completo',
    '30 * /3 * * *',  -- A cada 3 horas com offset de 30min
    $$SELECT * FROM pipeline_monitoramento_completo()$$
);

-- Para verificar se o CRON foi criado:
SELECT * FROM cron.job WHERE jobname = 'pipeline_monitoramento_completo';

-- Para ver execuções recentes:
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'pipeline_monitoramento_completo')
ORDER BY start_time DESC
LIMIT 10;

-- Para desativar o CRON (se necessário):
SELECT cron.unschedule('pipeline_monitoramento_completo');
*/

-- =============================================
-- COMO TESTAR MANUALMENTE:
-- =============================================

/*
-- Executar pipeline completo para todos os projetos:
SELECT * FROM pipeline_monitoramento_completo();

-- Ver logs da execução:
SELECT
    operation,
    details,
    success,
    created_at
FROM system_logs
WHERE operation LIKE 'PIPELINE%'
ORDER BY created_at DESC
LIMIT 20;
*/
