-- =============================================
-- Função: get_youtube_video_comments
-- Descrição: Obtém comentários de um vídeo do YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_video_comments(integer, text, integer, text);

CREATE OR REPLACE FUNCTION public.get_youtube_video_comments(project_id integer, video_id text, max_results integer DEFAULT 50, page_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT;
BEGIN
    -- Obter a API key do YouTube
    api_key := get_youtube_api_key();

    -- Construir a URL base com a API key
    api_url := format(
        'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=%s&maxResults=%s&key=%s',
        urlencode(video_id),
        max_results::text,
        api_key
    );

    -- Adicionar token de página se fornecido
    IF page_token IS NOT NULL THEN
        api_url := api_url || '&pageToken=' || urlencode(page_token);
    END IF;

    -- Fazer a chamada à API do YouTube sem cabeçalho de autorização Bearer
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[
            http_header('Accept', 'application/json')
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Verificar o status da resposta
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear a resposta como JSON
    response := http_response.content::jsonb;

    -- Retornar a resposta
    RETURN response;
END;
$function$;