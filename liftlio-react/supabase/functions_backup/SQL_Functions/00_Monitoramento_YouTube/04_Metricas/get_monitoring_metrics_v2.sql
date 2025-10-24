-- =============================================
-- Função: get_monitoring_metrics_v2 (CORRIGIDA)
-- Descrição: Retorna métricas detalhadas do sistema de monitoramento
-- Criado: 2025-01-24
-- Atualizado: 2025-01-24 12:00 - Correção nomes exatos das tabelas
-- Autor: Claude Code (Anthropic)
-- =============================================
-- IMPORTANTE: Função READ-ONLY, não modifica dados
-- 100% compatível com estrutura JSONB existente
-- NOMES EXATOS: "Canais do youtube", "Projeto", "Mensagens"
-- =============================================

DROP FUNCTION IF EXISTS get_monitoring_metrics_v2(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_monitoring_metrics_v2(
    p_project_id INTEGER,
    p_language TEXT DEFAULT 'pt'  -- 'pt' para português, 'en' para inglês
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_today_start TIMESTAMPTZ;
    v_week_start TIMESTAMPTZ;
    v_month_start TIMESTAMPTZ;
BEGIN
    -- Define períodos temporais
    v_today_start := CURRENT_DATE::TIMESTAMPTZ;
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::TIMESTAMPTZ;
    v_month_start := DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMPTZ;

    WITH metrics AS (
        -- ====================================
        -- MÉTRICAS TOTAIS (All-time)
        -- ====================================
        SELECT
            -- Total de vídeos analisados (únicos)
            (SELECT COUNT(DISTINCT elem->>'id')
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND c.videos_scanreados IS NOT NULL
               AND c.videos_scanreados != ''
            ) as total_analyzed,

            -- Vídeos aprovados (total)
            (SELECT COUNT(*)
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND elem->>'status' = 'APPROVED'
            ) as total_approved,

            -- Vídeos rejeitados (total)
            (SELECT COUNT(*)
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND elem->>'status' = 'REJECTED'
            ) as total_rejected,

            -- ====================================
            -- MÉTRICAS DE HOJE
            -- ====================================
            -- Vídeos analisados hoje (baseado em analyzed_at quando disponível, senão last_canal_check)
            (SELECT COUNT(DISTINCT elem->>'id')
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND (
                   -- Prioriza analyzed_at quando disponível
                   (elem->>'analyzed_at' IS NOT NULL AND (elem->>'analyzed_at')::timestamptz >= v_today_start)
                   OR
                   -- Fallback para last_canal_check
                   (elem->>'analyzed_at' IS NULL AND c.last_canal_check >= v_today_start)
               )
            ) as analyzed_today,

            -- Aprovados hoje
            (SELECT COUNT(*)
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND (
                   (elem->>'analyzed_at' IS NOT NULL AND (elem->>'analyzed_at')::timestamptz >= v_today_start)
                   OR
                   (elem->>'analyzed_at' IS NULL AND c.last_canal_check >= v_today_start)
               )
               AND elem->>'status' = 'APPROVED'
            ) as approved_today,

            -- Rejeitados hoje
            (SELECT COUNT(*)
             FROM "Canais do youtube" c,
                  LATERAL jsonb_array_elements(
                      CASE
                          WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                          THEN '[]'::jsonb
                          ELSE c.videos_scanreados::jsonb
                      END
                  ) elem
             WHERE c."Projeto" = p_project_id
               AND (
                   (elem->>'analyzed_at' IS NOT NULL AND (elem->>'analyzed_at')::timestamptz >= v_today_start)
                   OR
                   (elem->>'analyzed_at' IS NULL AND c.last_canal_check >= v_today_start)
               )
               AND elem->>'status' = 'REJECTED'
            ) as rejected_today,

            -- ====================================
            -- MÉTRICAS DE CANAIS
            -- ====================================
            -- Canais ativos
            (SELECT COUNT(*)
             FROM "Canais do youtube" c
             WHERE c."Projeto" = p_project_id
               AND c.is_active = true
            ) as active_channels,

            -- Limite de canais do projeto
            (SELECT p.qtdmonitoramento
             FROM "Projeto" p
             WHERE p.id = p_project_id
            ) as max_channels,

            -- ====================================
            -- MÉTRICAS DE COMENTÁRIOS
            -- ====================================
            -- Comentários pendentes
            (SELECT COUNT(*)
             FROM "Mensagens" m
             WHERE m.project_id = p_project_id
               AND m.respondido = false
            ) as comments_pending,

            -- Comentários postados
            (SELECT COUNT(*)
             FROM "Mensagens" m
             WHERE m.project_id = p_project_id
               AND m.respondido = true
            ) as comments_posted,

            -- ====================================
            -- ÚLTIMA ATIVIDADE
            -- ====================================
            -- Último scan
            (SELECT MAX(last_canal_check)
             FROM "Canais do youtube" c
             WHERE c."Projeto" = p_project_id
            ) as last_scan,

            -- ====================================
            -- FILA DE PROCESSAMENTO
            -- ====================================
            -- Vídeos na fila aguardando análise
            (SELECT COUNT(*)
             FROM (
                SELECT unnest(string_to_array(videos_para_scann, ',')) as video_id
                FROM "Canais do youtube" c
                WHERE c."Projeto" = p_project_id
                  AND videos_para_scann IS NOT NULL
                  AND videos_para_scann != ''
             ) t
            ) as queue_pending,

            -- Vídeos aguardando processamento (campo processar)
            (SELECT COUNT(*)
             FROM (
                SELECT unnest(string_to_array(processar, ',')) as video_id
                FROM "Canais do youtube" c
                WHERE c."Projeto" = p_project_id
                  AND processar IS NOT NULL
                  AND processar != ''
             ) t
            ) as queue_to_process
    ),

    -- ====================================
    -- TOP MOTIVOS DE REJEIÇÃO (BILÍNGUE)
    -- ====================================
    rejection_reasons AS (
        SELECT
            CASE
                WHEN p_language = 'en' AND elem->>'reason' IS NOT NULL
                THEN elem->>'reason'
                ELSE elem->>'motivo'
            END as motivo,
            elem->>'motivo' as motivo_pt,
            elem->>'reason' as reason_en,
            COUNT(*) as count
        FROM "Canais do youtube" c,
             LATERAL jsonb_array_elements(
                 CASE
                     WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                     THEN '[]'::jsonb
                     ELSE c.videos_scanreados::jsonb
                 END
             ) elem
        WHERE c."Projeto" = p_project_id
          AND elem->>'status' = 'REJECTED'
          AND elem->>'motivo' IS NOT NULL
        GROUP BY elem->>'motivo', elem->>'reason'
        ORDER BY COUNT(*) DESC
        LIMIT 5
    )

    -- ====================================
    -- CONSTRUIR RESULTADO FINAL
    -- ====================================
    SELECT jsonb_build_object(
        -- Identificação
        'project_id', p_project_id,
        'generated_at', NOW(),
        'language', p_language,

        -- Cards principais (4 métricas chave)
        'cards', jsonb_build_object(
            'analysis_activity', jsonb_build_object(
                'today', COALESCE(analyzed_today, 0),
                'total', COALESCE(total_analyzed, 0),
                'label', CASE
                    WHEN p_language = 'en' THEN 'ANALYSIS ACTIVITY'
                    ELSE 'ATIVIDADE DE ANÁLISE'
                END,
                'subtitle', CASE
                    WHEN p_language = 'en' THEN 'Video qualification pipeline'
                    ELSE 'Pipeline de qualificação de vídeos'
                END
            ),

            'ai_precision', jsonb_build_object(
                'approval_rate', CASE
                    WHEN (total_approved + total_rejected) > 0
                    THEN ROUND((total_approved::NUMERIC / NULLIF(total_approved + total_rejected, 0)) * 100, 1)
                    ELSE 0
                END,
                'approved', COALESCE(total_approved, 0),
                'total_processed', COALESCE(total_approved + total_rejected, 0),
                'label', CASE
                    WHEN p_language = 'en' THEN 'AI PRECISION'
                    ELSE 'PRECISÃO IA'
                END,
                'subtitle', CASE
                    WHEN p_language = 'en' THEN 'Quality over quantity'
                    ELSE 'Qualidade sobre quantidade'
                END
            ),

            'engagement_status', jsonb_build_object(
                'pending', COALESCE(comments_pending, 0),
                'posted', COALESCE(comments_posted, 0),
                'label', CASE
                    WHEN p_language = 'en' THEN 'ENGAGEMENT STATUS'
                    ELSE 'STATUS ENGAJAMENTO'
                END,
                'subtitle', CASE
                    WHEN p_language = 'en' THEN 'Comments lifecycle'
                    ELSE 'Ciclo de vida dos comentários'
                END
            ),

            'monitoring_health', jsonb_build_object(
                'active_channels', COALESCE(active_channels, 0),
                'max_channels', COALESCE(max_channels, 30),
                'last_scan', last_scan,
                'last_scan_ago', CASE
                    WHEN last_scan IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (NOW() - last_scan))::INT
                    ELSE NULL
                END,
                'label', CASE
                    WHEN p_language = 'en' THEN 'MONITORING HEALTH'
                    ELSE 'SAÚDE DO MONITORAMENTO'
                END,
                'subtitle', CASE
                    WHEN p_language = 'en' THEN 'System pulse'
                    ELSE 'Pulso do sistema'
                END
            )
        ),

        -- Métricas detalhadas
        'details', jsonb_build_object(
            'today', jsonb_build_object(
                'analyzed', COALESCE(analyzed_today, 0),
                'approved', COALESCE(approved_today, 0),
                'rejected', COALESCE(rejected_today, 0),
                'approval_rate', CASE
                    WHEN (approved_today + rejected_today) > 0
                    THEN ROUND((approved_today::NUMERIC / NULLIF(approved_today + rejected_today, 0)) * 100, 1)
                    ELSE 0
                END
            ),

            'total', jsonb_build_object(
                'analyzed', COALESCE(total_analyzed, 0),
                'approved', COALESCE(total_approved, 0),
                'rejected', COALESCE(total_rejected, 0),
                'channels_monitored', COALESCE(active_channels, 0),
                'comments_posted', COALESCE(comments_posted, 0),
                'comments_pending', COALESCE(comments_pending, 0)
            ),

            'queue', jsonb_build_object(
                'awaiting_analysis', COALESCE(queue_pending, 0),
                'awaiting_processing', COALESCE(queue_to_process, 0)
            ),

            'top_rejection_reasons', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'reason', motivo,
                        'reason_pt', motivo_pt,
                        'reason_en', reason_en,
                        'count', count,
                        'percentage', ROUND((count::NUMERIC / NULLIF(total_rejected, 0)) * 100, 1)
                    )
                    ORDER BY count DESC
                ) FROM rejection_reasons),
                '[]'::jsonb
            ),

            -- Últimos vídeos analisados (bilíngue)
            'recent_analyzed_videos', COALESCE(
                (SELECT jsonb_agg(video_data ORDER BY analyzed_timestamp DESC)
                 FROM (
                     SELECT jsonb_build_object(
                         'video_id', elem->>'id',
                         'status', elem->>'status',
                         'motivo_pt', elem->>'motivo',
                         'reason_en', elem->>'reason',
                         'score', (elem->>'score')::numeric,
                         'tags', elem->'tags',
                         'analyzed_at', elem->>'analyzed_at',
                         'channel_name', c."Nome"
                     ) as video_data,
                     CASE
                         WHEN elem->>'analyzed_at' IS NOT NULL
                         THEN (elem->>'analyzed_at')::timestamptz
                         ELSE c.last_canal_check
                     END as analyzed_timestamp
                     FROM "Canais do youtube" c,
                          LATERAL jsonb_array_elements(
                              CASE
                                  WHEN c.videos_scanreados IS NULL OR c.videos_scanreados = ''
                                  THEN '[]'::jsonb
                                  ELSE c.videos_scanreados::jsonb
                              END
                          ) elem
                     WHERE c."Projeto" = p_project_id
                       AND c.videos_scanreados IS NOT NULL
                       AND c.videos_scanreados != ''
                     ORDER BY analyzed_timestamp DESC
                     LIMIT 10
                 ) recent_videos
                ),
                '[]'::jsonb
            )
        ),

        -- Indicadores de saúde
        'health_indicators', jsonb_build_object(
            'is_active', CASE
                WHEN last_scan IS NOT NULL AND last_scan > NOW() - INTERVAL '1 hour'
                THEN true
                ELSE false
            END,
            'channel_usage_percentage', CASE
                WHEN max_channels > 0
                THEN ROUND((active_channels::NUMERIC / max_channels) * 100, 1)
                ELSE 0
            END,
            'has_pending_items', CASE
                WHEN queue_pending > 0 OR queue_to_process > 0
                THEN true
                ELSE false
            END
        )
    ) INTO v_result
    FROM metrics;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retorna estrutura vazia mas válida
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'sqlstate', SQLSTATE,
            'cards', jsonb_build_object(
                'analysis_activity', jsonb_build_object('today', 0, 'total', 0),
                'ai_precision', jsonb_build_object('approval_rate', 0, 'approved', 0, 'total_processed', 0),
                'engagement_status', jsonb_build_object('pending', 0, 'posted', 0),
                'monitoring_health', jsonb_build_object('active_channels', 0, 'max_channels', 0)
            )
        );
END;
$$;

-- =============================================
-- COMENTÁRIO PARA DOCUMENTAÇÃO
-- =============================================
COMMENT ON FUNCTION get_monitoring_metrics_v2(INTEGER, TEXT) IS
'Retorna métricas completas do sistema de monitoramento YouTube.
CORRIGIDA: Usa nomes exatos das tabelas ("Canais do youtube", "Projeto", "Mensagens").
Suporta bilíngue (pt/en), métricas totais + hoje, motivos de rejeição, saúde do sistema.
Uso: SELECT get_monitoring_metrics_v2(117, ''pt'');';

-- =============================================
-- EXEMPLO DE USO:
-- =============================================
-- SELECT get_monitoring_metrics_v2(117, 'pt');  -- Português
-- SELECT get_monitoring_metrics_v2(117, 'en');  -- Inglês
--
-- RETORNO ESPERADO:
-- {
--   "project_id": 117,
--   "generated_at": "2025-01-24T10:30:00Z",
--   "language": "pt",
--   "cards": {
--     "analysis_activity": {
--       "today": 2,
--       "total": 2,
--       "label": "ATIVIDADE DE ANÁLISE",
--       "subtitle": "Pipeline de qualificação de vídeos"
--     },
--     "ai_precision": {
--       "approval_rate": 0.0,
--       "approved": 0,
--       "total_processed": 2,
--       "label": "PRECISÃO IA",
--       "subtitle": "Qualidade sobre quantidade"
--     },
--     "engagement_status": {
--       "pending": 54,
--       "posted": 20,
--       "label": "STATUS ENGAJAMENTO",
--       "subtitle": "Ciclo de vida dos comentários"
--     },
--     "monitoring_health": {
--       "active_channels": 6,
--       "max_channels": 30,
--       "last_scan": "2025-01-24T11:08:00Z",
--       "last_scan_ago": 3120,
--       "label": "SAÚDE DO MONITORAMENTO",
--       "subtitle": "Pulso do sistema"
--     }
--   },
--   "details": {
--     "today": {
--       "analyzed": 2,
--       "approved": 0,
--       "rejected": 2,
--       "approval_rate": 0.0
--     },
--     "total": {
--       "analyzed": 2,
--       "approved": 0,
--       "rejected": 2,
--       "channels_monitored": 6,
--       "comments_posted": 20,
--       "comments_pending": 54
--     },
--     "queue": {
--       "awaiting_analysis": 0,
--       "awaiting_processing": 0
--     },
--     "top_rejection_reasons": [
--       {
--         "reason": "Anúncios UGC pagos (oposto de marketing orgânico)",
--         "reason_pt": "Anúncios UGC pagos (oposto de marketing orgânico)",
--         "reason_en": "Paid UGC ads (opposite of organic marketing)",
--         "count": 1,
--         "percentage": 50.0
--       }
--     ]
--   },
--   "health_indicators": {
--     "is_active": false,
--     "channel_usage_percentage": 20.0,
--     "has_pending_items": false
--   }
-- }
-- =============================================
