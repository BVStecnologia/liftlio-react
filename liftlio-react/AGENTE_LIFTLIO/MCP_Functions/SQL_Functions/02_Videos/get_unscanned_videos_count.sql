-- =============================================
-- Função: get_unscanned_videos_count
-- Descrição: Obtém vídeos não escaneados com contagem total
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_unscanned_videos_count(integer);

CREATE OR REPLACE FUNCTION public.get_unscanned_videos_count(p_project_id integer)
 RETURNS TABLE(video_id text, scanner_id bigint, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_count BIGINT;
BEGIN
    -- Primeiro, calculamos o total de vídeos não escaneados
    SELECT COUNT(*)
    INTO v_total_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN public."Projeto" p ON s."Projeto_id" = p.id
    WHERE p.id = p_project_id
    AND (v.comentarios_atualizados = FALSE OR v.comentarios_atualizados IS NULL);

    -- Agora, retornamos os vídeos não escaneados junto com o count total
    RETURN QUERY
    SELECT
        v."VIDEO" as video_id,
        v.scanner_id,
        v_total_count as total_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN public."Projeto" p ON s."Projeto_id" = p.id
    WHERE p.id = p_project_id
    AND (v.comentarios_atualizados = FALSE OR v.comentarios_atualizados IS NULL)
    ORDER BY v."VIDEO"
    LIMIT 100;  -- Limitando a 100 resultados por questões de performance, ajuste conforme necessário

    -- Se nenhum vídeo for encontrado, ainda retornamos o count total
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            NULL::TEXT as video_id,
            NULL::BIGINT as scanner_id,
            v_total_count as total_count;
    END IF;
END;
$function$;