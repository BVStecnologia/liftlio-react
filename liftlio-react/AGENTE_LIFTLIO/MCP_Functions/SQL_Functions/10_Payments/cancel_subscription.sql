-- =============================================
-- Função: cancel_subscription
-- Descrição: Cancela uma assinatura do usuário
-- Criado: 2025-01-23
-- Atualizado: Função para cancelar assinaturas com segurança
-- =============================================

DROP FUNCTION IF EXISTS cancel_subscription(bigint);

CREATE OR REPLACE FUNCTION public.cancel_subscription(sub_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE subscriptions
  SET
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE id = sub_id
  AND EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = subscriptions.customer_id
    AND customers.user_id = auth.uid()
  );
END;
$function$