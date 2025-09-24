-- =============================================
-- Função: send_payment_success_email
-- Descrição: Trigger para envio de email quando pagamento é bem-sucedido
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.send_payment_success_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_customer RECORD;
    v_result JSONB;
BEGIN
    -- Buscar customer através da subscription
    SELECT c.email, c.name, s.plan_name
    INTO v_customer
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.id = NEW.subscription_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Subscription % not found', NEW.subscription_id;
        RETURN NEW;
    END IF;

    v_result := send_email(
        v_customer.email,
        'Payment Receipt - Liftlio',
        '<p>Loading receipt...</p>',
        NULL,
        '163c6b30-1f78-4a26-9b13-53ad2d4452f0',
        jsonb_build_object(
            'receiptNumber', 'REC-' || NEW.id,
            'paymentDate', to_char(NEW.created_at, 'DD/MM/YYYY'),
            'planName', COALESCE(v_customer.plan_name, 'Subscription'),
            'paymentMethod', 'Card',
            'amount', to_char(NEW.amount::numeric / 100, 'FM999G999D00'),
            'receiptLink', 'https://app.liftlio.com/receipts/' || NEW.id
        )
    );

    RAISE NOTICE 'Payment email sent to %: %', v_customer.email, v_result;
    RETURN NEW;
END;
$function$