-- =============================================
-- Função: search_youtube_channel_videos
-- Descrição: Busca vídeos de um canal YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.search_youtube_channel_videos(integer, text, integer, text, text, timestamp);

CREATE OR REPLACE FUNCTION public.search_youtube_channel_videos(project_id integer, channel_id text, max_results integer DEFAULT 25, order_by text DEFAULT 'date'::text, page_token text DEFAULT NULL::text, published_after timestamp without time zone DEFAULT NULL::timestamp without time zone)
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
        'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=%s&channelId=%s&order=%s&key=%s',
        max_results::text,
        urlencode(channel_id),
        urlencode(order_by),
        api_key
    );

    -- Adicionar token de página se fornecido
    IF page_token IS NOT NULL THEN
        api_url := api_url || '&pageToken=' || urlencode(page_token);
    END IF;

    -- Adicionar filtro de data de publicação se fornecido
    IF published_after IS NOT NULL THEN
        api_url := api_url || '&publishedAfter=' || to_char(published_after, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    END IF;

    -- Fazer a chamada à API do YouTube sem cabeçalho de autorização
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[]::http_header[], -- Removido o cabeçalho de autorização
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