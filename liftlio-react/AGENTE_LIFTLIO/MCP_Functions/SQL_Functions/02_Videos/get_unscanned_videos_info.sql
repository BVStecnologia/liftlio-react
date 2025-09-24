-- =============================================
-- Função: get_unscanned_videos_info
-- Descrição: Obtém informações detalhadas sobre vídeos não escaneados
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_unscanned_videos_info(integer);

CREATE OR REPLACE FUNCTION public.get_unscanned_videos_info(p_project_id integer)
 RETURNS TABLE(video_id text, scanner_id bigint, unscanned_count bigint, total_videos_count bigint, total_main_comments_count bigint, total_reply_comments_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_unscanned_count BIGINT;
    v_total_videos_count BIGINT;
    v_total_main_comments BIGINT;
    v_total_reply_comments BIGINT;
BEGIN
    -- Calculamos o total de vídeos do projeto
    SELECT COUNT(*)
    INTO v_total_videos_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id;

    -- Calculamos o total de vídeos não escaneados
    SELECT COUNT(*)
    INTO v_unscanned_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND (v.comentarios_atualizados = FALSE OR v.comentarios_atualizados IS NULL);

    -- Calculamos o total de comentários principais
    SELECT COUNT(*)
    INTO v_total_main_comments
    FROM public."Comentarios_Principais" cp
    JOIN public."Videos" v ON cp.video_id = v.id
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id;

    -- Calculamos o total de respostas aos comentários
    SELECT COUNT(*)
    INTO v_total_reply_comments
    FROM public."Respostas_Comentarios" rc
    JOIN public."Videos" v ON rc.video_id = v.id
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id;

    -- Retornamos as contagens totais como primeira linha
    RETURN QUERY
    SELECT
        NULL::TEXT as video_id,
        NULL::BIGINT as scanner_id,
        v_unscanned_count as unscanned_count,
        v_total_videos_count as total_videos_count,
        v_total_main_comments as total_main_comments_count,
        v_total_reply_comments as total_reply_comments_count;

    -- Agora, retornamos os vídeos não escaneados
    RETURN QUERY
    SELECT
        v."VIDEO" as video_id,
        v.scanner_id,
        NULL::BIGINT as unscanned_count,
        NULL::BIGINT as total_videos_count,
        NULL::BIGINT as total_main_comments_count,
        NULL::BIGINT as total_reply_comments_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND (v.comentarios_atualizados = FALSE OR v.comentarios_atualizados IS NULL)
    ORDER BY v."VIDEO"
    LIMIT 100;  -- Limitando a 100 resultados por questões de performance, ajuste conforme necessário
END;
$function$;