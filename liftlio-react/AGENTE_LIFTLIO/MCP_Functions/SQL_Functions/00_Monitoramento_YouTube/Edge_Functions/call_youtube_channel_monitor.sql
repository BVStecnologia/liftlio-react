-- =============================================
-- Função: call_youtube_channel_monitor
-- Descrição: Chama Edge Function para monitorar canal do YouTube
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS call_youtube_channel_monitor(TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION call_youtube_channel_monitor(
    channel_id text,
    time_filter text DEFAULT 'today'::text,
    simple_response boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 60000; -- 60 segundos
BEGIN
    -- Validar os parâmetros
    IF channel_id IS NULL OR channel_id = '' THEN
        RAISE EXCEPTION 'channel_id é obrigatório';
    END IF;

    -- Validar time_filter
    IF time_filter NOT IN ('today', 'week') THEN
        RAISE EXCEPTION 'time_filter deve ser "today" ou "week"';
    END IF;

    -- Preparar o corpo da requisição
    request_body := jsonb_build_object(
        'channelId', channel_id,
        'timeFilter', time_filter,
        'simpleResponse', simple_response
    )::text;

    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

    -- Log para depuração
    RAISE NOTICE 'Enviando requisição: %', request_body;

    -- Fazer a chamada à Edge Function
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/monitormanto_de_canal',
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
        -- Verificar se a resposta é simplesmente "NOT"
        IF http_response.content = '"NOT"' THEN
            RETURN jsonb_build_object('has_new_videos', false);
        END IF;

        response := http_response.content::jsonb;

        -- Se simpleResponse for true, a resposta será um array de IDs
        IF simple_response THEN
            RETURN jsonb_build_object(
                'has_new_videos', true,
                'video_ids', response
            );
        ELSE
            -- Se simpleResponse for false, a resposta já está no formato completo
            RETURN jsonb_build_object(
                'has_new_videos', true,
                'result', response
            );
        END IF;
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