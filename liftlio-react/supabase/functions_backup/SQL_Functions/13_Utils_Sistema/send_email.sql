-- =============================================
-- Função: send_email
-- Descrição: Envia emails usando Edge Function de automação
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.send_email(text, text, text, text, text, jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION public.send_email(
    recipient_email text,
    email_subject text,
    email_html text DEFAULT NULL::text,
    email_text text DEFAULT NULL::text,
    template_id text DEFAULT NULL::text,
    variables jsonb DEFAULT NULL::jsonb,
    actions jsonb DEFAULT NULL::jsonb,
    attachments jsonb DEFAULT NULL::jsonb,
    complexity text DEFAULT 'auto'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    auth_key TEXT;
    base_url TEXT;
    http_response http_response;
    request_body JSONB;
    recipients JSONB;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();

    -- Preparar array de destinatários
    IF recipient_email LIKE '[%' THEN
        -- É um array JSON
        recipients := recipient_email::jsonb;
    ELSE
        -- É um email único
        recipients := to_jsonb(ARRAY[recipient_email]);
    END IF;

    -- Obter chave de autenticação com fallback para helper function
    BEGIN
        auth_key := current_setting('app.settings.supabase_service_role_key', true);
        IF auth_key IS NULL THEN
            auth_key := current_setting('app.settings.supabase_anon_key', true);
        END IF;
        IF auth_key IS NULL THEN
            -- Usar helper function como fallback
            auth_key := get_edge_functions_anon_key();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Usar helper function em caso de erro
        auth_key := get_edge_functions_anon_key();
    END;

    -- Montar corpo da requisição
    request_body := jsonb_build_object(
        'to', recipients,
        'subject', email_subject,
        'complexity', complexity
    );

    -- Adicionar campos opcionais
    IF email_html IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('html', email_html);
    END IF;

    IF email_text IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('text', email_text);
    END IF;

    IF template_id IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('templateId', template_id);
    END IF;

    IF variables IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('variables', variables);
    END IF;

    IF actions IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('actions', actions);
    END IF;

    IF attachments IS NOT NULL THEN
        request_body := request_body || jsonb_build_object('attachments', attachments);
    END IF;

    -- Log para depuração
    RAISE NOTICE 'Ambiente: % | Enviando email para: %', base_url, recipients;

    -- Chamar Edge Function
    SELECT * INTO http_response
    FROM http((
        'POST',
        base_url || '/email-automation-engine',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || auth_key)
        ]::http_header[],
        'application/json',
        request_body::text
    )::http_request);

    -- Retornar resposta
    IF http_response.status = 200 THEN
        RETURN http_response.content::jsonb;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'HTTP Error: ' || http_response.status,
            'details', LEFT(http_response.content, 500)
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Exception: ' || SQLERRM
    );
END;
$function$;