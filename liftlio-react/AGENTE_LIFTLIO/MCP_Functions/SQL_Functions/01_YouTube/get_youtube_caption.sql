-- =============================================
-- Função: get_youtube_caption
-- Descrição: Obtém legendas de um vídeo YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_caption(integer, text);

CREATE OR REPLACE FUNCTION public.get_youtube_caption(project_id integer, video_id text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    captions_info JSONB;
    response http_response;
    api_url TEXT;
    language TEXT;
BEGIN
    -- Primeiro pegar as informações da legenda para saber o idioma
    captions_info := get_youtube_video_caption(project_id, video_id);

    -- Se encontrou legendas, pegar o idioma da primeira
    IF jsonb_array_length(captions_info->'items') > 0 THEN
        language := captions_info->'items'->0->'snippet'->>'language';

        -- Construir URL para a legenda
        api_url := format(
            'https://www.youtube.com/api/timedtext?v=%s&lang=%s',
            video_id,
            language
        );

        -- Buscar a legenda
        SELECT * INTO response
        FROM http((
            'GET',
            api_url,
            ARRAY[
                http_header('User-Agent', 'Mozilla/5.0'),
                http_header('Accept', 'text/xml')
            ]::http_header[],
            NULL,
            NULL
        )::http_request);

        -- Retornar o conteúdo da legenda
        RETURN response.content;
    END IF;

    RETURN NULL;
END;
$function$;