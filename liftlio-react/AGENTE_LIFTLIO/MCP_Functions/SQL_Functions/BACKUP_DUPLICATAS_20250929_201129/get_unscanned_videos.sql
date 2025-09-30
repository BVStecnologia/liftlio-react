-- =============================================
-- Função: get_unscanned_videos
-- Descrição: Obtém vídeos não escaneados de um projeto
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_unscanned_videos(integer);

CREATE OR REPLACE FUNCTION public.get_unscanned_videos(p_project_id integer)
 RETURNS TABLE(video_id text, scanner_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT v."VIDEO" as video_id, v.scanner_id
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN public."Projeto" p ON s."Projeto_id" = p.id
    WHERE p.id = p_project_id
    AND (v.comentarios_atualizados = FALSE OR v.comentarios_atualizados IS NULL)
    ORDER BY v."VIDEO"
    LIMIT 100;  -- Limitando a 100 resultados por questões de performance, ajuste conforme necessário
END;
$function$;