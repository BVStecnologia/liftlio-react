-- =============================================
-- Função: process_channel_videos
-- Descrição: Processa vídeos de um canal específico
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS process_channel_videos(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION process_channel_videos(
    p_channel_id TEXT,
    p_project_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_videos_processed INTEGER := 0;
    v_messages_created INTEGER := 0;
    v_video RECORD;
BEGIN
    -- Processar vídeos recentes do canal
    FOR v_video IN
        SELECT
            v.id,
            v."VIDEO" as video_id,
            v.video_title,
            v.published_at
        FROM "Videos" v
        WHERE v.channel_id_yotube = p_channel_id
          AND v.published_at >= NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
              SELECT 1 FROM "Mensagens" m
              WHERE m.video = v.id
                AND m.project_id = p_project_id
                AND m.tipo_msg = 1
          )
        ORDER BY v.published_at DESC
        LIMIT 5
    LOOP
        v_videos_processed := v_videos_processed + 1;

        -- Criar mensagem de monitoramento
        INSERT INTO "Mensagens" (
            project_id,
            video,
            tipo_msg,
            mensagem,
            respondido,
            created_at
        ) VALUES (
            p_project_id,
            v_video.id,
            1, -- tipo_msg = 1 para monitoramento
            'Monitoring comment for video: ' || v_video.video_title,
            false,
            NOW()
        );

        v_messages_created := v_messages_created + 1;
    END LOOP;

    v_result := jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'project_id', p_project_id,
        'videos_processed', v_videos_processed,
        'messages_created', v_messages_created,
        'timestamp', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'channel_id', p_channel_id,
            'project_id', p_project_id
        );
END;
$$ LANGUAGE plpgsql;