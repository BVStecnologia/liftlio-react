-- =============================================
-- Função: post_youtube_video_comment
-- Descrição: Posta um comentário em um vídeo do YouTube usando API v3, com logging de debug
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.post_youtube_video_comment(project_id integer, video_id text, comment_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT := 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet';
    request_body JSONB;
    user_info_response http_response;
    user_info JSONB;
BEGIN
    -- Obter o token do YouTube para o projeto específico
    token := get_youtube_token(project_id);

    -- Verificar a qual conta este token pertence
    SELECT * INTO user_info_response
    FROM http((
        'GET',
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        ARRAY[
            http_header('Authorization', 'Bearer ' || token)
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Log das informações do usuário
    RAISE NOTICE 'Token: %', token;
    RAISE NOTICE 'User Info Response: %', user_info_response.content;

    -- Construir o corpo da requisição para comentário no vídeo
    request_body := jsonb_build_object(
        'snippet', jsonb_build_object(
            'videoId', video_id,
            'topLevelComment', jsonb_build_object(
                'snippet', jsonb_build_object(
                    'textOriginal', comment_text
                )
            )
        )
    );

    -- Fazer a chamada POST à API do YouTube
    SELECT * INTO http_response
    FROM http((
        'POST',
        api_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || token),
            http_header('Content-Type', 'application/json')
        ]::http_header[],
        'application/json',
        request_body::text
    )::http_request);

    -- Se houver erro, retornar informações detalhadas
    IF http_response.status != 200 THEN
        RETURN jsonb_build_object(
            'error', true,
            'status', http_response.status,
            'response', http_response.content::jsonb,
            'token_used', token,
            'project_id', project_id,
            'user_info', user_info_response.content::jsonb
        );
    END IF;

    -- Retornar resposta com informações de debug
    RETURN jsonb_build_object(
        'success', true,
        'response', http_response.content::jsonb,
        'token_used', token,
        'project_id', project_id,
        'user_info', user_info_response.content::jsonb
    );
END;
$function$