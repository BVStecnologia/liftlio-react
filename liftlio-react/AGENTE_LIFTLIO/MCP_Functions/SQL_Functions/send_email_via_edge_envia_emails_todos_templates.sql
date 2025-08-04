-- =============================================
-- Função Universal para Envio de Emails via Edge Function
-- Criada: 02/02/2025
-- Atualizada: 02/02/2025 - Correção de autenticação
-- Testada com sucesso: Message ID 1986c865e9537bfb
-- =============================================

-- SEMPRE fazer DROP primeiro para evitar duplicação
DROP FUNCTION IF EXISTS send_email_via_edge(text, text, jsonb);

CREATE OR REPLACE FUNCTION send_email_via_edge(
    recipient_email TEXT,
    template_name TEXT,
    variables JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    http_response http_response;
    response JSONB;
    request_body text;
    timeout_ms integer := 30000;
    template_data RECORD;
    processed_html TEXT;
    processed_subject TEXT;
    var_key TEXT;
    var_value TEXT;
    template_id_var UUID;
    anon_key TEXT;
BEGIN
    -- Pegar a anon key do ambiente
    BEGIN
        anon_key := current_setting('app.settings.supabase_anon_key', true);
        IF anon_key IS NULL THEN
            anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
    END;
    
    -- Buscar template do banco
    SELECT * INTO template_data
    FROM email_templates
    WHERE name = template_name
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template not found: ' || template_name
        );
    END IF;
    
    template_id_var := template_data.id;
    
    -- Processar HTML e subject
    processed_html := template_data.html_content;
    processed_subject := template_data.subject;
    
    -- Substituir variáveis
    FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables) LOOP
        processed_html := REPLACE(processed_html, '{{' || var_key || '}}', var_value);
        processed_subject := REPLACE(processed_subject, '{{' || var_key || '}}', var_value);
    END LOOP;
    
    -- Remover emojis do subject
    processed_subject := REGEXP_REPLACE(processed_subject, '[^\x00-\x7F]', '', 'g');
    
    -- Preparar o corpo da requisição
    request_body := jsonb_build_object(
        'to', recipient_email,
        'subject', processed_subject,
        'html', processed_html,
        'complexity', 'high'
    )::text;
    
    -- Configurar o timeout
    PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);
    
    -- Log para depuração
    RAISE NOTICE 'Enviando email para: % com template: %', recipient_email, template_name;
    RAISE NOTICE 'Usando Bearer token: Bearer %...', LEFT(anon_key, 20);
    
    -- Fazer a chamada à Edge Function
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || anon_key)
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
        -- Registrar falha no log
        INSERT INTO email_logs (
            template_id, 
            recipients, 
            subject,
            status, 
            error,
            complexity,
            metadata
        ) VALUES (
            template_id_var,
            ARRAY[recipient_email],
            processed_subject,
            'failed',
            'HTTP Error: ' || http_response.status || ' - ' || http_response.content,
            'complex',
            jsonb_build_object(
                'variables', variables,
                'response', http_response.content,
                'status', http_response.status
            )
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'HTTP Error: ' || http_response.status,
            'details', http_response.content
        );
    END IF;
    
    -- Processar a resposta
    BEGIN
        response := http_response.content::jsonb;
        
        -- Registrar sucesso no log
        INSERT INTO email_logs (
            template_id,
            recipients,
            subject,
            status,
            message_id,
            complexity,
            processing_time,
            modifications,
            metadata
        ) VALUES (
            template_id_var,
            ARRAY[recipient_email],
            processed_subject,
            'sent',
            response->>'messageId',
            'complex',
            (response->>'processingTime')::integer,
            (response->>'htmlModifications')::integer,
            jsonb_build_object(
                'variables', variables,
                'response', response
            )
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'messageId', response->>'messageId',
            'template', template_name,
            'recipient', recipient_email
        );
    EXCEPTION WHEN OTHERS THEN
        -- Registrar erro no log
        INSERT INTO email_logs (
            template_id,
            recipients,
            subject,
            status,
            error,
            complexity,
            metadata
        ) VALUES (
            template_id_var,
            ARRAY[recipient_email],
            processed_subject,
            'failed',
            SQLERRM,
            'complex',
            jsonb_build_object('variables', variables)
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
    
EXCEPTION WHEN OTHERS THEN
    -- Garantir que as opções CURL sejam resetadas mesmo em caso de erro
    PERFORM http_reset_curlopt();
    
    -- Tentar registrar erro crítico no log (se possível)
    BEGIN
        INSERT INTO email_logs (
            template_id,
            recipients,
            subject,
            status,
            error,
            complexity,
            metadata
        ) VALUES (
            template_id_var,
            ARRAY[recipient_email],
            COALESCE(processed_subject, 'Email Error'),
            'failed',
            'Critical error: ' || SQLERRM,
            'complex',
            jsonb_build_object(
                'template_name', template_name,
                'variables', variables
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Se falhar o log, continuar
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Critical error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- EXEMPLOS DE USO
-- =============================================

-- 1. Email de boas-vindas
-- SELECT send_email_via_edge(
--     'seu-email@gmail.com',
--     'welcome-email',
--     '{"userName": "João Silva"}'::jsonb
-- );

-- 2. Email de pagamento confirmado
-- SELECT send_email_via_edge(
--     'cliente@email.com',
--     'payment-successful',
--     '{
--         "userName": "Maria",
--         "amount": "R$ 199,00",
--         "planName": "Premium",
--         "invoiceNumber": "INV-2025-001",
--         "nextBillingDate": "01 de Março de 2025"
--     }'::jsonb
-- );

-- 3. Ver últimos emails enviados
-- SELECT 
--     message_id,
--     template_id,
--     recipients,
--     subject,
--     status,
--     created_at
-- FROM email_logs
-- ORDER BY created_at DESC
-- LIMIT 5;

-- 4. Listar templates disponíveis
-- SELECT 
--     name,
--     subject,
--     description
-- FROM email_templates
-- WHERE active = true
-- ORDER BY name;