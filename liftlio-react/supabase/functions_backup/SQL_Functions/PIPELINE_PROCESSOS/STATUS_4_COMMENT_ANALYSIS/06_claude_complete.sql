-- =============================================
-- Função: claude_complete
-- Tipo: API Wrapper (chamada HTTP à Claude API)
--
-- Descrição:
--   Wrapper para chamar a API do Claude da Anthropic.
--   Usa extensão http do PostgreSQL para fazer requisição POST.
--
-- Entrada:
--   user_prompt TEXT - Prompt do usuário
--   system_prompt TEXT - Prompt do sistema (default: 'você é um professor')
--   max_tokens INTEGER - Máximo de tokens na resposta (default: 4000)
--   temperature DOUBLE PRECISION - Temperatura do modelo (default: 0.1)
--   timeout_ms INTEGER - Timeout em milissegundos (default: 30000)
--
-- Saída:
--   TEXT - Resposta do Claude
--
-- Conexões:
--   → Chamada por: 05_analisar_comentarios_com_claude (linha 259)
--   → Também usada por: STATUS_3 (analyze_video_with_claude)
--
-- Criado: Data desconhecida
-- Atualizado: 2025-01-10 - Migrado para usar get_current_claude_model() wrapper
--             2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

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
    -- MODELO: Usa get_current_claude_model() para centralizar versão
    request_body := json_build_object(
        'model', get_current_claude_model(),
        'max_tokens', max_tokens,
        'temperature', temperature,
        'system', system_prompt,
        'messages', messages
    )::text;

    -- Log para debug (opcional)
    RAISE NOTICE 'Request body: %', request_body;

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
$function$
