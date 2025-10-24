-- =============================================
-- Função: create_comments_for_analyzed_videos
-- Descrição: Cria comentários para vídeos que JÁ FORAM ANALISADOS como High mas não têm mensagens
--
-- Propósito:
--   - Catch-all para vídeos que foram analisados mas perderam mensagens
--   - Processar vídeos com análise completa (lead_potential = 'High - [explicação]')
--   - Complementa process_monitored_videos() sem interferir nela
--
-- Diferenças da process_monitored_videos:
--   - NÃO faz análise de vídeos (assume que já foram analisados)
--   - NÃO processa vídeos sem lead_potential
--   - USA LIKE 'High%' para pegar formato completo do lead_potential
--   - Foco apenas em criar mensagens
--
-- Criado: 2025-10-24
-- =============================================

DROP FUNCTION IF EXISTS create_comments_for_analyzed_videos();

CREATE OR REPLACE FUNCTION create_comments_for_analyzed_videos()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_video RECORD;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_results JSONB := '{"processed": [], "errors": []}';
    v_log_info JSONB;
BEGIN
    RAISE NOTICE 'Iniciando criação de comentários para vídeos High já analisados...';

    -- Buscar vídeos que:
    -- 1. Estão sendo monitorados (monitored = true)
    -- 2. JÁ FORAM ANALISADOS como High (lead_potential LIKE 'High%')
    -- 3. NÃO têm mensagens criadas ainda
    FOR v_video IN
        SELECT
            v.id,
            v."VIDEO" as youtube_id,
            v.video_title,
            v.lead_potential
        FROM "Videos" v
        WHERE v.monitored = true
          AND v.lead_potential LIKE 'High%'  -- ✅ Pega 'High' e 'High - [explicação]'
          AND NOT EXISTS (
              SELECT 1
              FROM "Mensagens" m
              WHERE m.video = v.id
          )
        ORDER BY v.created_at DESC
        LIMIT 10  -- Processar 10 vídeos por vez para evitar timeout
    LOOP
        v_processed_count := v_processed_count + 1;

        v_log_info := jsonb_build_object(
            'video_id', v_video.id,
            'youtube_id', v_video.youtube_id,
            'video_title', LEFT(v_video.video_title, 50),
            'lead_potential_preview', LEFT(v_video.lead_potential, 30)
        );

        RAISE NOTICE 'Criando comentário para vídeo High ID % (YouTube: %)',
            v_video.id, v_video.youtube_id;

        BEGIN
            -- Criar comentário usando a função validada
            PERFORM create_and_save_initial_comment(v_video.id::INTEGER);

            v_success_count := v_success_count + 1;
            v_log_info := v_log_info || jsonb_build_object(
                'status', 'success',
                'comment_created', true
            );

            RAISE NOTICE '✅ Comentário criado com sucesso para vídeo ID %', v_video.id;

            -- Adicionar ao array de processados
            v_results := jsonb_set(
                v_results,
                '{processed}',
                (v_results->'processed') || to_jsonb(v_log_info)
            );

        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;

            v_log_info := v_log_info || jsonb_build_object(
                'status', 'error',
                'comment_created', false,
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            );

            RAISE WARNING '❌ Erro ao criar comentário para vídeo ID %: %',
                v_video.id, SQLERRM;

            -- Adicionar ao array de erros
            v_results := jsonb_set(
                v_results,
                '{errors}',
                (v_results->'errors') || to_jsonb(v_log_info)
            );

            -- Continuar processando próximo vídeo mesmo com erro
            CONTINUE;
        END;

        -- Rate limiting: aguardar 1 segundo entre cada criação
        PERFORM pg_sleep(1);
    END LOOP;

    -- Retornar resumo da execução
    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'total_processed', v_processed_count,
            'success_count', v_success_count,
            'error_count', v_error_count,
            'timestamp', NOW()
        ),
        'details', v_results
    );
END;
$$;

-- =============================================
-- COMENTÁRIOS SOBRE USO:
-- =============================================
--
-- Esta função é ideal para rodar como cron job separado:
--
-- Sugestão de schedule:
--   */10 * * * *  (a cada 10 minutos)
--   ou
--   */15 * * * *  (a cada 15 minutos)
--
-- Comando do cron:
--   SELECT create_comments_for_analyzed_videos();
--
-- Exemplo de teste manual:
--   SELECT create_comments_for_analyzed_videos();
--
-- Retorno esperado:
--   {
--     "summary": {
--       "total_processed": 3,
--       "success_count": 3,
--       "error_count": 0,
--       "timestamp": "2025-10-24T19:45:00Z"
--     },
--     "details": {
--       "processed": [...],
--       "errors": []
--     }
--   }
--
-- =============================================
