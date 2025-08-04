-- =============================================
-- Função Final e Completa para Envio de Emails
-- Usa Edge Function wrapper para autenticação correta
-- Testada com sucesso em 02/02/2025
-- Message IDs de teste:
--   - Welcome: 1986c9c11bd7ecbf
--   - Payment: 1986ca7b6127cee7
-- =============================================

-- SEMPRE fazer DROP primeiro para evitar duplicação
DROP FUNCTION IF EXISTS send_email_complete(text, text, jsonb);

CREATE OR REPLACE FUNCTION send_email_complete(
    recipient_email TEXT,
    template_name TEXT,
    variables JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    http_response http_response;
    response JSONB;
    request_body TEXT;
    auth_key TEXT;
    vars_copy JSONB := variables; -- Cópia para evitar conflito de nomes
BEGIN
    -- Tentar pegar a chave do ambiente primeiro
    BEGIN
        -- Tenta service role key primeiro (mais permissões)
        auth_key := current_setting('app.settings.supabase_service_role_key', true);
        
        -- Se não encontrar, tenta anon key
        IF auth_key IS NULL THEN
            auth_key := current_setting('app.settings.supabase_anon_key', true);
        END IF;
        
        -- Se ainda não encontrar, usa a anon key hardcoded
        IF auth_key IS NULL THEN
            auth_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, usa anon key padrão
        auth_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
    END;
    
    -- Preparar requisição
    request_body := jsonb_build_object(
        'recipient_email', recipient_email,
        'template_name', template_name,
        'variables', vars_copy
    )::text;
    
    -- Chamar Edge Function wrapper (send-email-wrapper)
    SELECT * INTO http_response
    FROM http((
        'POST',
        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/send-email-wrapper',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || auth_key)
        ]::http_header[],
        'application/json',
        request_body
    )::http_request);
    
    -- Processar resposta
    IF http_response.status = 200 THEN
        response := http_response.content::jsonb;
        
        -- Registrar sucesso se enviou
        IF (response->>'success')::boolean = true THEN
            INSERT INTO email_logs (
                template_id,
                recipients,
                subject,
                status,
                message_id,
                complexity,
                metadata
            ) 
            SELECT 
                et.id,
                ARRAY[recipient_email],
                et.subject,
                'sent',
                response->>'messageId',
                'complex',
                jsonb_build_object(
                    'variables', vars_copy,
                    'sent_via', 'send_email_complete',
                    'response', response
                )
            FROM email_templates et
            WHERE et.name = template_name;
        END IF;
        
        RETURN response;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'HTTP Error: ' || http_response.status,
            'details', LEFT(http_response.content, 200)
        );
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Exception: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- EXEMPLOS DE USO - TESTADOS E FUNCIONANDO
-- =============================================

-- 1. Email de boas-vindas
-- SELECT send_email_complete(
--     'usuario@email.com',
--     'welcome-email',
--     '{"userName": "João Silva"}'::jsonb
-- );
-- Resultado esperado: {"success": true, "messageId": "xxx", "template": "welcome-email", "recipient": "usuario@email.com"}

-- 2. Email de pagamento confirmado
-- SELECT send_email_complete(
--     'cliente@email.com',
--     'payment-successful',
--     '{
--         "userName": "Maria Santos",
--         "amount": "R$ 199,00",
--         "planName": "Premium",
--         "invoiceNumber": "INV-2025-001"
--     }'::jsonb
-- );

-- 3. Email de recuperação de senha
-- SELECT send_email_complete(
--     'usuario@email.com',
--     'password-reset',
--     '{"userName": "João", "resetLink": "https://app.liftlio.com/reset?token=abc123"}'::jsonb
-- );

-- 4. Ver últimos emails enviados
-- SELECT 
--     message_id,
--     recipients,
--     subject,
--     status,
--     created_at
-- FROM email_logs
-- WHERE status = 'sent'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- =============================================
-- NOTAS IMPORTANTES
-- =============================================
-- 1. Esta função REALMENTE ENVIA emails (não apenas prepara)
-- 2. Requer que a Edge Function 'send-email-wrapper' esteja deployada
-- 3. Usa SECURITY DEFINER para garantir permissões adequadas
-- 4. Registra automaticamente em email_logs
-- 5. Funciona com TODOS os 14 templates de email disponíveis