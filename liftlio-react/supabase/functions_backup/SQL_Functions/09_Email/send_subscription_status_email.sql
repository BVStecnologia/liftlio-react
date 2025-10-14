-- =============================================
-- Função: send_subscription_status_email
-- Descrição: Trigger para envio de email quando status da subscription muda
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.send_subscription_status_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_customer RECORD;
    v_result JSONB;
    v_template_id TEXT;
    v_subject TEXT;
BEGIN
    RAISE NOTICE 'STATUS CHANGE: % -> %', OLD.status, NEW.status;

    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT c.email, c.name
    INTO v_customer
    FROM customers c
    WHERE c.id = NEW.customer_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'Customer not found: %', NEW.customer_id;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Customer found: %', v_customer.email;

    CASE NEW.status
        WHEN 'cancelled', 'suspended' THEN
            v_template_id := 'e53be6a1-2b45-4994-913d-54f4f08da1d1';
            v_subject := 'Subscription Suspended - Action Required';
        WHEN 'active' THEN
            IF OLD.status IN ('cancelled', 'suspended', 'payment_failed') THEN
                v_template_id := '2be95963-c2e5-4bc0-80b6-046d318dccef';
                v_subject := 'Subscription Reactivated!';
            ELSE
                RETURN NEW;
            END IF;
        ELSE
            RETURN NEW;
    END CASE;

    RAISE NOTICE 'Sending email with template: %', v_template_id;

    v_result := send_email(
        v_customer.email,
        v_subject,
        '<p>Loading...</p>',
        NULL,
        v_template_id,
        jsonb_build_object(
            'userName', COALESCE(v_customer.name, 'Customer'),
            'planName', NEW.plan_name,
            'planPrice', to_char(NEW.base_amount::numeric / 100, 'FM999G999D00'),
            'nextBillingDate', to_char(NEW.next_billing_date, 'DD/MM/YYYY'),
            'planFeatures', '[]',
            'dashboardLink', 'https://liftlio.com/dashboard?',
            'reactivateLink', 'https://liftlio.com/dashboard'
        )
    );

    RAISE NOTICE 'Email result: %', v_result;
    RETURN NEW;
END;
$function$