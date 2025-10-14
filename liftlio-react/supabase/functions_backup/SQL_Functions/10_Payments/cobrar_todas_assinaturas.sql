-- =============================================
-- Função: cobrar_todas_assinaturas
-- Descrição: Processa todas as assinaturas (SANDBOX e PRODUÇÃO) com limites balanceados
-- Criado: 2025-01-23
-- Atualizado: Sistema completo de cobrança para ambos ambientes
-- =============================================

DROP FUNCTION IF EXISTS cobrar_todas_assinaturas();

CREATE OR REPLACE FUNCTION public.cobrar_todas_assinaturas()
 RETURNS TABLE(subscription_id bigint, plan_name text, amount integer, payment_status text, payment_id text, error_message text, ambiente text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Cobrar SANDBOX (limit 20)
    RETURN QUERY
    SELECT
        sub.subscription_id,
        sub.plan_name,
        sub.amount,
        sub.payment_status,
        sub.payment_id,
        sub.error_message,
        'SANDBOX'::TEXT as ambiente
    FROM cobrar_assinaturas_hoje(false, 20) sub;

    -- Cobrar PRODUÇÃO (limit 50)
    RETURN QUERY
    SELECT
        sub.subscription_id,
        sub.plan_name,
        sub.amount,
        sub.payment_status,
        sub.payment_id,
        sub.error_message,
        'PRODUÇÃO'::TEXT as ambiente
    FROM cobrar_assinaturas_hoje(true, 50) sub;
END;
$function$