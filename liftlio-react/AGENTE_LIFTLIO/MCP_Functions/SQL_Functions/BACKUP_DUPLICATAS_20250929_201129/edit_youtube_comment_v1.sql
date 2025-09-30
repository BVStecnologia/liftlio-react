-- =============================================
-- Função: edit_youtube_comment (versão 1 - com project_id)
-- Descrição: Edita comentário do YouTube usando project_id
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.edit_youtube_comment(integer, text, text);

CREATE OR REPLACE FUNCTION public.edit_youtube_comment(project_id integer, comment_id text, new_comment_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT := 'https://www.googleapis.com/youtube/v3/comments?part=snippet';
    request_body JSONB;
BEGIN
    -- Obter o token do YouTube para o projeto específico
    token := get_youtube_token(project_id);

    -- Construir o corpo da requisição
    request_body := jsonb_build_object(
        'id', comment_id,
        'snippet', jsonb_build_object(
            'textOriginal', new_comment_text
        )
    );

    -- Fazer a chamada à API do YouTube
    SELECT * INTO http_response
    FROM http((
        'PUT',
        api_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || token),
            http_header('Content-Type', 'application/json')
        ]::http_header[],
        'application/json',
        request_body::text
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