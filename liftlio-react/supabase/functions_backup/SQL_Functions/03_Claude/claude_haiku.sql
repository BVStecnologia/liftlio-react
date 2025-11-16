-- =============================================
-- Função: claude_haiku
-- Tipo: API Wrapper (chamada HTTP à Claude API usando Haiku)
--
-- Descrição:
--   Função específica para usar Claude Haiku 4.5 (modelo mais rápido e econômico).
--   Mesma interface que claude_complete(), mas com modelo Haiku hardcoded.
--
-- Entrada:
--   user_prompt TEXT - Prompt do usuário
--   system_prompt TEXT - Prompt do sistema (default: 'você é um assistente')
--   max_tokens INTEGER - Máximo de tokens na resposta (default: 4000)
--   temperature DOUBLE PRECISION - Temperatura do modelo (default: 0.7)
--   timeout_ms INTEGER - Timeout em milissegundos (default: 180000 = 3 minutos)
--
-- Saída:
--   TEXT - Resposta do Claude Haiku
--
-- Uso:
--   SELECT claude_haiku('qual é seu modelo?', 'Você é um assistente', 4000, 0.7);
--
-- Criado: 2025-01-16
-- =============================================

DROP FUNCTION IF EXISTS claude_haiku(TEXT, TEXT, INTEGER, DOUBLE PRECISION, INTEGER);

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

    -- Construir o corpo da requisição com HAIKU hardcoded
    request_body := json_build_object(
        'model', 'claude-haiku-4-5-20251001',
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
        RAISE NOTICE 'An error occurred: %', SQLERRM;
        RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.claude_haiku(TEXT, TEXT, INTEGER, DOUBLE PRECISION, INTEGER) IS
'Chamada à API do Claude usando modelo Haiku 4.5 (rápido e econômico). Mesma interface que claude_complete().';

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Pergunta simples
SELECT claude_haiku(
    'qual é seu modelo de linguagem?',
    'Você é um assistente.',
    4000,
    0.7
);
-- Esperado: "Sou Claude Haiku..."

-- Teste 2: Usar defaults
SELECT claude_haiku('diga olá');
-- Esperado: Resposta com system_prompt e temperature padrão

-- Teste 3: Comparar com claude_complete
SELECT
    'Haiku' as modelo,
    claude_haiku('explique fotossíntese em 50 palavras') as resposta
UNION ALL
SELECT
    'Sonnet' as modelo,
    claude_complete('explique fotossíntese em 50 palavras') as resposta;
-- Esperado: Ver diferença de resposta entre modelos
*/
