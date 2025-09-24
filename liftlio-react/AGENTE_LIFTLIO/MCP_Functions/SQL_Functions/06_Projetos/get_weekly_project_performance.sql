-- =============================================
-- Função: get_weekly_project_performance
-- Descrição: Retorna performance semanal do projeto com métricas diárias
-- Criado: 2025-01-24
-- Atualizado: Dashboard de performance com dados dos últimos N dias
-- =============================================

CREATE OR REPLACE FUNCTION public.get_weekly_project_performance(project_id_param integer, days_back integer DEFAULT 7)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
    WITH date_range AS (
        SELECT generate_series(CURRENT_DATE - (days_back - 1), CURRENT_DATE, '1 day'::interval)::date AS day
    ),
    video_counts AS (
        -- Contagem de vídeos adicionados por dia
        SELECT DATE(v.created_at) AS day, COUNT(*) AS count
        FROM public."Videos" v
        JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id_param
          AND v.created_at >= CURRENT_DATE - (days_back - 1)
        GROUP BY DATE(v.created_at)
    ),
    engagement_counts AS (
        -- Contagem de engajamentos (comentários) por dia
        SELECT DATE(c.published_at) AS day, COUNT(*) AS count
        FROM public."Comentarios_Principais" c
        WHERE c.project_id = project_id_param
          AND c.published_at >= CURRENT_DATE - (days_back - 1)
        GROUP BY DATE(c.published_at)
    ),
    mention_counts AS (
        -- Contagem de mensagens postadas por dia
        SELECT DATE(s.postado) AS day, COUNT(*) AS count
        FROM public."Settings messages posts" s
        WHERE s."Projeto" = project_id_param
          AND s.postado >= CURRENT_DATE - (days_back - 1)
        GROUP BY DATE(s.postado)
    ),
    channel_counts AS (
        -- Contagem de canais adicionados por dia
        SELECT DATE(c.created_at) AS day, COUNT(*) AS count
        FROM public."Canais do youtube" c
        WHERE c."Projeto" = project_id_param
          AND c.created_at >= CURRENT_DATE - (days_back - 1)
        GROUP BY DATE(c.created_at)
    ),
    combined_data AS (
        SELECT 
            dr.day,
            to_char(dr.day, 'DD/MM/YYYY') AS formatted_date,
            COALESCE(vc.count, 0) AS videos,
            COALESCE(ec.count, 0) AS engagement,
            COALESCE(mc.count, 0) AS mentions,
            COALESCE(cc.count, 0) AS channels
        FROM date_range dr
        LEFT JOIN video_counts vc ON dr.day = vc.day
        LEFT JOIN engagement_counts ec ON dr.day = ec.day
        LEFT JOIN mention_counts mc ON dr.day = mc.day
        LEFT JOIN channel_counts cc ON dr.day = cc.day
        ORDER BY dr.day
    )
    
    SELECT json_agg(
        json_build_object(
            'date', formatted_date,
            'day', day,
            'videos', videos,
            'engagement', engagement,
            'mentions', mentions,
            'channels', channels
        )
    )
    INTO result
    FROM combined_data;
    
    RETURN result;
END;
$function$
