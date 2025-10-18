-- =============================================
-- Migration: Fix claude_complete error logging + DEFAULT FALSE
-- Data: 2025-10-17 14:30
-- Objetivo:
--   1. Melhorar logging de erros em claude_complete (NOTICE → WARNING)
--   2. Adicionar DEFAULT FALSE em comentario_analizado
--   3. Atualizar registros NULL para FALSE
-- =============================================

-- PARTE 1: Melhorar tratamento de erros em claude_complete
-- =========================================================

DROP FUNCTION IF EXISTS claude_complete(TEXT, TEXT, INTEGER, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION public.claude_complete(
    user_prompt text,
    system_prompt text DEFAULT 'você é um professor'::text,
    max_tokens integer DEFAULT 4000,
    temperature double precision DEFAULT 0.1,
    timeout_ms integer DEFAULT 30000
)
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
    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Buscar a chave de API
    api_key := get_secret('CLAUDE_API_KEY');

    -- Construir a array de mensagens (apenas mensagem do usuário)
    messages := jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', user_prompt)
    );

    -- Construir o corpo da requisição
    request_body := json_build_object(
        'model', get_current_claude_model(),
        'max_tokens', max_tokens,
        'temperature', temperature,
        'system', system_prompt,
        'messages', messages
    )::text;

    -- Fazer a chamada à API do Claude
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
        RAISE WARNING 'Claude API Error! Status: %, Body: %', http_response.status, http_response.content;
        RAISE EXCEPTION 'API request failed. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear a resposta como JSON
    response := http_response.content::jsonb;

    -- Resetar as opções CURL para não afetar outras chamadas
    PERFORM http_reset_curlopt();

    -- Retornar o texto da resposta
    RETURN response->'content'->0->>'text';
EXCEPTION
    WHEN others THEN
        -- Garantir que as opções CURL sejam resetadas mesmo em caso de erro
        PERFORM http_reset_curlopt();
        -- ✅ MUDANÇA: RAISE WARNING ao invés de NOTICE
        RAISE WARNING 'claude_complete EXCEPTION: %, SQLSTATE: %', SQLERRM, SQLSTATE;
        -- ✅ MUDANÇA: Propagar erro ao invés de retornar NULL
        RAISE;
END;
$function$;

-- PARTE 2: Adicionar DEFAULT FALSE em comentario_analizado
-- ==========================================================

-- Atualizar registros NULL para FALSE
UPDATE public."Comentarios_Principais"
SET comentario_analizado = FALSE
WHERE comentario_analizado IS NULL;

-- Adicionar DEFAULT FALSE na coluna
ALTER TABLE public."Comentarios_Principais"
ALTER COLUMN comentario_analizado SET DEFAULT FALSE;

-- PARTE 3: Simplificar queries futuras
-- =====================================
-- Agora todas as queries podem usar apenas:
--   WHERE comentario_analizado = FALSE
-- Ao invés de:
--   WHERE (comentario_analizado IS NULL OR comentario_analizado = FALSE)

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 20251017143000 aplicada com sucesso!';
    RAISE NOTICE '- claude_complete agora loga erros como WARNING';
    RAISE NOTICE '- comentario_analizado tem DEFAULT FALSE';
    RAISE NOTICE '- % registros atualizados de NULL para FALSE',
        (SELECT COUNT(*) FROM public."Comentarios_Principais" WHERE comentario_analizado = FALSE);
END $$;
