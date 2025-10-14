-- =============================================
-- Função: respond_to_youtube_comment
-- Descrição: Responde a comentários do YouTube
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.respond_to_youtube_comment(project_id integer, parent_comment_id text, response_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT := 'https://www.googleapis.com/youtube/v3/comments?part=snippet';
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

    -- Construir o corpo da requisição
    request_body := jsonb_build_object(
        'snippet', jsonb_build_object(
            'textOriginal', response_text,
            'parentId', parent_comment_id
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

        -- Detectar erros que indicam conta banida/suspensa e desativar integração
        IF http_response.status IN (403, 429, 400) THEN
            DECLARE
                motivo_desativacao TEXT;
            BEGIN
                -- Define o motivo baseado no código de erro
                motivo_desativacao := CASE http_response.status
                    WHEN 403 THEN '403 Forbidden: Conta banida, suspensa ou sem permissões para responder comentários no YouTube'
                    WHEN 429 THEN '429 Too Many Requests: Rate limit excedido - muitas requisições ao YouTube'
                    WHEN 400 THEN '400 Bad Request: Erro na requisição ou conta sem permissões adequadas'
                    ELSE 'Erro desconhecido: ' || http_response.status
                END;

                -- Desativar integração e salvar motivo
                UPDATE "Integrações" i
                SET ativo = FALSE,
                    desativacao_motivo = motivo_desativacao,
                    desativacao_timestamp = CURRENT_TIMESTAMP
                FROM "Projeto" p
                WHERE p.id = project_id
                  AND i.id = p."Integrações";

                -- Marcar projeto como integração inválida
                UPDATE "Projeto"
                SET integracao_valida = FALSE
                WHERE id = project_id;

                RAISE NOTICE 'Integração desativada para projeto % - Motivo: %', project_id, motivo_desativacao;
            END;
        END IF;

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
