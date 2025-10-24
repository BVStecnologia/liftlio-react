-- =============================================
-- Função: desativar_projetos_sem_subscription
-- Descrição: Desativa projetos YouTube quando subscription expira após grace period (15 dias)
-- Criado: 2025-10-21
-- Execução: Cron diário às 09:00 (antes de check_subscriptions às 10:00)
-- =============================================

DROP FUNCTION IF EXISTS desativar_projetos_sem_subscription();

CREATE OR REPLACE FUNCTION public.desativar_projetos_sem_subscription()
RETURNS TABLE(
    total_desativados INTEGER,
    projetos_ids BIGINT[],
    status_mensagem TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_desativados INTEGER := 0;
    v_projetos_ids BIGINT[];
BEGIN
    -- Buscar e desativar projetos cujo usuário está sem subscription ativa após grace period
    WITH projetos_para_desativar AS (
        SELECT DISTINCT p.id
        FROM "Projeto" p
        JOIN customers c ON p."User id" = c.user_id
        JOIN subscriptions s ON c.id = s.customer_id
        WHERE p."Youtube Active" = TRUE
        AND s.grace_period_ends IS NOT NULL
        AND s.grace_period_ends < CURRENT_DATE
        AND s.status IN ('payment_failed', 'cancelled', 'suspended')
    ),
    projetos_atualizados AS (
        UPDATE "Projeto" p
        SET
            "Youtube Active" = FALSE
        FROM projetos_para_desativar pd
        WHERE p.id = pd.id
        RETURNING p.id
    )
    SELECT array_agg(id), COUNT(*)
    INTO v_projetos_ids, v_total_desativados
    FROM projetos_atualizados;

    -- Log da execução
    RAISE NOTICE 'Desativados % projetos por expira��o de subscription: %',
        v_total_desativados, v_projetos_ids;

    -- Retornar resultado
    total_desativados := v_total_desativados;
    projetos_ids := v_projetos_ids;
    status_mensagem := format(
        'Desativados %s projetos com subscription expirada após grace period',
        v_total_desativados
    );

    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION desativar_projetos_sem_subscription() IS
'Desativa projetos YouTube quando subscription expira após 15 dias de grace period. Executado via cron diário.';

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Ver quantos projetos seriam desativados (DRY RUN)
SELECT
    p.id,
    p."Project name",
    c.email,
    s.status,
    s.grace_period_ends,
    CURRENT_DATE - s.grace_period_ends as dias_expirado
FROM "Projeto" p
JOIN customers c ON p."User id" = c.user_id
JOIN subscriptions s ON c.id = s.customer_id
WHERE p."Youtube Active" = TRUE
AND s.grace_period_ends IS NOT NULL
AND s.grace_period_ends < CURRENT_DATE
AND s.status IN ('payment_failed', 'cancelled', 'suspended');

-- Teste 2: Executar desativação
SELECT * FROM desativar_projetos_sem_subscription();

-- Teste 3: Ver projetos desativados
SELECT
    p.id,
    p."Project name",
    p."Youtube Active",
    c.email
FROM "Projeto" p
JOIN customers c ON p."User id" = c.user_id
WHERE p."Youtube Active" = FALSE
ORDER BY p.updated_at DESC
LIMIT 10;
*/

-- =============================================
-- CRON JOB (configurar no Supabase Dashboard):
-- =============================================

/*
-- Nome: desativar_projetos_sem_subscription
-- Agendamento: 0 9 * * * (diário às 09:00 UTC)
-- Comando SQL:
SELECT desativar_projetos_sem_subscription();

-- Nota: Executar ANTES do cron check_subscriptions (10:00)
-- para garantir que projetos sem pagamento sejam desativados primeiro
*/
