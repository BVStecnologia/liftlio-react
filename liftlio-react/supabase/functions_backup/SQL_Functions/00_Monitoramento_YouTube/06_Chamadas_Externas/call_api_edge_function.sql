-- =============================================
-- Função: call_api_edge_function
-- Descrição: Chama Edge Function para análise de vídeos novos
-- Criado: 2025-01-23
-- Atualizado: 2025-10-20 (Mudança para video-qualifier-wrapper)
-- =============================================

DROP FUNCTION IF EXISTS call_api_edge_function(TEXT);

CREATE OR REPLACE FUNCTION call_api_edge_function(input_value text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
BEGIN
    -- Preparar o corpo da requisição
    request_body := jsonb_build_object(
        'input_value', input_value
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depuração
    RAISE NOTICE 'Enviando requisição: %', request_body;

    -- Fazer a chamada à Edge Function com o nome correto do endpoint
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/video-qualifier-wrapper',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I')
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);

    -- Resetar as opções CURL
    PERFORM http_reset_curlopt();

    -- Log da resposta
    RAISE NOTICE 'Status da resposta: %, Corpo: %', http_response.status, http_response.content;

    -- Verificar status da resposta
    IF http_response.status != 200 THEN
        RAISE EXCEPTION 'Erro na chamada da Edge Function. Status: %, Resposta: %',
                         http_response.status, http_response.content;
    END IF;

    -- Processar a resposta
    BEGIN
        response := http_response.content::jsonb;
        RETURN response;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao processar a resposta: % | Resposta: %',
                         SQLERRM, COALESCE(http_response.content, 'NULL');
    END;

EXCEPTION WHEN OTHERS THEN
    -- Garantir que as opções CURL sejam resetadas mesmo em caso de erro
    PERFORM http_reset_curlopt();
    RAISE EXCEPTION 'Erro ao chamar a Edge Function: %', SQLERRM;
END;
$$;

-- Função auxiliar que retorna apenas o texto do resultado
CREATE OR REPLACE FUNCTION get_api_text(
    input_value TEXT
) RETURNS TEXT AS $$
DECLARE
    result JSONB;
    text_value TEXT;
BEGIN
    -- Chamar a função principal
    result := call_api_edge_function(input_value);

    -- Extrair apenas o campo 'text' da resposta
    text_value := result->>'text';

    RETURN text_value;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao extrair texto da resposta: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

/*
=== EXEMPLOS DE USO ===

-- Exemplo 1: Chamada básica retornando o objeto JSON completo
SELECT call_api_edge_function('860');

-- Exemplo 2: Obter apenas o texto da resposta
SELECT get_api_text('860');

-- Exemplo 3: Usar o resultado em outra consulta
WITH video_ids AS (
  SELECT get_api_text('860') AS ids
)
SELECT
  ids,
  string_to_array(ids, ', ') AS id_array
FROM video_ids;

-- Exemplo 4: Inserir resultados em uma tabela
INSERT INTO videos (video_id, source_input)
SELECT
  trim(id),
  '860'
FROM
  get_api_text('860') AS text_result,
  unnest(string_to_array(text_result, ', ')) AS id;
*/