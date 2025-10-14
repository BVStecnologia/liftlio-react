-- =============================================
-- Função: get_youtube_videos (versão 1 - com OAuth)
-- Descrição: Busca vídeos do YouTube usando OAuth
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_videos(text, integer, timestamp without time zone, text, text, text);

CREATE OR REPLACE FUNCTION public.get_youtube_videos(search_term text, max_results integer DEFAULT 25, published_after timestamp without time zone DEFAULT NULL::timestamp without time zone, order_by text DEFAULT 'relevance'::text, region_code text DEFAULT 'US'::text, page_token text DEFAULT NULL::text)
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
        'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=%s&q=%s&type=video',
        max_results::text,
        urlencode(search_term)
    );

    -- Adicionar filtros opcionais
    IF published_after IS NOT NULL THEN
        api_url := api_url || '&publishedAfter=' || to_char(published_after, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    END IF;

    IF order_by IS NOT NULL THEN
        api_url := api_url || '&order=' || urlencode(order_by);
    END IF;

    IF region_code IS NOT NULL THEN
        api_url := api_url || '&regionCode=' || urlencode(region_code);
    END IF;

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
$function$;