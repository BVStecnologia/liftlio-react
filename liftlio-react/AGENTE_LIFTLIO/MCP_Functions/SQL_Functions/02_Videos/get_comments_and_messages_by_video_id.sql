-- =============================================
-- Função: get_comments_and_messages_by_video_id
-- Descrição: Obtém comentários e mensagens de um vídeo
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_comments_and_messages_by_video_id(bigint);

CREATE OR REPLACE FUNCTION public.get_comments_and_messages_by_video_id(p_video_id bigint)
 RETURNS TABLE(
    comment_id bigint,
    comment_text text,
    author_name text,
    published_at timestamp with time zone,
    like_count integer,
    message_id bigint,
    message_text text,
    message_type integer,
    message_created_at timestamp with time zone,
    responded boolean
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        cp.id as comment_id,
        cp.comment_text,
        cp.author_name,
        cp.published_at,
        cp.like_count,
        m.id as message_id,
        m.mensagem as message_text,
        m.tipo_msg as message_type,
        m.created_at as message_created_at,
        m.respondido as responded
    FROM
        public."Comentarios_Principais" cp
    LEFT JOIN
        public."Mensagens" m ON m."Comentario_Principais" = cp.id
    WHERE
        cp.video_id = p_video_id
    ORDER BY
        cp.published_at DESC,
        m.created_at DESC;
END;
$function$;