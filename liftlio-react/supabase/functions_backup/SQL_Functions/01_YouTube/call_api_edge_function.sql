-- =============================================
-- Fun��o: call_api_edge_function
-- Descri��o: Chama Edge Function para an�lise de v�deos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.call_api_edge_function(text);

CREATE OR REPLACE FUNCTION public.call_api_edge_function(input_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
BEGIN
    -- Preparar o corpo da requisi��o
    request_body := jsonb_build_object(
        'input_value', input_value
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depura��o
    RAISE NOTICE 'Enviando requisi��o: %', request_body;

    -- Fazer a chamada � Edge Function com o nome correto do endpoint
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/Analise_de_videos_novos_do_canal',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I')
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);

    -- Resetar as op��es CURL
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
    -- Garantir que as op��es CURL sejam resetadas mesmo em caso de erro
    PERFORM http_reset_curlopt();
    RAISE EXCEPTION 'Erro ao chamar a Edge Function: %', SQLERRM;
END;
$function$;