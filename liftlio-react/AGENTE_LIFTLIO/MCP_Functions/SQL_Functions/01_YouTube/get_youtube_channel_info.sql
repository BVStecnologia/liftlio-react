-- =============================================
-- Função: get_youtube_channel_info
-- Descrição: Obtém informações do canal YouTube autenticado
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_channel_info(integer, text);

CREATE OR REPLACE FUNCTION public.get_youtube_channel_info(project_id integer, part text DEFAULT 'snippet,statistics,brandingSettings'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    access_token TEXT;
    refresh_token TEXT;
    expires_at TIMESTAMP;
    response JSONB;
    http_response http_response;
    api_url TEXT;
    integracao_id BIGINT;
BEGIN
    -- Buscar informações da integração do YouTube para o projeto
    SELECT id, "Token", "Refresh token",
           CASE
               WHEN "expira em" IS NOT NULL THEN
                   "Ultima atualização" + INTERVAL '1 second' * "expira em"
               ELSE NULL
           END
    INTO integracao_id, access_token, refresh_token, expires_at
    FROM public."Integrações"
    WHERE "PROJETO id" = project_id
      AND "Tipo de integração" = 'youtube'
      AND ativo = true
    ORDER BY "Ultima atualização" DESC
    LIMIT 1;

    -- Verificar se a integração foi encontrada
    IF access_token IS NULL THEN
        RAISE EXCEPTION 'Integração do YouTube não encontrada ou inativa para o projeto %. Verifique se o OAuth foi configurado corretamente.', project_id;
    END IF;

    -- Log da data de expiração para debug (opcional)
    -- Token expira em: expires_at

    -- Verificar se o token não está vazio
    IF LENGTH(TRIM(access_token)) = 0 THEN
        RAISE EXCEPTION 'Token de acesso está vazio para o projeto %', project_id;
    END IF;

    -- Construir a URL da API do YouTube para obter informações do canal do usuário autenticado
    api_url := format(
        'https://www.googleapis.com/youtube/v3/channels?part=%s&mine=true',
        urlencode(part)
    );

    -- Fazer a chamada à API do YouTube com token de autorização
    SELECT * INTO http_response
    FROM http((
        'GET',
        api_url,
        ARRAY[
            ('Authorization', 'Bearer ' || access_token)::http_header,
            ('Content-Type', 'application/json')::http_header
        ],
        NULL,
        NULL
    )::http_request);

    -- Verificar o status da resposta
    IF http_response.status = 401 THEN
        -- Token inválido ou expirado
        RAISE EXCEPTION 'Token de acesso inválido ou expirado. Status: 401. É necessário renovar a autenticação OAuth. Refresh token disponível: %',
                       CASE WHEN refresh_token IS NOT NULL THEN 'Sim' ELSE 'Não' END;
    ELSIF http_response.status != 200 THEN
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear a resposta como JSON
    response := http_response.content::jsonb;

    -- Verificar se o canal foi encontrado
    IF (response->>'pageInfo')::jsonb->>'totalResults' = '0' THEN
        RAISE EXCEPTION 'Nenhum canal encontrado para o usuário autenticado';
    END IF;

    -- Retornar a resposta
    RETURN response;
END;
$function$;