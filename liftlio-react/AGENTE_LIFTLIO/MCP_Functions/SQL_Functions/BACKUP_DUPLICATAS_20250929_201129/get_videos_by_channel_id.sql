-- =============================================
-- Função: get_videos_by_channel_id
-- Descrição: Obtém vídeos de um canal específico
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_videos_by_channel_id(bigint);

CREATE OR REPLACE FUNCTION public.get_videos_by_channel_id(canal_id bigint)
 RETURNS TABLE(id bigint, nome_do_video text, descricao text, views bigint, commets bigint, target_audience text, content_category text, relevance_score double precision, video_id_youtube text, total_posts bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH channel_data AS (
        SELECT c.channel_id
        FROM public."Canais do youtube" c
        WHERE c.id = canal_id
    )
    SELECT
        v.id,
        v.video_title,
        v.video_description,
        v.view_count,
        v.comment_count,
        v.target_audience,
        v.content_category,
        v.relevance_score,
        v."VIDEO" AS video_id_youtube,
        COUNT(DISTINCT m.id) FILTER (WHERE m.respondido = true) AS total_posts  -- Contagem de posts
    FROM
        public."Videos" v
    JOIN
        channel_data cd ON v.channel_id_yotube = cd.channel_id
    LEFT JOIN
        public."Comentarios_Principais" cp ON cp.video_id = v.id
    LEFT JOIN
        public."Mensagens" m ON m."Comentario_Principais" = cp.id
    GROUP BY
        v.id, v.video_title, v.video_description, v.view_count, v.comment_count,
        v.target_audience, v.content_category, v.relevance_score, v."VIDEO"
    ORDER BY
        v.id;
END;
$function$;