-- =============================================
-- Função: send_welcome_email_on_customer_create
-- Descrição: Trigger para envio de email de boas-vindas quando customer é criado
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.send_welcome_email_on_customer_create()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    v_result := send_email(
        NEW.email,
        'Welcome to Liftlio!',  -- Sem emoji
        '<p>Loading template...</p>',  -- HTML mínimo obrigatório
        NULL,
        '71e3597d-3b78-4604-837f-5ced12241f46',
        jsonb_build_object(
            'userName', COALESCE(NEW.name, 'Usuario'),
            'dashboardLink', 'https://liftlio.com/dashboard?',
            'helpCenterLink', 'https://liftlio.com/dashboard?',
            'videoTutorialLink', 'https://liftlio.com/dashboard?',
            'apiDocsLink', 'https://liftlio.com/dashboard?'
        ),
        NULL,
        NULL,
        'simple'
    );

    RAISE NOTICE 'Welcome email sent to %: %', NEW.email, v_result;
    RETURN NEW;
END;
$function$