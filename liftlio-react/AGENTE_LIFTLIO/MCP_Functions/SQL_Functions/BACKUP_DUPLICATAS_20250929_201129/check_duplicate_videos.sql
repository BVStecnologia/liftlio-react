-- =============================================
-- Função: check_duplicate_videos
-- Descrição: Verifica vídeos duplicados no sistema
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.check_duplicate_videos();

CREATE OR REPLACE FUNCTION public.check_duplicate_videos()
 RETURNS TABLE(youtube_id text, count bigint, video_ids text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        v.youtube_id,
        COUNT(*) as count,
        ARRAY_AGG(v.id::text ORDER BY v.created_at) as video_ids
    FROM
        public."Videos" v
    GROUP BY
        v.youtube_id
    HAVING
        COUNT(*) > 1
    ORDER BY
        COUNT(*) DESC,
        v.youtube_id;
END;
$function$;