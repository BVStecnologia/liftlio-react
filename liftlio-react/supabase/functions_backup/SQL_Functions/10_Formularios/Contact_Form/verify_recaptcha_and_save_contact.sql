-- =============================================
-- Função: verify_recaptcha_and_save_contact
-- Descrição: Verifica reCAPTCHA score e salva contato se humano
-- Criado: 2025-01-29
-- =============================================

-- Instalar extensão se não tiver
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS http;

DROP FUNCTION IF EXISTS public.verify_recaptcha_and_save_contact(text, jsonb);

CREATE OR REPLACE FUNCTION public.verify_recaptcha_and_save_contact(
    recaptcha_token text,
    form_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    http_response http_response;
    verify_result jsonb;
    recaptcha_score numeric;
    min_score numeric := 0.5;
    secret_key text := '6LdH-NgrAAAAAKORW7Rxw4uwHwh0AZmkUmTcCQPK';
    verify_url text;
    result_id uuid;
BEGIN
    -- Validate input
    IF recaptcha_token IS NULL OR recaptcha_token = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'reCAPTCHA token not provided'
        );
    END IF;

    -- Build verification URL
    verify_url := format(
        'https://www.google.com/recaptcha/api/siteverify?secret=%s&response=%s',
        secret_key,
        recaptcha_token
    );

    -- Make HTTP call to Google reCAPTCHA
    SELECT * INTO http_response
    FROM http((
        'POST',
        verify_url,
        ARRAY[http_header('Content-Type', 'application/x-www-form-urlencoded')]::http_header[],
        'application/x-www-form-urlencoded',
        ''
    )::http_request);

    -- Check response
    IF http_response.status != 200 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to verify reCAPTCHA',
            'details', http_response.content
        );
    END IF;

    -- Parse response
    verify_result := http_response.content::jsonb;

    -- Check if validation was successful
    IF NOT (verify_result->>'success')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'reCAPTCHA verification failed',
            'error_codes', verify_result->'error-codes'
        );
    END IF;

    -- Get the score
    recaptcha_score := (verify_result->>'score')::numeric;

    -- CHECK IF IT'S A BOT
    IF recaptcha_score < min_score THEN
        -- Log blocked attempt
        INSERT INTO public.blocked_submissions (
            form_data,
            recaptcha_score,
            blocked_at,
            reason
        ) VALUES (
            form_data,
            recaptcha_score,
            now(),
            'low_recaptcha_score'
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bot detected! Your submission has been blocked.',
            'score', recaptcha_score
        );
    END IF;

    -- SCORE OK - IT'S HUMAN! Save contact
    INSERT INTO public.contact_submissions (
        name,
        email,
        company,
        phone,
        subject,
        message,
        status,
        metadata,
        created_at
    ) VALUES (
        form_data->>'name',
        form_data->>'email',
        form_data->>'company',
        form_data->>'phone',
        form_data->>'subject',
        form_data->>'message',
        'new',
        jsonb_build_object(
            'recaptchaToken', recaptcha_token,
            'recaptchaScore', recaptcha_score,
            'timestamp', now(),
            'action', verify_result->>'action'
        ),
        now()
    )
    RETURNING id INTO result_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Message sent successfully!',
        'score', recaptcha_score,
        'id', result_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Error processing request',
        'details', SQLERRM
    );
END;
$$;

-- Criar tabela para tentativas bloqueadas (opcional)
CREATE TABLE IF NOT EXISTS public.blocked_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_data jsonb,
    recaptcha_score numeric,
    blocked_at timestamp with time zone DEFAULT now(),
    reason text
);

-- Grants
GRANT EXECUTE ON FUNCTION public.verify_recaptcha_and_save_contact TO anon;
GRANT EXECUTE ON FUNCTION public.verify_recaptcha_and_save_contact TO authenticated;