-- =============================================
-- Função: is_youtube_token_valid
-- Descrição: Verifica se token YouTube é válido
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.is_youtube_token_valid(character varying);

CREATE OR REPLACE FUNCTION public.is_youtube_token_valid(token_to_check character varying)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    http_response http_response;
    response_text TEXT;
    response_body JSONB;
    is_valid BOOLEAN := FALSE;
    diagnostic TEXT := '';
    has_youtube BOOLEAN := FALSE;
BEGIN
    -- Verifica se o token foi fornecido
    IF token_to_check IS NULL OR token_to_check = '' THEN
        RETURN 'INVÁLIDO: Token não fornecido';
    END IF;

    -- Faz uma chamada ao endpoint tokeninfo
    BEGIN
        SELECT * INTO http_response
        FROM http((
            'GET',
            'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' || token_to_check,
            ARRAY[http_header('Accept', 'application/json')]::http_header[],
            NULL, NULL
        )::http_request);

        -- Captura o texto da resposta
        response_text := http_response.content;

        -- Verifica o status code primeiro
        IF http_response.status = 200 THEN
            -- Tentativa simples de verificação
            BEGIN
                -- Verifica as permissões para YouTube diretamente no texto
                IF response_text LIKE '%youtube%' THEN
                    is_valid := TRUE;
                    has_youtube := TRUE;
                    diagnostic := 'Token válido com permissões para YouTube';
                ELSE
                    is_valid := FALSE;
                    diagnostic := 'Token válido mas SEM permissões para YouTube';
                END IF;

                -- Extrai informação de expiração usando expressão regular
                -- Evita problemas com a função position()
                DECLARE
                    expires_match TEXT;
                BEGIN
                    -- Usa expressão regular para extrair o valor de expires_in
                    SELECT substring(response_text FROM '"expires_in":\\s*(\\d+)')
                    INTO expires_match;

                    IF expires_match IS NOT NULL THEN
                        expires_match := regexp_replace(expires_match, '"expires_in":\\s*', '');
                        diagnostic := diagnostic || ' (expira em ' || expires_match || ' segundos)';
                    END IF;
                END;
            EXCEPTION WHEN OTHERS THEN
                is_valid := FALSE;
                diagnostic := 'Erro ao analisar resposta: ' || SQLERRM;
            END;
        ELSE
            is_valid := FALSE;
            diagnostic := 'Token inválido (status HTTP: ' || http_response.status || ')';

            -- Adiciona qualquer informação de erro disponível
            IF response_text LIKE '%error%' THEN
                diagnostic := diagnostic || ' - Veja detalhes na resposta';
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        is_valid := FALSE;
        diagnostic := 'Erro ao fazer requisição HTTP: ' || SQLERRM;
    END;

    -- Retorna o resultado
    IF is_valid THEN
        RETURN 'VÁLIDO: ' || diagnostic;
    ELSE
        RETURN 'INVÁLIDO: ' || diagnostic;
    END IF;
END;
$function$;