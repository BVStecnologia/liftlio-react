-- =============================================
-- Fun��o: claude_complete_worker
-- Descri��o: Worker function para processamento ass�ncrono com Claude API
-- Criado: 2025-01-24
-- Atualizado: 2025-01-10 - Migrado para usar get_current_claude_model() wrapper
-- =============================================

CREATE OR REPLACE FUNCTION public.claude_complete_worker(user_prompt text, system_prompt text, max_tokens integer, temperature double precision)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
    response JSONB;
    http_response http_response;
    messages JSONB;
    request_body TEXT;
BEGIN
    -- O c�digo aqui � similar ao original claude_complete
    -- Buscar a chave de API
    api_key := get_secret('CLAUDE_API_KEY');

    -- Construir a array de mensagens
    messages := jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', user_prompt)
    );

    -- Construir o corpo da requisi��o
    -- MODELO: Usa get_current_claude_model() para centralizar versão
    request_body := json_build_object(
        'model', get_current_claude_model(),
        'max_tokens', max_tokens,
        'temperature', temperature,
        'system', system_prompt,
        'messages', messages
    )::text;

    -- Fazer a chamada � API do Claude
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://api.anthropic.com/v1/messages',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('x-api-key', api_key),
            http_header('anthropic-version', '2023-06-01')
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);

    -- Verificar o status da resposta
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear a resposta como JSON
    response := http_response.content::jsonb;

    -- Retornar o texto da resposta
    RETURN response->'content'->0->>'text';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'An error occurred: %', SQLERRM;
        RETURN NULL;
END;
$function$