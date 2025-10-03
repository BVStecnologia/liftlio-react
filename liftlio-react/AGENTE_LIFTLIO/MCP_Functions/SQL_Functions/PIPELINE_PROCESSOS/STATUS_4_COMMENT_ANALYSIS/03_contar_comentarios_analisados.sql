-- =============================================
-- Função: contar_comentarios_analisados
-- Descrição: Conta comentários analisados e não analisados do projeto
-- Dependência de: process_comment_analysis_batch
-- Criado: 2025-01-27
-- =============================================

CREATE OR REPLACE FUNCTION public.contar_comentarios_analisados(p_project_id integer)
 RETURNS TABLE(comentarios_analisados bigint, comentarios_nao_analisados bigint, total_comentarios bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_analisados BIGINT;
    v_nao_analisados BIGINT;
    v_total BIGINT;
BEGIN
    -- Contagem de comentários analisados
    SELECT COUNT(*)
    INTO v_analisados
    FROM public."Comentarios_Principais" cp
    JOIN public."Videos" v ON cp.video_id = v.id
    JOIN public."Scanner de videos do youtube" svdy ON v.scanner_id = svdy.id
    WHERE svdy."Projeto_id" = p_project_id
    AND cp.comentario_analizado = TRUE;

    -- Contagem de comentários não analisados
    SELECT COUNT(*)
    INTO v_nao_analisados
    FROM public."Comentarios_Principais" cp
    JOIN public."Videos" v ON cp.video_id = v.id
    JOIN public."Scanner de videos do youtube" svdy ON v.scanner_id = svdy.id
    WHERE svdy."Projeto_id" = p_project_id
    AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE);

    -- Total de comentários
    v_total := v_analisados + v_nao_analisados;

    -- Retorna os resultados
    RETURN QUERY
    SELECT
        v_analisados,
        v_nao_analisados,
        v_total;
END;
$function$