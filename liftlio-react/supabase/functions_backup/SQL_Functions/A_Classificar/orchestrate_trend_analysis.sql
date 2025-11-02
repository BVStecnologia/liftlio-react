-- =============================================
-- Função: orchestrate_trend_analysis
-- Descrição: Orquestra análise de tendências disparando Edge Functions
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.orchestrate_trend_analysis()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    start_time timestamp;
    base_url TEXT;
    auth_key TEXT;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();
    auth_key := get_edge_functions_anon_key();
    start_time := clock_timestamp();

    -- Disparar Positive Trends (fire and forget)
    BEGIN
        -- Configurar timeout baixo e desabilitar sinais
        PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', '1000');
        PERFORM http_set_curlopt('CURLOPT_NOSIGNAL', '1');

        -- Fazer a chamada
        PERFORM http((
            'POST',
            base_url || '/Positive-trends',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || auth_key)
            ]::http_header[],
            'application/json',
            '{
                "max_results": 50,
                "min_video_count": 3,
                "min_channel_count": 2,
                "save_to_supabase": true
            }'
        )::http_request);

        -- Resetar opções
        PERFORM http_reset_curlopt();

    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros de timeout (esperados)
        PERFORM http_reset_curlopt();
    END;

    -- Pequena pausa entre chamadas
    PERFORM pg_sleep(0.1);

    -- Disparar Negative Trends (fire and forget)
    BEGIN
        -- Configurar timeout baixo e desabilitar sinais
        PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', '1000');
        PERFORM http_set_curlopt('CURLOPT_NOSIGNAL', '1');

        -- Fazer a chamada
        PERFORM http((
            'POST',
            base_url || '/negative-trends',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || auth_key)
            ]::http_header[],
            'application/json',
            '{
                "max_results": 30,
                "min_video_count": 5,
                "min_channel_count": 3,
                "min_growth_threshold": -10,
                "save_to_supabase": true
            }'
        )::http_request);

        -- Resetar opções
        PERFORM http_reset_curlopt();

    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros de timeout (esperados)
        PERFORM http_reset_curlopt();
    END;

    -- Retornar resultado simples
    RETURN jsonb_build_object(
        'status', 'triggered',
        'timestamp', start_time,
        'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER,
        'message', 'Trend analysis edge functions triggered successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- Garantir reset das opções curl em caso de erro
    PERFORM http_reset_curlopt();
    RETURN jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$function$