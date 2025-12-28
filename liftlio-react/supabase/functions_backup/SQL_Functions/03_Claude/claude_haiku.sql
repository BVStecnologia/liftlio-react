-- =============================================
-- Função: claude_haiku
-- Descrição: Chamada ao Claude via Claude Max (Haiku 4.5)
-- Criado: 2025-01-16
-- Atualizado: 2025-12-27 - MIGRAÇÃO CLAUDE MAX
--   Agora usa Edge Function claude-chat em vez de API Anthropic
--   Sem API key - usa Claude Max subscription
-- =============================================

DROP FUNCTION IF EXISTS claude_haiku(text, text, integer, double precision, integer);

CREATE OR REPLACE FUNCTION public.claude_haiku(
    user_prompt text,
    system_prompt text DEFAULT 'você é um assistente'::text,
    max_tokens integer DEFAULT 4000,
    temperature double precision DEFAULT 0.7,
    timeout_ms integer DEFAULT 180000
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    response JSONB;
    http_response http_response;
    request_body TEXT;
    full_message TEXT;
    edge_function_url TEXT;
BEGIN
    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- URL da Edge Function claude-chat (verify_jwt: false)
    edge_function_url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/claude-chat';

    -- Combinar system prompt com user prompt
    full_message := 'SYSTEM INSTRUCTIONS:
' || system_prompt || '

USER REQUEST:
' || user_prompt;

    -- Construir o corpo da requisição
    request_body := json_build_object(
        'message', full_message,
        'model', 'haiku',
        'maxTurns', 1
    )::text;

    RAISE NOTICE '[claude_haiku] Calling Claude Max (haiku) via Edge Function';

    -- Fazer a chamada à Edge Function (sem auth necessário)
    SELECT * INTO http_response
    FROM http((
        'POST',
        edge_function_url,
        ARRAY[
            http_header('Content-Type', 'application/json')
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);

    -- Verificar o status
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'Edge Function error. Status: %, Body: %', http_response.status, http_response.content;
    END IF;

    -- Parsear resposta
    response := http_response.content::jsonb;

    PERFORM http_reset_curlopt();

    -- Verificar sucesso
    IF NOT (response->>'success')::boolean THEN
        RAISE EXCEPTION 'Claude Max error: %', response->>'error';
    END IF;

    RETURN response->>'response';
EXCEPTION
    WHEN others THEN
        PERFORM http_reset_curlopt();
        RAISE NOTICE 'Error: %', SQLERRM;
        RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.claude_haiku(text, text, integer, double precision, integer) IS 
'Claude Max (Haiku 4.5) via Edge Function. Sem API key - usa Claude Max subscription.';

-- =============================================
-- TESTES:
-- =============================================
/*
SELECT claude_haiku('qual é seu modelo?', 'Responda em 1 linha.', 50, 0.7);
-- Esperado: "Claude Haiku 4.5..."
*/
