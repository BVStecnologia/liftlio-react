-- =============================================
-- Função: process_monitored_videos
-- Descrição: Processa vídeos monitorados e cria comentários iniciais
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS process_monitored_videos();

CREATE OR REPLACE FUNCTION process_monitored_videos()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_video RECORD;
    v_before_value TEXT;
    v_after_value TEXT;
    v_processed_count INTEGER := 0;
    v_analyzed_count INTEGER := 0;
    v_commented_count INTEGER := 0;
    v_high_processed INTEGER := 0;
    v_results JSONB := '{"processed": [], "errors": [], "high_videos": []}';
    v_log_info JSONB;
    v_video_exists BOOLEAN;
BEGIN
    -- ETAPA 1: Processar vídeos monitorados que não foram analisados ainda
    FOR v_video IN
        SELECT v.id, v."VIDEO" as youtube_id, v.lead_potential
        FROM "Videos" v
        WHERE v.monitored = true
          AND (v.lead_potential IS NULL OR v.lead_potential = '')
        ORDER BY v.created_at DESC
        LIMIT 10
    LOOP
        v_processed_count := v_processed_count + 1;
        v_before_value := v_video.lead_potential;

        v_log_info := jsonb_build_object(
            'video_id', v_video.id,
            'youtube_id', v_video.youtube_id,
            'lead_potential_before', v_before_value
        );

        RAISE NOTICE 'Atualizando análise do vídeo ID % (YouTube ID: %)',
            v_video.id, v_video.youtube_id;

        BEGIN
            PERFORM update_video_analysis(v_video.id);
            v_analyzed_count := v_analyzed_count + 1;

            SELECT EXISTS(
                SELECT 1 FROM "Videos" WHERE id = v_video.id
            ) INTO v_video_exists;

            v_log_info := v_log_info || jsonb_build_object(
                'video_still_exists', v_video_exists
            );

            IF v_video_exists THEN
                SELECT lead_potential INTO v_after_value
                FROM "Videos"
                WHERE id = v_video.id;

                v_log_info := v_log_info || jsonb_build_object(
                    'lead_potential_after', v_after_value,
                    'changed', v_before_value IS DISTINCT FROM v_after_value
                );

                IF v_after_value = 'High' THEN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM "Mensagens"
                        WHERE video = v_video.id
                    ) THEN
                        BEGIN
                            -- CORREÇÃO: Adicionar ::INTEGER
                            PERFORM create_and_save_initial_comment(v_video.id::INTEGER);
                            v_commented_count := v_commented_count + 1;
                            v_log_info := v_log_info || jsonb_build_object(
                                'comment_created', true
                            );
                        EXCEPTION WHEN OTHERS THEN
                            v_log_info := v_log_info || jsonb_build_object(
                                'comment_created', false,
                                'comment_error', SQLERRM
                            );
                        END;
                    ELSE
                        v_log_info := v_log_info || jsonb_build_object(
                            'comment_exists', true
                        );
                    END IF;
                ELSE
                    v_log_info := v_log_info || jsonb_build_object(
                        'no_comment_needed', 'Lead potential is not High'
                    );
                END IF;
            ELSE
                v_log_info := v_log_info || jsonb_build_object(
                    'video_deleted', true,
                    'reason', 'Likely classified as Low potential'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_log_info := v_log_info || jsonb_build_object(
                'update_error', SQLERRM,
                'update_error_state', SQLSTATE
            );
        END;

        v_results := jsonb_set(
            v_results,
            '{processed}',
            (v_results->'processed') || to_jsonb(v_log_info)
        );
    END LOOP;

    -- ETAPA 2: Processar vídeos HIGH que não têm comentários
    RAISE NOTICE 'Iniciando processamento de vídeos High sem comentários...';

    FOR v_video IN
        SELECT v.id, v."VIDEO" as youtube_id, v.video_title
        FROM "Videos" v
        WHERE v.monitored = true
          AND v.lead_potential = 'High'
          AND NOT EXISTS (
              SELECT 1 FROM "Mensagens" m WHERE m.video = v_video.id
          )
        ORDER BY v.created_at DESC
        LIMIT 10
    LOOP
        v_high_processed := v_high_processed + 1;

        v_log_info := jsonb_build_object(
            'video_id', v_video.id,
            'youtube_id', v_video.youtube_id,
            'video_title', v_video.video_title,
            'action', 'creating_comment_for_high_video'
        );

        BEGIN
            -- CORREÇÃO: Adicionar ::INTEGER
            PERFORM create_and_save_initial_comment(v_video.id::INTEGER);
            v_commented_count := v_commented_count + 1;

            v_log_info := v_log_info || jsonb_build_object(
                'comment_created', true
            );

            RAISE NOTICE 'Comentário criado para vídeo High ID %', v_video.id;

        EXCEPTION WHEN OTHERS THEN
            v_log_info := v_log_info || jsonb_build_object(
                'comment_created', false,
                'comment_error', SQLERRM
            );

            v_results := jsonb_set(
                v_results,
                '{errors}',
                (v_results->'errors') || to_jsonb(v_log_info)
            );
            CONTINUE;
        END;

        v_results := jsonb_set(
            v_results,
            '{high_videos}',
            (v_results->'high_videos') || to_jsonb(v_log_info)
        );

        PERFORM pg_sleep(1);
    END LOOP;

    RETURN jsonb_build_object(
        'total_processed', v_processed_count,
        'videos_analyzed', v_analyzed_count,
        'high_videos_processed', v_high_processed,
        'comments_created', v_commented_count,
        'details', v_results
    );
END;
$$;