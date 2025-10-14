-- =============================================
-- Função: get_youtube_video_comments_with_date
-- Descrição: Obtém comentários de um vídeo do YouTube com data, usando API do YouTube v3
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_youtube_video_comments_with_date(video_id text, max_results integer DEFAULT 50, page_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT;
BEGIN
    -- Obter o token do YouTube
    token := get_youtube_token(1);  -- Assumindo que 1 é o ID do projeto

    -- Construir a URL base
    api_url := format(
        'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=%s&maxResults=%s',
        urlencode(video_id),
        max_results::text
    );

    -- Adicionar token de página se fornecido
    IF page_token IS NOT NULL THEN
        api_url := api_url || '&pageToken=' || urlencode(page_token);
    END IF;

    -- Fazer a chamada à API do YouTube
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || token)
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
$function$