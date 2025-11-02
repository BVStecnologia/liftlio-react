-- =============================================
-- Função: call_youtube_channel_details
-- Descrição: Chama Edge Function para obter detalhes de canal do YouTube
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS call_youtube_channel_details(TEXT);

CREATE OR REPLACE FUNCTION call_youtube_channel_details(channel_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
    base_url TEXT;
    auth_key TEXT;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();
    auth_key := get_edge_functions_anon_key();

    -- Preparar o corpo da requisição
    request_body := jsonb_build_object(
        'channelId', channel_id
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depuração (mostra qual ambiente está usando)
    RAISE NOTICE 'Ambiente: % | Enviando requisição: %', base_url, request_body;

    -- Fazer a chamada à Edge Function com URL dinâmica
    SELECT * INTO http_response
    FROM http((
        'POST',
        base_url || '/Canal_youtube_dados',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || auth_key)
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