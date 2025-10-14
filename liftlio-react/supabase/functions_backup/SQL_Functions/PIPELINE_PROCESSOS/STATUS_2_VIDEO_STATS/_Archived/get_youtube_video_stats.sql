-- =============================================
-- Fun��o: get_youtube_video_stats
-- Descri��o: Obter estat�sticas de v�deos do YouTube via API
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.get_youtube_video_stats(project_id integer, video_ids text, parts text DEFAULT 'statistics,snippet'::text)
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

    -- Construir a URL da API com a chave API
    api_url := format(
        'https://www.googleapis.com/youtube/v3/videos?id=%s&part=%s&key=%s',
        video_ids,
        urlencode(parts),
        api_key
    );

    -- Fazer a chamada � API do YouTube sem o cabe�alho de autoriza��o
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[]::http_header[], -- Removido o cabe�alho de autoriza��o
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