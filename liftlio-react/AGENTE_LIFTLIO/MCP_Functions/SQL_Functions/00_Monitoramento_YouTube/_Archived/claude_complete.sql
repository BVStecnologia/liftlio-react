-- =============================================
-- Função: claude_complete
-- Descrição: Função helper para chamar Claude API
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS claude_complete(TEXT, TEXT, INTEGER, FLOAT);

CREATE OR REPLACE FUNCTION claude_complete(
    prompt TEXT,
    system_prompt TEXT DEFAULT '',
    max_tokens INTEGER DEFAULT 1000,
    temperature FLOAT DEFAULT 0.7
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_api_key TEXT;
    v_response JSONB;
    v_result TEXT;
BEGIN
    -- Obter API key do Vault
    SELECT value INTO v_api_key
    FROM vault.decrypted_secrets
    WHERE name = 'CLAUDE_API_KEY'
    LIMIT 1;

    IF v_api_key IS NULL THEN
        RAISE EXCEPTION 'Claude API key not found in vault';
    END IF;

    -- Chamar Claude API via Edge Function
    BEGIN
        SELECT payload INTO v_response
        FROM http((
            'POST',
            current_setting('app.supabase_url') || '/functions/v1/claude-complete',
            ARRAY[
                http_header('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')),
                http_header('Content-Type', 'application/json')
            ],
            'application/json',
            jsonb_build_object(
                'prompt', prompt,
                'system', system_prompt,
                'max_tokens', max_tokens,
                'temperature', temperature,
                'api_key', v_api_key
            )::text
        )::http_request);

        -- Extrair resposta do Claude
        v_result := v_response->>'content';

        IF v_result IS NULL THEN
            v_result := v_response->>'text';
        END IF;

        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Se falhar, retornar NULL ou mensagem padrão
        RETURN NULL;
    END;
END;
$$;