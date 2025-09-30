-- =============================================
-- Função: get_youtube_videos (versão 3 - simples)
-- Descrição: Busca vídeos do YouTube versão simplificada
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_videos(text, integer);

CREATE OR REPLACE FUNCTION public.get_youtube_videos(search_term text, max_results integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
BEGIN
    -- Obter o token do YouTube
    token := get_youtube_token(1);  -- Assumindo que 1 é o ID do projeto

    -- Fazer a chamada à API do YouTube
    SELECT * INTO http_response
    FROM http((
        'GET',
        format(
            'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=%s&q=%s&type=video',
            max_results::text,
            urlencode(search_term)
        ),
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