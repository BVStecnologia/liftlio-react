-- =============================================
-- Função: create_initial_video_comment_with_claude
-- Descrição: Cria comentário inicial para vídeo usando Claude
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.create_initial_video_comment_with_claude(bigint);

CREATE OR REPLACE FUNCTION public.create_initial_video_comment_with_claude(p_video_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_record RECORD;
    v_claude_response TEXT;
    v_comment_text TEXT;
    v_comment_id BIGINT;
BEGIN
    -- Buscar dados do vídeo
    SELECT
        v.id,
        v.youtube_id,
        v.title,
        v.description,
        v.channel_title,
        v.transcript_text,
        p.nome as project_name,
        p.keywords
    INTO v_video_record
    FROM public."Videos" v
    LEFT JOIN public."Projeto" p ON v.project_id = p.id
    WHERE v.id = p_video_id
    LIMIT 1;

    IF v_video_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Vídeo não encontrado'
        );
    END IF;

    -- Verificar se já existe comentário inicial
    IF EXISTS (
        SELECT 1 FROM public."Comentarios_Principais"
        WHERE video_id = p_video_id
        AND is_initial_comment = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Comentário inicial já existe para este vídeo'
        );
    END IF;

    -- Gerar comentário com Claude
    SELECT public.ask_claude_with_context(
        format(
            'Crie um comentário engajador para o vídeo "%s" do canal %s. ' ||
            'O comentário deve ser natural, relevante ao conteúdo e promover interação. ' ||
            'Projeto: %s. Keywords: %s. ' ||
            'Retorne APENAS o texto do comentário, sem formatação adicional.',
            v_video_record.title,
            v_video_record.channel_title,
            COALESCE(v_video_record.project_name, 'Liftlio'),
            COALESCE(v_video_record.keywords, '')
        ),
        jsonb_build_object(
            'description', LEFT(v_video_record.description, 1000),
            'transcript', LEFT(COALESCE(v_video_record.transcript_text, ''), 3000)
        )::text
    ) INTO v_claude_response;

    -- Limpar resposta
    v_comment_text := TRIM(v_claude_response);

    -- Validar comprimento
    IF LENGTH(v_comment_text) < 10 OR LENGTH(v_comment_text) > 1000 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Comentário gerado com tamanho inválido'
        );
    END IF;

    -- Inserir comentário
    INSERT INTO public."Comentarios_Principais" (
        video_id,
        youtube_id,
        comment_text,
        author_name,
        author_channel_id,
        is_initial_comment,
        generated_by_ai,
        created_at
    ) VALUES (
        p_video_id,
        v_video_record.youtube_id,
        v_comment_text,
        'Liftlio Assistant',
        'liftlio_ai',
        true,
        true,
        NOW()
    ) RETURNING id INTO v_comment_id;

    RETURN jsonb_build_object(
        'success', true,
        'comment_id', v_comment_id,
        'video_id', p_video_id,
        'comment_text', v_comment_text
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$function$;