-- Função: get_weekly_performance
-- Descrição: Retorna performance semanal do projeto incluindo contagem de postagens/mentions por dia
-- Última atualização: Consulta do banco em 22/01/2025

CREATE OR REPLACE FUNCTION public.get_weekly_performance(project_id_param integer, days_back integer DEFAULT 7)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date DATE;
BEGIN
    -- Definir a data inicial (hoje - days_back)
    start_date := CURRENT_DATE - (days_back - 1) * INTERVAL '1 day';
    
    WITH date_range AS (
        SELECT generate_series(start_date, CURRENT_DATE, '1 day'::interval)::date AS day
    ),
    video_counts AS (
        -- Contagem de vídeos adicionados por dia
        SELECT DATE(v.created_at) AS day, COUNT(*) AS count
        FROM public."Videos" v
        JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id_param
          AND v.created_at >= start_date
        GROUP BY DATE(v.created_at)
    ),
    engagement_counts AS (
        -- Contagem de engajamentos (comentários) por dia
        SELECT DATE(c.published_at) AS day, COUNT(*) AS count
        FROM public."Comentarios_Principais" c
        WHERE c.project_id = project_id_param
          AND c.published_at >= start_date
        GROUP BY DATE(c.published_at)
    ),
    mention_counts AS (
        -- IMPORTANTE: Contagem de mensagens POSTADAS por dia
        -- Usa o campo "postado" que indica quando a mensagem foi efetivamente postada
        SELECT DATE(s.postado) AS day, COUNT(*) AS count
        FROM public."Settings messages posts" s
        WHERE s."Projeto" = project_id_param
          AND s.postado >= start_date
        GROUP BY DATE(s.postado)
    ),
    combined_data AS (
        SELECT 
            dr.day,
            to_char(dr.day, 'DD/MM/YYYY') AS formatted_date,
            COALESCE(vc.count, 0) AS videos,
            COALESCE(ec.count, 0) AS engagement,
            COALESCE(mc.count, 0) AS mentions  -- Postagens realizadas no dia
        FROM date_range dr
        LEFT JOIN video_counts vc ON dr.day = vc.day
        LEFT JOIN engagement_counts ec ON dr.day = ec.day
        LEFT JOIN mention_counts mc ON dr.day = mc.day
        ORDER BY dr.day
    )
    
    SELECT json_agg(
        json_build_object(
            'date', formatted_date,
            'Videos', videos,
            'Engagement', engagement,
            'Mentions', mentions  -- Número de postagens realizadas
        )
    )
    INTO result
    FROM combined_data;
    
    RETURN result;
END;
$$;