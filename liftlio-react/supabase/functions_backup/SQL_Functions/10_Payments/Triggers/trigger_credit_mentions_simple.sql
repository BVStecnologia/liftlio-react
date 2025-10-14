-- =============================================
-- Trigger: Creditar Mentions (VERSÃO SIMPLES SEM DELAY)
-- Descrição: Adiciona Mentions ao customer quando pagamento é completado
-- Criado: 2025-10-04
-- Autor: Supabase MCP Expert Agent
--
-- VERSÃO SIMPLIFICADA:
-- - SEM delay assíncrono (evita erro "updated_by")
-- - SEM SECURITY DEFINER (evita conflitos RLS)
-- - Baseado no plano da subscription:
--   * Starter: 80 mentions
--   * Growth: 210 mentions
--   * Scale: 500 mentions
-- =============================================

-- 1. Dropar função antiga se existir
DROP FUNCTION IF EXISTS credit_mentions_on_payment_simple() CASCADE;

-- 2. Criar função SIMPLES (sem SECURITY DEFINER)
CREATE OR REPLACE FUNCTION credit_mentions_on_payment_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id INT;
  v_plan_name TEXT;
  v_mentions_to_add INT := 0;
BEGIN
  -- Buscar customer_id e plano através da subscription
  SELECT
    s.customer_id,
    s.plan_name
  INTO
    v_customer_id,
    v_plan_name
  FROM subscriptions s
  WHERE s.id = NEW.subscription_id;

  -- Se não encontrou subscription, retornar
  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determinar quantidade de Mentions baseado no plano
  v_mentions_to_add := CASE v_plan_name
    WHEN 'Starter' THEN 80
    WHEN 'Growth' THEN 210
    WHEN 'Scale' THEN 500
    ELSE 0
  END;

  -- Se plano reconhecido, creditar
  IF v_mentions_to_add > 0 THEN
    UPDATE customers
    SET "Mentions" = COALESCE("Mentions", 0) + v_mentions_to_add
    WHERE id = v_customer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Dropar trigger antiga se existir
DROP TRIGGER IF EXISTS trigger_credit_mentions_simple ON payments;

-- 4. Criar trigger SIMPLES
CREATE TRIGGER trigger_credit_mentions_simple
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'paid', 'succeeded'))
  EXECUTE FUNCTION credit_mentions_on_payment_simple();

-- 5. Comentário de documentação
COMMENT ON FUNCTION credit_mentions_on_payment_simple() IS
'Credita Mentions ao customer quando pagamento é completado (versão simples sem delay)';

COMMENT ON TRIGGER trigger_credit_mentions_simple ON payments IS
'Trigger que credita Mentions baseado no plano quando payment.status = completed/paid/succeeded';
