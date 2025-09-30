-- =============================================
-- Função: obter_mensagens_com_video
-- Descrição: Obtém mensagens com informações de vídeo e canal
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.obter_mensagens_com_video(bigint, integer, integer);

CREATE OR REPLACE FUNCTION public.obter_mensagens_com_video(projeto_id bigint DEFAULT NULL::bigint, page_number integer DEFAULT 1, page_size integer DEFAULT 10)
 RETURNS TABLE(mensagem_id bigint, mensagem_texto text, mensagem_data timestamp with time zone, mensagem_respondido boolean, video_id bigint, video_youtube_id text, video_titulo text, video_visualizacoes bigint, video_likes bigint, video_comentarios bigint, canal_id bigint, canal_nome text, canal_youtube_id text, canal_inscritos integer, canal_visualizacoes bigint, total_registros bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INT;
    v_total_registros BIGINT;
    v_where TEXT;
BEGIN
    -- Cálculo do offset para paginação
    v_offset := (page_number - 1) * page_size;

    -- Construir a cláusula WHERE com base nos parâmetros
    IF projeto_id IS NOT NULL THEN
        -- Contagem total para projeto específico com vídeo não nulo
        SELECT COUNT(*) INTO v_total_registros
        FROM public."Mensagens" m
        WHERE m.video IS NOT NULL AND m.project_id = projeto_id;

        -- Query para projeto específico
        RETURN QUERY
        SELECT
            m.id,
            m.mensagem,
            m.created_at,
            m.respondido,
            v.id,
            v."VIDEO",
            v.video_title,
            v.view_count,
            v.like_count,
            v.comment_count,
            c.id,
            c."Nome",
            c.channel_id,
            c.subscriber_count,
            c.view_count,
            v_total_registros
        FROM
            public."Mensagens" m
            LEFT JOIN public."Videos" v ON m.video = v.id
            LEFT JOIN public."Canais do youtube" c ON v.channel_id_yotube = c.channel_id
        WHERE
            m.video IS NOT NULL
            AND m.project_id = projeto_id
        ORDER BY
            m.created_at DESC
        LIMIT page_size
        OFFSET v_offset;
    ELSE
        -- Contagem total para todas as mensagens com vídeo não nulo
        SELECT COUNT(*) INTO v_total_registros
        FROM public."Mensagens" m
        WHERE m.video IS NOT NULL;

        -- Query para todas as mensagens
        RETURN QUERY
        SELECT
            m.id,
            m.mensagem,
            m.created_at,
            m.respondido,
            v.id,
            v."VIDEO",
            v.video_title,
            v.view_count,
            v.like_count,
            v.comment_count,
            c.id,
            c."Nome",
            c.channel_id,
            c.subscriber_count,
            c.view_count,
            v_total_registros
        FROM
            public."Mensagens" m
            LEFT JOIN public."Videos" v ON m.video = v.id
            LEFT JOIN public."Canais do youtube" c ON v.channel_id_yotube = c.channel_id
        WHERE
            m.video IS NOT NULL
        ORDER BY
            m.created_at DESC
        LIMIT page_size
        OFFSET v_offset;
    END IF;
END;
$function$;