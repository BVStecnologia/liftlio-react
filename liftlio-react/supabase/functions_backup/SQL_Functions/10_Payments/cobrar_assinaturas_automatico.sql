-- =============================================
-- Função: cobrar_assinaturas_automatico
-- Descrição: Processo automático para cobrar todas as assinaturas (SANDBOX + PRODUÇÃO)
-- Criado: 2025-01-23
-- Atualizado: Sistema de cobrança automática balanceado
-- =============================================

DROP FUNCTION IF EXISTS cobrar_assinaturas_automatico();

CREATE OR REPLACE FUNCTION public.cobrar_assinaturas_automatico()
 RETURNS TABLE(subscription_id bigint, plan_name text, amount integer, payment_status text, payment_id text, ambiente text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- SANDBOX - 10 por vez
    RETURN QUERY
    SELECT
        sub.subscription_id,
        sub.plan_name,
        sub.amount,
        sub.payment_status,
        sub.payment_id,
        'SANDBOX'::TEXT as ambiente
    FROM cobrar_assinaturas_hoje(false, 10) sub;

    -- PRODUÇÃO - 20 por vez
    RETURN QUERY
    SELECT
        sub.subscription_id,
        sub.plan_name,
        sub.amount,
        sub.payment_status,
        sub.payment_id,
        'PRODUÇÃO'::TEXT as ambiente
    FROM cobrar_assinaturas_hoje(true, 20) sub;
END;
$function$