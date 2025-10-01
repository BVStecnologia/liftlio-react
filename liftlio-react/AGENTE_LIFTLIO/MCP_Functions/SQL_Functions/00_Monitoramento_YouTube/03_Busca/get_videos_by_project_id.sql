-- =============================================
-- Função: get_videos_by_project_id
-- Descrição: Obtém vídeos de um projeto com paginação
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS get_videos_by_project_id(BIGINT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_videos_by_project_id(
    projeto_id bigint,
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 10
)
RETURNS TABLE(
    id bigint,
    nome_do_video text,
    descricao text,
    views bigint,
    commets bigint,
    target_audience text,
    content_category text,
    relevance_score double precision,
    video_id_youtube text,
    total_posts bigint,
    canal_nome text,
    total_registros bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INT;
    v_total_registros BIGINT;
BEGIN
    v_offset := (page_number - 1) * page_size;

    -- Contagem total com a nova lógica
    SELECT COUNT(*) INTO v_total_registros
    FROM (
        SELECT v.id
        FROM public."Videos" v
        JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
        LEFT JOIN public."Canais do youtube" c ON v.channel_id_yotube = c.channel_id
        LEFT JOIN public."Comentarios_Principais" cp ON cp.video_id = v.id
        LEFT JOIN public."Mensagens" m ON m."Comentario_Principais" = cp.id
        WHERE
            s."Projeto_id" = projeto_id OR  -- Mudando AND para OR
            c."Projeto" = projeto_id
        GROUP BY v.id
        HAVING
            COUNT(DISTINCT m.id) FILTER (WHERE m.respondido = true) >= 1
    ) AS subquery;

    -- Query principal com OR ao invés de AND
    RETURN QUERY
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
        COUNT(DISTINCT m.id) FILTER (WHERE m.respondido = true) AS total_posts,
        c."Nome" AS canal_nome,
        v_total_registros
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    LEFT JOIN public."Canais do youtube" c ON v.channel_id_yotube = c.channel_id
    LEFT JOIN public."Comentarios_Principais" cp ON cp.video_id = v.id
    LEFT JOIN public."Mensagens" m ON m."Comentario_Principais" = cp.id
    WHERE
        s."Projeto_id" = projeto_id OR  -- Mudança principal: AND para OR
        c."Projeto" = projeto_id
    GROUP BY
        v.id, v.video_title, v.video_description, v.view_count, v.comment_count,
        v.target_audience, v.content_category, v.relevance_score, v."VIDEO", c."Nome"
    HAVING
        COUNT(DISTINCT m.id) FILTER (WHERE m.respondido = true) >= 1
    ORDER BY
        total_posts DESC,
        v.created_at DESC,
        v.relevance_score DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;