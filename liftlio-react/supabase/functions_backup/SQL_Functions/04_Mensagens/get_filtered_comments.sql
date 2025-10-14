-- =============================================
-- Função: get_filtered_comments
-- Descrição: Filtra e retorna os melhores comentários por relevância, removendo duplicatas e spam
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_filtered_comments(video_id_param bigint)
 RETURNS TABLE(comment_id bigint, comment_youtube_id text, comment_text text, comment_author text, comment_published_at timestamp with time zone, comment_likes integer, comment_relevance_score double precision)
 LANGUAGE plpgsql
AS $function$
DECLARE
    selected_ids bigint[];
    total_comments integer;
    project_id bigint;
BEGIN
    -- 1. Selecionar IDs dos melhores comentários
    selected_ids := ARRAY(
        WITH ranked_comments AS (
            SELECT
                cp.id,
                cp.published_at,
                (
                    COALESCE(cp.like_count::float, 0) * 0.3 +
                    (CASE
                        WHEN LENGTH(cp.text_display) BETWEEN 50 AND 500 THEN 30.0
                        WHEN LENGTH(cp.text_display) > 500 THEN 20.0
                        ELSE 10.0
                    END) +
                    (CASE
                        WHEN cp.published_at > NOW() - INTERVAL '30 days' THEN 20.0
                        WHEN cp.published_at > NOW() - INTERVAL '90 days' THEN 10.0
                        ELSE 5.0
                    END)
                )::float as relevance_score
            FROM "Comentarios_Principais" cp
            WHERE
                cp.video_id = video_id_param
                AND cp.text_display IS NOT NULL
                AND LENGTH(TRIM(cp.text_display)) > 20
                AND cp.text_display NOT ILIKE '%http%'
                AND cp.text_display NOT ILIKE '%www%'
                AND cp.text_display NOT ILIKE '%@%'
                AND NOT EXISTS (
                    SELECT 1
                    FROM "Comentarios_Principais" cp2
                    WHERE cp2.video_id = video_id_param
                    AND cp2.author_name = cp.author_name
                    AND cp2.id < cp.id
                )
        )
        SELECT id
        FROM ranked_comments
        ORDER BY relevance_score DESC, published_at DESC
        LIMIT 100
    );

    -- 2. Deletar registros em Settings se existirem
    IF EXISTS (
        SELECT 1
        FROM "Settings messages posts"
        WHERE "Videos" = video_id_param
    ) THEN
        DELETE FROM "Settings messages posts"
        WHERE "Videos" = video_id_param
        AND "Comentarios_Principal" IN (
            SELECT id
            FROM "Comentarios_Principais"
            WHERE video_id = video_id_param
            AND id != ALL(selected_ids)
        );
    END IF;

    -- 3. Deletar respostas
    DELETE FROM "Respostas_Comentarios" rc
    WHERE rc.comment_id IN (
        SELECT id
        FROM "Comentarios_Principais"
        WHERE video_id = video_id_param
        AND id != ALL(selected_ids)
    );

    -- 4. Deletar comentários principais
    DELETE FROM "Comentarios_Principais"
    WHERE video_id = video_id_param
    AND id != ALL(selected_ids);

    -- 5. Atualizar contagem
    SELECT COUNT(*) INTO total_comments
    FROM "Comentarios_Principais"
    WHERE video_id = video_id_param;

    UPDATE "Videos"
    SET comment_count = total_comments
    WHERE id = video_id_param;

    -- 6. Retornar resultados
    RETURN QUERY
    SELECT
        cp.id as comment_id,
        cp.id_do_comentario as comment_youtube_id,
        cp.text_display as comment_text,
        cp.author_name as comment_author,
        cp.published_at as comment_published_at,
        cp.like_count as comment_likes,
        (
            COALESCE(cp.like_count::float, 0) * 0.3 +
            (CASE
                WHEN LENGTH(cp.text_display) BETWEEN 50 AND 500 THEN 30.0
                WHEN LENGTH(cp.text_display) > 500 THEN 20.0
                ELSE 10.0
            END) +
            (CASE
                WHEN cp.published_at > NOW() - INTERVAL '30 days' THEN 20.0
                WHEN cp.published_at > NOW() - INTERVAL '90 days' THEN 10.0
                ELSE 5.0
            END)
        )::float as comment_relevance_score
    FROM "Comentarios_Principais" cp
    WHERE cp.id = ANY(selected_ids)
    ORDER BY comment_relevance_score DESC, comment_published_at DESC;
END;
$function$