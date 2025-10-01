-- =============================================
-- Função: create_monitoring_message
-- Descrição: Cria mensagem de monitoramento para um vídeo
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS create_monitoring_message(INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_monitoring_message(
    p_project_id INTEGER,
    p_video_youtube_id TEXT,
    p_channel_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_video_id BIGINT;
    v_message_id BIGINT;
    v_result JSONB;
BEGIN
    -- Buscar ID do vídeo
    SELECT id INTO v_video_id
    FROM "Videos"
    WHERE "VIDEO" = p_video_youtube_id;

    IF v_video_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Video not found',
            'video_youtube_id', p_video_youtube_id
        );
    END IF;

    -- Verificar se já existe mensagem de monitoramento
    IF EXISTS (
        SELECT 1 FROM "Mensagens"
        WHERE project_id = p_project_id
          AND video = v_video_id
          AND tipo_msg = 1
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Monitoring message already exists',
            'video_id', v_video_id
        );
    END IF;

    -- Criar mensagem de monitoramento usando Claude
    SELECT create_initial_video_comment_with_claude(v_video_id, p_project_id) INTO v_result;

    IF (v_result->>'success')::boolean THEN
        RETURN v_result;
    ELSE
        -- Se Claude falhar, criar mensagem padrão
        INSERT INTO "Mensagens" (
            project_id,
            video,
            tipo_msg,
            mensagem,
            respondido,
            created_at
        ) VALUES (
            p_project_id,
            v_video_id,
            1,
            'Monitoring new video release',
            false,
            NOW()
        ) RETURNING id INTO v_message_id;

        RETURN jsonb_build_object(
            'success', true,
            'message_id', v_message_id,
            'video_id', v_video_id,
            'fallback', true
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;