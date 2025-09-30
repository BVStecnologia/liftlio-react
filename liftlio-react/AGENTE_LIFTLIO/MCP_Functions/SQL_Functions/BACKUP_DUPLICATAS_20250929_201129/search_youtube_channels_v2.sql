-- =============================================
-- Função: search_youtube_channels (versão 2 - com project_id)
-- Descrição: Busca canais no YouTube usando API key
-- Parâmetros: project_id integer, search_term text, max_results integer, page_token text
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.search_youtube_channels(project_id integer, search_term text, max_results integer DEFAULT 25, page_token text DEFAULT NULL::text)
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
        'https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=%s&q=%s&key=%s',
        max_results::text,
        urlencode(search_term),
        api_key
    );

    -- Adicionar token de página se fornecido
    IF page_token IS NOT NULL THEN
        api_url := api_url || '&pageToken=' || urlencode(page_token);
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
$function$