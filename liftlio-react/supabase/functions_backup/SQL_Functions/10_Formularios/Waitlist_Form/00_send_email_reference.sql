-- =============================================
-- Função: send_email
-- Descrição: Envia emails usando o sistema de automação do Liftlio
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.send_email(text, text, text, text, text, jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION public.send_email(
    recipient_email text,
    email_subject text,
    email_html text DEFAULT NULL,
    email_text text DEFAULT NULL,
    template_id text DEFAULT NULL,
    variables jsonb DEFAULT NULL,
    actions jsonb DEFAULT NULL,
    attachments jsonb DEFAULT NULL,
    complexity text DEFAULT 'auto'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    auth_key TEXT;
    http_response http_response;
    request_body JSONB;
    recipients JSONB;
    base_url TEXT;
    auth_key TEXT;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();
    auth_key := get_edge_functions_anon_key();
    -- Preparar array de destinatários
    IF recipient_email LIKE '[%' THEN
        -- É um array JSON
        recipients := recipient_email::jsonb;
    ELSE
        -- É um email único
        recipients := to_jsonb(ARRAY[recipient_email]);
    END IF;
    
    -- Obter chave de autenticação
    BEGIN
        auth_key := current_setting('app.settings.supabase_service_role_key', true);
        IF auth_key IS NULL THEN
            auth_key := current_setting('app.settings.supabase_anon_key', true);
        END IF;
        IF auth_key IS NULL THEN
            -- Use sua chave anon como fallback
            auth_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        auth_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
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