-- =============================================
-- Função: get_user_cards
-- Descrição: Retorna todos os cartões ativos do usuário com informações de assinatura
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_cards()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'last_4', c.last_4,
            'brand', c.brand,
            'exp_month', c.exp_month,
            'exp_year', c.exp_year,
            'is_default', c.is_default,
            'is_active', c.is_active,
            'is_subscription_card', EXISTS(
                SELECT 1 FROM subscriptions s
                WHERE s.card_id = c.id
                AND s.status IN ('active', 'cancelled')
                AND s.next_billing_date >= CURRENT_DATE
            )
        ) ORDER BY c.is_default DESC, c.created_at DESC
    )
    INTO v_result
    FROM cards c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE cu.user_id = auth.uid()
    AND c.is_active = true;

    RETURN COALESCE(v_result, '[]'::json);
END;
$function$