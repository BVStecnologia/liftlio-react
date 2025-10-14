-- =============================================
-- Função: get_youtube_videos (versão 2 - com API Key e filtros)
-- Descrição: Busca vídeos do YouTube usando API Key e palavras negativas
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_videos(integer, text, integer, timestamp without time zone, text, text, text);

CREATE OR REPLACE FUNCTION public.get_youtube_videos(project_id integer, search_term text, max_results integer DEFAULT 25, published_after timestamp without time zone DEFAULT NULL::timestamp without time zone, order_by text DEFAULT 'relevance'::text, region_code text DEFAULT 'US'::text, page_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT;
    video_ids JSONB;
    next_page_token TEXT;
    negative_keywords TEXT[];
BEGIN
    -- Obter a API key do YouTube diretamente do vault
    api_key := get_youtube_api_key();

    -- Obter palavras-chave negativas do projeto
    negative_keywords := get_project_negative_keywords(project_id);

    -- Construir a URL com a API key
    api_url := format(
        'https://www.googleapis.com/youtube/v3/search?part=id,snippet&maxResults=%s&q=%s&type=video&key=%s',
        max_results::text,
        urlencode(search_term),
        api_key
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

    -- Fazer a chamada à API do YouTube usando a API key na URL (sem header de autorização)
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Verificar o status da resposta
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear a resposta como JSON
    response := http_response.content::jsonb;

    -- Extrair apenas os IDs dos vídeos, filtrando pelos títulos que não contêm palavras negativas
    SELECT jsonb_agg(item->'id'->>'videoId')
    INTO video_ids
    FROM jsonb_array_elements(response->'items') AS item
    WHERE item->'id'->>'kind' = 'youtube#video'
    AND NOT EXISTS (
        SELECT 1
        FROM unnest(negative_keywords) AS nk
        WHERE nk <> '' AND (item->'snippet'->>'title') ILIKE '%' || nk || '%'
    );

    -- Extrair o token da próxima página
    next_page_token := response->>'nextPageToken';

    -- Construir e retornar o resultado final
    RETURN jsonb_build_object(
        'video_ids', video_ids,
        'nextPageToken', next_page_token
    );
END;
$function$;