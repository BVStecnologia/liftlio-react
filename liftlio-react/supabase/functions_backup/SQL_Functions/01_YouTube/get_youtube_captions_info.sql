-- =============================================
-- Função: get_youtube_captions_info
-- Descrição: Obtém informações sobre legendas de um vídeo
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_captions_info(integer, text);

CREATE OR REPLACE FUNCTION public.get_youtube_captions_info(project_id integer, video_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    captions_response http_response;
    api_url TEXT;
BEGIN
    -- Obter o token do YouTube
    token := get_youtube_token(project_id);

    -- Construir URL da API
    api_url := format(
        'https://www.googleapis.com/youtube/v3/captions?videoId=%s&part=snippet',
        video_id
    );

    -- Fazer a chamada para obter os IDs das legendas
    SELECT * INTO captions_response
    FROM http((
        'GET',
        api_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || token)
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Verificar e retornar a resposta
    IF captions_response.status = 200 THEN
        RETURN captions_response.content::jsonb;
    ELSE
        RAISE NOTICE 'Erro na API: % %', captions_response.status, captions_response.content;
        RETURN NULL;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro não tratado: % %', SQLERRM, SQLSTATE;
    RETURN NULL;
END;
$function$;