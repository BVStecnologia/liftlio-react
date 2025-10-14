-- =============================================
-- Função: delete_video_cascade
-- Descrição: Deleta vídeo e todas suas dependências em cascata
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.delete_video_cascade(bigint);

CREATE OR REPLACE FUNCTION public.delete_video_cascade(p_video_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_deleted_comments INTEGER := 0;
    v_deleted_messages INTEGER := 0;
    v_deleted_embeddings INTEGER := 0;
    v_deleted_analytics INTEGER := 0;
    v_youtube_id TEXT;
BEGIN
    -- Verificar se vídeo existe
    SELECT youtube_id INTO v_youtube_id
    FROM public."Videos"
    WHERE id = p_video_id;

    IF v_youtube_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Vídeo não encontrado'
        );
    END IF;

    -- Deletar mensagens relacionadas aos comentários
    DELETE FROM public."Mensagens" m
    WHERE EXISTS (
        SELECT 1 FROM public."Comentarios_Principais" c
        WHERE c.id = m."Comentario_Principais"
        AND c.video_id = p_video_id
    );
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    -- Deletar comentários
    DELETE FROM public."Comentarios_Principais"
    WHERE video_id = p_video_id;
    GET DIAGNOSTICS v_deleted_comments = ROW_COUNT;

    -- Deletar embeddings
    DELETE FROM public."Video_Embeddings"
    WHERE video_id = p_video_id;
    GET DIAGNOSTICS v_deleted_embeddings = ROW_COUNT;

    -- Deletar analytics
    DELETE FROM public."Video_Analytics"
    WHERE video_id = p_video_id;
    GET DIAGNOSTICS v_deleted_analytics = ROW_COUNT;

    -- Deletar o vídeo
    DELETE FROM public."Videos"
    WHERE id = p_video_id;

    -- Registrar log
    INSERT INTO public."System_Logs" (
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) VALUES (
        'delete_cascade',
        'video',
        p_video_id,
        jsonb_build_object(
            'youtube_id', v_youtube_id,
            'deleted_comments', v_deleted_comments,
            'deleted_messages', v_deleted_messages,
            'deleted_embeddings', v_deleted_embeddings,
            'deleted_analytics', v_deleted_analytics
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'video_id', p_video_id,
        'youtube_id', v_youtube_id,
        'deleted', jsonb_build_object(
            'comments', v_deleted_comments,
            'messages', v_deleted_messages,
            'embeddings', v_deleted_embeddings,
            'analytics', v_deleted_analytics
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$function$;