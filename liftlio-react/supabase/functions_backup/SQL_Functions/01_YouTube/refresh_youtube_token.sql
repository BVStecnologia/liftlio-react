-- =============================================
-- Função: refresh_youtube_token
-- Descrição: Renova token YouTube usando refresh token
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.refresh_youtube_token(text);

CREATE OR REPLACE FUNCTION public.refresh_youtube_token(refresh_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    client_id TEXT;
    client_secret TEXT;
    response JSONB;
    http_response http_response;
BEGIN
    -- Buscar client_id e client_secret do Vault
    client_id := get_secret('youtube_client_id');
    client_secret := get_secret('youtube_client_secret');

    -- Fazer a chamada à API do Google para refresh do token
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://oauth2.googleapis.com/token',
        ARRAY[
            http_header('Content-Type', 'application/x-www-form-urlencoded')
        ]::http_header[],
        'application/x-www-form-urlencoded',
        format(
            'client_id=%s&client_secret=%s&refresh_token=%s&grant_type=refresh_token',
            urlencode(client_id),
            urlencode(client_secret),
            urlencode(refresh_token)
        )
    )::http_request);

    -- Log da resposta para debugging
    RAISE NOTICE 'HTTP Status: %, Body: %', http_response.status, http_response.content;

    -- Verificar o status da resposta
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Tentar parsear a resposta como JSON
    BEGIN
        response := http_response.content::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to parse API response as JSON. Body: %', http_response.content;
    END;

    -- Verificar se há um erro na resposta
    IF response ? 'error' THEN
        RAISE EXCEPTION 'API returned an error: %', response->>'error';
    END IF;

    -- Retornar a resposta completa como JSONB
    RETURN response;
END;
$function$;