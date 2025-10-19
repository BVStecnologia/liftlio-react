-- =============================================
-- Fun��o: youtube_transcribe
-- Descri��o: Obt�m transcri��o de v�deos do YouTube (limita a 30 minutos)
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.youtube_transcribe(video_id text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    http_response http_response;
    video_url TEXT;
    full_transcription TEXT;
    timestamp_pattern TEXT := '\[([0-9]{2}):([0-9]{2}):([0-9]{2})\]';
    timestamp_matches TEXT[];
    current_line TEXT;
    result TEXT := '';
    found_over_30min BOOLEAN := FALSE;
BEGIN
    -- Construir a URL completa do YouTube usando o ID do v�deo
    video_url := 'https://www.youtube.com/watch?v=' || video_id;

    -- Aumentar o timeout para 5 minutos (300000 milliseconds)
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', '300000');

    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://transcricao.liftlio.com/transcribe',
        ARRAY[
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{"url": "' || video_url || '"}'
    )::http_request);

    -- Resetar o timeout para n�o afetar outras chamadas
    PERFORM http_reset_curlopt();

    -- Pega transcri��o completa
    full_transcription := (http_response.content::jsonb->>'transcription');

    -- Se n�o houver conte�do de transcri��o, retornar NULL
    IF full_transcription IS NULL OR full_transcription = '' THEN
        RETURN NULL;
    END IF;

    -- Processar a transcri��o linha por linha
    FOR current_line IN
        SELECT unnest(string_to_array(full_transcription, E'\n'))
    LOOP
        -- Extrair timestamp usando regex
        timestamp_matches := regexp_matches(current_line, timestamp_pattern, 'g');

        -- Se encontrou timestamp, verificar se � < 30 minutos
        IF array_length(timestamp_matches, 1) > 0 THEN
            -- Converter horas, minutos, segundos para total de segundos
            IF (timestamp_matches[1]::integer * 3600 +
                timestamp_matches[2]::integer * 60 +
                timestamp_matches[3]::integer) <= 1800 THEN -- 30 minutos = 1800 segundos
                -- Adicionar linha ao resultado se estiver dentro do limite de 30 minutos
                result := result || current_line || E'\n';
            ELSE
                -- Marcar que encontramos um timestamp > 30 minutos
                found_over_30min := TRUE;
                -- Parar processamento ao encontrar o primeiro timestamp > 30 minutos
                EXIT;
            END IF;
        ELSE
            -- Adicionar linhas sem timestamp (headers, etc)
            result := result || current_line || E'\n';
        END IF;
    END LOOP;

    -- Se n�o encontramos um timestamp que ultrapasse 30 minutos,
    -- retornamos a transcri��o completa
    IF NOT found_over_30min THEN
        RETURN full_transcription;
    END IF;

    RETURN result;
END;
$function$