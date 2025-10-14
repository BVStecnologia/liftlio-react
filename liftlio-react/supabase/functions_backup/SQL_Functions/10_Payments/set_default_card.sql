-- =============================================
-- Função: set_default_card
-- Descrição: Define um cartão como padrão e atualiza assinatura ativa
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.set_default_card(p_card_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_customer_id BIGINT;
    v_user_id UUID;
    v_subscription_id BIGINT;
BEGIN
    -- Verificar se o cartão pertence ao usuário
    SELECT c.customer_id, cu.user_id
    INTO v_customer_id, v_user_id
    FROM cards c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE c.id = p_card_id
    AND c.is_active = true
    AND cu.user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Card not found or does not belong to user'
        );
    END IF;

    -- Desmarcar todos os outros cartões como default
    UPDATE cards
    SET is_default = false
    WHERE customer_id = v_customer_id
    AND id != p_card_id;

    -- Marcar o novo como default
    UPDATE cards
    SET is_default = true
    WHERE id = p_card_id;

    -- Atualizar assinatura ativa para usar este cartão
    UPDATE subscriptions s
    SET card_id = p_card_id
    FROM customers c
    WHERE s.customer_id = c.id
    AND c.user_id = v_user_id
    AND s.status IN ('active', 'cancelled')
    AND s.next_billing_date >= CURRENT_DATE
    RETURNING s.id INTO v_subscription_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Default card updated',
        'card_id', p_card_id,
        'subscription_updated', v_subscription_id IS NOT NULL
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Error: ' || SQLERRM
    );
END;
$function$