-- =============================================
-- Funo: call_api_edge_function
-- Descrio: Chama Edge Function para anlise de vdeos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.call_api_edge_function(text);

CREATE OR REPLACE FUNCTION public.call_api_edge_function(input_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    base_url TEXT;
    auth_key TEXT;
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();
    auth_key := get_edge_functions_anon_key();
    -- Preparar o corpo da requisio
    request_body := jsonb_build_object(
        'input_value', input_value
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depurao
    RAISE NOTICE 'Enviando requisio: %', request_body;

    -- Fazer a chamada  Edge Function com o nome correto do endpoint
    SELECT * INTO http_response
    FROM http((
        'POST',
        base_url || '/Analise_de_videos_novos_do_canal',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || auth_key)
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);

    -- Resetar as opes CURL
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
    -- Garantir que as opes CURL sejam resetadas mesmo em caso de erro
    PERFORM http_reset_curlopt();
    RAISE EXCEPTION 'Erro ao chamar a Edge Function: %', SQLERRM;
END;
$function$;