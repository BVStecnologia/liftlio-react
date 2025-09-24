-- =============================================
-- Função: check_user_subscription
-- Descrição: Verifica status da assinatura do usuário
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.check_user_subscription();

CREATE OR REPLACE FUNCTION public.check_user_subscription()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_subscription RECORD;
BEGIN
    -- Buscar QUALQUER assinatura do usuário (incluindo canceladas)
    SELECT
        s.id,
        s.plan_name,
        s.status,
        s.next_billing_date,
        s.is_production,
        s.cancelled_at,
        s.created_at,
        c."Mentions" as mentions_available,
        -- Lógica completa de ativo
        CASE
            WHEN s.status = 'active' AND s.next_billing_date >= CURRENT_DATE THEN true
            WHEN s.status = 'cancelled' AND s.next_billing_date >= CURRENT_DATE THEN true
            WHEN s.next_billing_date >= CURRENT_DATE - INTERVAL '3 days' THEN true -- Grace period
            ELSE false
        END as is_active,
        -- Flag específica para cancelada com vigência
        CASE
            WHEN s.status = 'cancelled' AND s.next_billing_date >= CURRENT_DATE THEN true
            ELSE false
        END as is_cancelled_with_access
    INTO v_subscription
    FROM subscriptions s
    INNER JOIN customers c ON s.customer_id = c.id
    WHERE c.user_id = auth.uid()
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- Se não encontrou assinatura
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_active_subscription', false,
            'subscription', null,
            'mentions_available', 0,
            'is_cancelled_with_access', false,
            'message', 'No active subscription found'
        );
    END IF;

    -- Retornar dados da assinatura
    RETURN jsonb_build_object(
        'has_active_subscription', v_subscription.is_active,
        'mentions_available', COALESCE(v_subscription.mentions_available, 0),
        'is_cancelled_with_access', v_subscription.is_cancelled_with_access,
        'subscription', jsonb_build_object(
            'id', v_subscription.id,
            'plan_name', v_subscription.plan_name,
            'status', v_subscription.status,
            'next_billing_date', v_subscription.next_billing_date,
            'is_production', v_subscription.is_production,
            'cancelled_at', v_subscription.cancelled_at,
            'is_in_grace_period',
                CASE
                    WHEN v_subscription.next_billing_date < CURRENT_DATE
                         AND v_subscription.next_billing_date >= CURRENT_DATE - INTERVAL '3 days'
                    THEN true
                    ELSE false
                END,
            'days_until_billing',
                CASE
                    WHEN v_subscription.status = 'cancelled' THEN 0
                    WHEN v_subscription.next_billing_date >= CURRENT_DATE
                    THEN v_subscription.next_billing_date - CURRENT_DATE
                    ELSE 0
                END,
            'mentions_limit',
                CASE v_subscription.plan_name
                    WHEN 'Starter' THEN 80
                    WHEN 'Growth' THEN 210
                    WHEN 'Scale' THEN 500
                    ELSE 0
                END
        )
    );

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retornar como sem assinatura (fail safe)
    RETURN jsonb_build_object(
        'has_active_subscription', false,
        'subscription', null,
        'mentions_available', 0,
        'is_cancelled_with_access', false,
        'message', 'Error checking subscription: ' || SQLERRM
    );
END;
$function$;