-- =============================================
-- Função: get_comments_and_messages_by_video_id
-- Descrição: Obtém comentários e suas mensagens associadas para um vídeo específico
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_comments_and_messages_by_video_id(video_id_param bigint)
 RETURNS TABLE(id_comentario bigint, author_name text, like_count integer, text_original text, total_reply_count integer, lead_score text, project_id bigint, justificativa_comentario character varying, id_mensagem bigint, mensagem text, respondido boolean, comentario_principal_id bigint, justificativa_mensagem character varying, proxima_postagem timestamp without time zone, status text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        cp.id AS id_comentario,
        cp.author_name,
        cp.like_count,
        cp.text_original,
        cp.total_reply_count,
        cp.lead_score,
        cp.project_id,
        cp.justificativa AS justificativa_comentario,
        m.id AS id_mensagem,
        m.mensagem,
        m.respondido,
        m."Comentario_Principais" AS comentario_principal_id,
        m.justificativa AS justificativa_mensagem,
        smp.proxima_postagem,
        smp.status
    FROM
        public."Comentarios_Principais" cp
    LEFT JOIN
        public."Mensagens" m ON m."Comentario_Principais" = cp.id
    LEFT JOIN
        public."Settings messages posts" smp ON smp."Comentarios_Principal" = cp.id AND smp."Mensagens" = m.id
    WHERE
        cp.video_id = video_id_param
    ORDER BY
        cp.id;
END;
$function$