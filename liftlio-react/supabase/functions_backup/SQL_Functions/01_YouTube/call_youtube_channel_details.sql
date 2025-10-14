-- =============================================
-- Função: call_youtube_channel_details
-- Descrição: Chama Edge Function para obter detalhes do canal YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.call_youtube_channel_details(text);

CREATE OR REPLACE FUNCTION public.call_youtube_channel_details(channel_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
BEGIN
    -- Preparar o corpo da requisição
    request_body := jsonb_build_object(
        'channelId', channel_id
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depuração
    RAISE NOTICE 'Enviando requisição: %', request_body;

    -- Fazer a chamada à Edge Function
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/Canal_youtube_dados',
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
$function$;