-- =============================================
-- Função: get_lead_comments_for_processing
-- Descrição: Obtém comentários leads para processamento, incluindo informações do projeto, vídeo e comentário
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_lead_comments_for_processing(p_project_id bigint, p_limit integer DEFAULT 3, p_type integer DEFAULT 1)
 RETURNS TABLE(comment_id bigint, video_id bigint, comment_text text, author_name text, lead_score text, comment_like_count integer, project_description text, project_url text, project_name text, reply_count integer, video_title text, video_description text, video_view_count bigint, video_like_count bigint, video_comment_count bigint, video_hashtags text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        cp.id AS comment_id,
        cp.video_id,
        cp.text_display AS comment_text,
        cp.author_name,
        cp.lead_score,
        cp.like_count AS comment_like_count,
        p."description service" AS project_description,
        p."url service" AS project_url,
        p."Project name" AS project_name,
        cp.total_reply_count AS reply_count,
        v.video_title,
        v.video_description,
        v.view_count AS video_view_count,
        v.like_count AS video_like_count,
        v.comment_count AS video_comment_count,
        ARRAY(
            SELECT DISTINCT UNNEST(
                regexp_matches(v.video_description, '#\\w+', 'g')
            )
        ) AS video_hashtags
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
   WHERE s."Projeto_id" = p_project_id
AND cp.comentario_analizado = true
AND (cp.mensagem IS NULL OR cp.mensagem = false)
AND CASE
    WHEN p_type = 1 THEN -- Para LED
        cp.led = true  -- Movido para dentro do CASE
        AND CASE
            WHEN cp.lead_score ~ '^[0-9]+(\\.[0-9]+)?$' THEN cp.lead_score::numeric >= 6
            ELSE false
        END
    ELSE true -- Para engajamento traz todos
END
    ORDER BY
        RANDOM(),  -- Adicionado apenas esta linha para diversificar os vídeos
        CASE
            WHEN p_type = 1 THEN
                -- Ordenação para LED: maior score primeiro
                CASE
                    WHEN cp.lead_score ~ '^[0-9]+(\\.[0-9]+)?$' THEN cp.lead_score::numeric
                    ELSE 0
                END
            ELSE
                -- Ordenação para engajamento: menor score primeiro
                CASE
                    WHEN cp.lead_score ~ '^[0-9]+(\\.[0-9]+)?$' THEN -cp.lead_score::numeric
                    ELSE -999 -- Coloca no final os que não têm score numérico
                END
        END DESC,
        cp.like_count DESC
    LIMIT p_limit;
END;
$function$