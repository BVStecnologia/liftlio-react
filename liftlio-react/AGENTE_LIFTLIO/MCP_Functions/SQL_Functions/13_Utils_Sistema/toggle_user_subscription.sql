-- =============================================
-- Função: toggle_user_subscription
-- Descrição: Cancela ou reativa assinatura do usuário
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.toggle_user_subscription();

CREATE OR REPLACE FUNCTION public.toggle_user_subscription()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_subscription_id BIGINT;
    v_next_billing DATE;
    v_current_status TEXT;
    v_new_status TEXT;
    v_action TEXT;
BEGIN
    -- Buscar assinatura do usuário (ativa ou cancelada com vigência)
    SELECT s.id, s.next_billing_date, s.status
    INTO v_subscription_id, v_next_billing, v_current_status
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    WHERE c.user_id = auth.uid()
    AND s.status IN ('active', 'cancelled')
    AND s.next_billing_date >= CURRENT_DATE
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No active or valid cancelled subscription found'
        );
    END IF;

    -- Determinar ação baseada no status atual
    IF v_current_status = 'active' THEN
        -- Cancelar
        v_new_status := 'cancelled';
        v_action := 'cancelled';

        UPDATE subscriptions
        SET
            status = 'cancelled',
            cancelled_at = NOW()
        WHERE id = v_subscription_id;

    ELSIF v_current_status = 'cancelled' THEN
        -- Reativar
        v_new_status := 'active';
        v_action := 'reactivated';

        UPDATE subscriptions
        SET
            status = 'active',
            cancelled_at = NULL
        WHERE id = v_subscription_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'message', 'Subscription ' || v_action || ' successfully',
        'new_status', v_new_status,
        'active_until', v_next_billing,
        'will_renew', CASE WHEN v_new_status = 'active' THEN true ELSE false END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Error: ' || SQLERRM
    );
END;
$function$;