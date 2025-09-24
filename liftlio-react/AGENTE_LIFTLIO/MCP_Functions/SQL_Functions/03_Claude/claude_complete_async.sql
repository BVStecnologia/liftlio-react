-- =============================================
-- Fun��o: claude_complete_async
-- Descri��o: Executa chamadas Claude de forma ass�ncrona usando pg_background
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.claude_complete_async(user_prompt text, system_prompt text DEFAULT 'voc� � um professor'::text, max_tokens integer DEFAULT 4000, temperature double precision DEFAULT 0.1)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    job_id BIGINT;
    result TEXT;
    start_time TIMESTAMP;
    max_wait_time INTERVAL = '30 seconds'; -- Ajuste conforme necess�rio
BEGIN
    -- Iniciar o job em background
    SELECT bg_job_id INTO job_id
    FROM pg_background_launch('
        SELECT claude_complete_worker($1, $2, $3, $4)
    ', user_prompt, system_prompt, max_tokens, temperature);

    -- Registrar o tempo de in�cio
    start_time := clock_timestamp();

    -- Aguardar o resultado com timeout
    LOOP
        -- Verificar se o job foi conclu�do
        SELECT result INTO result
        FROM pg_background_result(job_id) AS (result TEXT);

        IF FOUND THEN
            -- Job conclu�do, retornar o resultado
            RETURN result;
        END IF;

        -- Verificar se excedeu o tempo m�ximo de espera
        IF clock_timestamp() - start_time > max_wait_time THEN
            RAISE EXCEPTION 'Timeout esperando resposta da API';
        END IF;

        -- Aguardar um curto intervalo antes de verificar novamente
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$function$