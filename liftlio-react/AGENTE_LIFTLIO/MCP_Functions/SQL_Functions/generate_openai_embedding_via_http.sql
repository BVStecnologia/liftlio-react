-- Função para gerar embeddings via HTTP diretamente do SQL
-- Criada em: 11/01/2025
-- Objetivo: Permitir que SQL Functions chamem OpenAI API sem precisar de Edge Functions

-- Criar extensão HTTP se não existir
CREATE EXTENSION IF NOT EXISTS http;

CREATE OR REPLACE FUNCTION generate_openai_embedding(
    p_text TEXT,
    p_api_key TEXT
)
RETURNS vector(1536)
LANGUAGE plpgsql
AS $$
DECLARE
    v_response json;
    v_embedding vector(1536);
    v_http_response http_response;
BEGIN
    -- Fazer chamada HTTP para OpenAI
    v_http_response := http((
        'POST',
        'https://api.openai.com/v1/embeddings',
        ARRAY[
            http_header('Authorization', 'Bearer ' || p_api_key),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        json_build_object(
            'input', p_text,
            'model', 'text-embedding-3-small',
            'dimensions', 1536
        )::text
    )::http_request);
    
    -- Verificar status
    IF v_http_response.status != 200 THEN
        RAISE EXCEPTION 'OpenAI API error: %', v_http_response.content;
    END IF;
    
    -- Extrair embedding
    v_response := v_http_response.content::json;
    v_embedding := (v_response->'data'->0->>'embedding')::vector(1536);
    
    RETURN v_embedding;
END;
$$;

COMMENT ON FUNCTION generate_openai_embedding IS 'Gera embeddings usando OpenAI API diretamente via SQL';

-- Exemplo de uso:
-- SELECT generate_openai_embedding('Texto para gerar embedding', 'sk-api-key-aqui');

-- NOTA: Esta função demonstra que SQL pode chamar APIs externas,
-- eliminando a necessidade de Edge Functions para tarefas simples