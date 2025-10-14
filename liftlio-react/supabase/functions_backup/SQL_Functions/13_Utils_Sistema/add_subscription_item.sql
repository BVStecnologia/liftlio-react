-- =============================================
-- Função: add_subscription_item
-- Descrição: Adiciona item extra à assinatura
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.add_subscription_item(bigint, text, integer);

CREATE OR REPLACE FUNCTION public.add_subscription_item(sub_id bigint, description text, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE subscriptions
  SET extra_items = extra_items || jsonb_build_object(
    'description', description,
    'amount', amount,
    'added_at', NOW()
  )
  WHERE id = sub_id
  AND EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = subscriptions.customer_id
    AND customers.user_id = auth.uid()
  );
END;
$function$;