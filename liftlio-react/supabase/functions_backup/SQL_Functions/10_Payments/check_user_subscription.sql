-- =============================================
-- Função: check_user_subscription
-- Descrição: Verifica status da assinatura do usuário E waitlist
-- Criado: 2025-01-23
-- Atualizado: 2025-11-01 - BUGFIX: Corrigido c."Mentions" → c.mentions (case-sensitive)
-- Lógica: Subscription PRIMEIRO, depois waitlist
-- =============================================

DROP FUNCTION IF EXISTS public.check_user_subscription();

CREATE OR REPLACE FUNCTION public.check_user_subscription()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_result JSONB;
    v_subscription RECORD;
    v_user_email TEXT;
    v_waitlist_status TEXT;
    v_invitation_sent_at TIMESTAMPTZ;
    v_waitlist_approved BOOLEAN := false;
    v_has_active_subscription BOOLEAN := false;
BEGIN
    -- ========================================
    -- 1. BUSCAR EMAIL DO USUÁRIO LOGADO
    -- ========================================
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = auth.uid();

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'waitlist_approved', false,
            'has_active_subscription', false,
            'can_access_checkout', false,
            'can_access_dashboard', false,
            'message', 'User not authenticated'
        );
    END IF;

    -- ========================================
    -- 2. VERIFICAR SUBSCRIPTION PRIMEIRO
    -- ========================================
    SELECT
        s.id,
        s.plan_name,
        s.status,
        s.next_billing_date,
        s.is_production,
        s.cancelled_at,
        s.created_at,
        c.mentions as mentions_available,  -- ✅ FIXED: was c."Mentions" (case-sensitive bug)
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

    -- Determinar se tem subscription ativa
    IF FOUND THEN
        v_has_active_subscription := v_subscription.is_active;
    ELSE
        v_has_active_subscription := false;
    END IF;

    -- ========================================
    -- 3. VERIFICAR STATUS NA WAITLIST
    -- ========================================
    SELECT
        status,
        invitation_sent_at
    INTO
        v_waitlist_status,
        v_invitation_sent_at
    FROM public.waitlist
    WHERE email = v_user_email
    LIMIT 1;

    -- Usuário está aprovado se recebeu convite (invitation_sent_at NOT NULL E status = 'approved')
    v_waitlist_approved := (v_invitation_sent_at IS NOT NULL AND v_waitlist_status = 'approved');

    -- ========================================
    -- 4. APLICAR LÓGICA DE ACESSO
    -- ========================================

    -- CASO 1: TEM SUBSCRIPTION ATIVA → Acesso completo (ignora waitlist)
    IF v_has_active_subscription THEN
        RETURN jsonb_build_object(
            'success', true,
            'waitlist_approved', COALESCE(v_waitlist_approved, true), -- Ignora waitlist se já é cliente
            'waitlist_status', COALESCE(v_waitlist_status, 'not_applicable'),
            'has_active_subscription', true,
            'can_access_checkout', true,  -- ✅ Pode gerenciar subscription
            'can_access_dashboard', true, -- ✅ Acessa dashboard
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
            ),
            'message', 'Active subscription'
        );
    END IF;

    -- CASO 2: SEM SUBSCRIPTION + NÃO APROVADO NA WAITLIST → Bloquear checkout
    IF NOT v_has_active_subscription AND NOT v_waitlist_approved THEN
        RETURN jsonb_build_object(
            'success', true,
            'waitlist_approved', false,
            'waitlist_status', COALESCE(v_waitlist_status, 'not_in_list'),
            'has_active_subscription', false,
            'can_access_checkout', false, -- ❌ NÃO pode comprar
            'can_access_dashboard', false, -- ❌ NÃO pode acessar
            'mentions_available', 0,
            'is_cancelled_with_access', false,
            'subscription', null,
            'message', CASE
                WHEN v_waitlist_status = 'pending' THEN 'You are on the waitlist. Check your email for approval.'
                WHEN v_waitlist_status = 'rejected' THEN 'Your waitlist application was not approved.'
                ELSE 'Please join the waitlist to access Liftlio.'
            END
        );
    END IF;

    -- CASO 3: SEM SUBSCRIPTION + APROVADO NA WAITLIST → Permitir checkout
    IF NOT v_has_active_subscription AND v_waitlist_approved THEN
        RETURN jsonb_build_object(
            'success', true,
            'waitlist_approved', true,
            'waitlist_status', v_waitlist_status,
            'has_active_subscription', false,
            'can_access_checkout', true,  -- ✅ Aprovado pode comprar
            'can_access_dashboard', false, -- ❌ Mas sem subscription não acessa dashboard
            'mentions_available', 0,
            'is_cancelled_with_access', false,
            'subscription', null,
            'message', 'You are approved! Subscribe to access the dashboard.'
        );
    END IF;

    -- Fallback (não deveria chegar aqui)
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Unexpected state',
        'has_active_subscription', v_has_active_subscription,
        'waitlist_approved', v_waitlist_approved
    );

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retornar como sem acesso (fail safe)
    RETURN jsonb_build_object(
        'success', false,
        'waitlist_approved', false,
        'has_active_subscription', false,
        'can_access_checkout', false,
        'can_access_dashboard', false,
        'subscription', null,
        'mentions_available', 0,
        'is_cancelled_with_access', false,
        'message', 'Error checking subscription: ' || SQLERRM
    );
END;
$function$;

-- Comentário atualizado
COMMENT ON FUNCTION public.check_user_subscription() IS
'Verifica status da assinatura do usuário E status na waitlist.
LÓGICA CORRIGIDA:
1. Verifica subscription PRIMEIRO
2. Se tem subscription ativa → acesso completo (ignora waitlist)
3. Se NÃO tem subscription → verifica waitlist
4. Se não aprovado → bloqueia checkout
RETORNA:
- waitlist_approved: se está aprovado na waitlist
- has_active_subscription: REAL status da subscription
- can_access_checkout: se pode comprar
- can_access_dashboard: se pode acessar dashboard';
