-- =============================================
-- Função: create_initial_video_comment_with_claude
-- Descrição: Cria comentário inicial para vídeo usando Claude AI
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS create_initial_video_comment_with_claude(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION create_initial_video_comment_with_claude(
    p_video_id BIGINT,
    p_project_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_video_info RECORD;
    v_project_info RECORD;
    v_transcript TEXT;
    v_prompt TEXT;
    v_claude_response TEXT;
    v_result JSONB;
    v_message_id BIGINT;
BEGIN
    -- Buscar informações do vídeo
    SELECT
        v.id,
        v."VIDEO" as youtube_id,
        v.video_title,
        v.video_description,
        v.channel_id_yotube,
        vt.trancription
    INTO v_video_info
    FROM "Videos" v
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE v.id = p_video_id;

    IF v_video_info IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Video not found'
        );
    END IF;

    -- Buscar informações do projeto
    SELECT
        p."Project name",
        p."description service",
        p."Keywords",
        p."País",
        p.prompt_user
    INTO v_project_info
    FROM "Projeto" p
    WHERE p.id = p_project_id;

    -- Construir prompt para Claude
    v_prompt := format(
        'You are a YouTube viewer interested in %s topics. Create a natural, engaging comment for a new video.

Video Title: %s
Video Description: %s
Transcript excerpt: %s

Project Context:
- Product/Service: %s
- Keywords: %s
- Language: %s
- Special Instructions: %s

Create a monitoring comment that:
1. Shows genuine interest in the video content
2. References a specific timestamp from the video (format: 15:30)
3. Adds value to the discussion
4. Is authentic and conversational
5. Maximum 2-3 sentences

Respond with ONLY the comment text, nothing else.',
        v_project_info."Keywords",
        v_video_info.video_title,
        LEFT(v_video_info.video_description, 500),
        LEFT(COALESCE(v_video_info.trancription, 'No transcript available'), 1000),
        v_project_info."description service",
        v_project_info."Keywords",
        COALESCE(v_project_info."País", 'English'),
        COALESCE(v_project_info.prompt_user, 'Be natural and engaging')
    );

    -- Chamar Claude
    BEGIN
        SELECT claude_complete(
            v_prompt,
            'You are a YouTube viewer. Create a natural comment.',
            500,
            0.7
        ) INTO v_claude_response;
    EXCEPTION WHEN OTHERS THEN
        v_claude_response := NULL;
    END;

    -- Se Claude falhar, usar comentário padrão
    IF v_claude_response IS NULL OR v_claude_response = '' THEN
        v_claude_response := format(
            'Great insights in this video! The point at 2:45 about %s was particularly interesting. Looking forward to more content like this!',
            split_part(v_video_info.video_title, ' ', 3)
        );
    END IF;

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
        p_video_id,
        1, -- tipo_msg = 1 para monitoramento
        v_claude_response,
        false,
        NOW()
    ) RETURNING id INTO v_message_id;

    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', true,
        'message_id', v_message_id,
        'video_id', p_video_id,
        'comment', v_claude_response,
        'timestamp', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'video_id', p_video_id
        );
END;
$$;