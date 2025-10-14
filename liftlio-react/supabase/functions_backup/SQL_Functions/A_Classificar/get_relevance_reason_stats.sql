CREATE OR REPLACE FUNCTION public.get_relevance_reason_stats(p_project_id integer)
 RETURNS TABLE(filled_relevance_reason_count bigint, empty_relevance_reason_count bigint, total_videos_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_filled_count BIGINT;
    v_empty_count BIGINT;
    v_total_count BIGINT;
BEGIN
    -- Calculamos o total de vídeos com relevance_reason preenchido
    SELECT COUNT(*)
    INTO v_filled_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND v.relevance_reason IS NOT NULL
    AND v.relevance_reason != '';

    -- Calculamos o total de vídeos com relevance_reason vazio ou nulo
    SELECT COUNT(*)
    INTO v_empty_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND (v.relevance_reason IS NULL OR v.relevance_reason = '');

    -- Calculamos o total de vídeos do projeto
    v_total_count := v_filled_count + v_empty_count;

    -- Retornamos os resultados
    RETURN QUERY
    SELECT
        v_filled_count as filled_relevance_reason_count,
        v_empty_count as empty_relevance_reason_count,
        v_total_count as total_videos_count;
END;
$function$