-- =============================================
-- Migration: Fix check_user_subscription case-sensitive column reference
-- Bug: Function referenced c."Mentions" (capital M) but column is "mentions" (lowercase)
-- Error: "column c.Mentions does not exist"
-- Date: 2025-11-01
-- =============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS check_user_subscription();

-- Create corrected function
CREATE OR REPLACE FUNCTION public.check_user_subscription()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
        c.mentions as mentions_available,  -- ✅ FIXED: was c."Mentions" (uppercase)
        CASE
            WHEN s.status = 'active' AND s.next_billing_date >= CURRENT_DATE THEN true
            WHEN s.status = 'cancelled' AND s.next_billing_date >= CURRENT_DATE THEN true
            WHEN s.next_billing_date >= CURRENT_DATE - INTERVAL '3 days' THEN true
            ELSE false
        END as is_active,
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

    -- Se encontrou subscription, já sabemos o resultado
    IF v_subscription.id IS NOT NULL THEN
        v_has_active_subscription := v_subscription.is_active;

        RETURN jsonb_build_object(
            'success', true,
            'has_active_subscription', v_has_active_subscription,
            'waitlist_approved', true,
            'can_access_checkout', true,
            'can_access_dashboard', v_has_active_subscription,
            'subscription', jsonb_build_object(
                'id', v_subscription.id,
                'plan_name', v_subscription.plan_name,
                'status', v_subscription.status,
                'next_billing_date', v_subscription.next_billing_date,
                'is_active', v_subscription.is_active,
                'is_cancelled_with_access', v_subscription.is_cancelled_with_access,
                'mentions_available', v_subscription.mentions_available,
                'created_at', v_subscription.created_at
            ),
            'message', 'User has subscription record'
        );
    END IF;

    -- ========================================
    -- 3. SE NÃO TEM SUBSCRIPTION, VERIFICAR WAITLIST
    -- ========================================
    SELECT status, invitation_sent_at
    INTO v_waitlist_status, v_invitation_sent_at
    FROM waitlist
    WHERE email = v_user_email;

    IF v_waitlist_status IS NOT NULL THEN
        v_waitlist_approved := (v_waitlist_status = 'approved');

        RETURN jsonb_build_object(
            'success', true,
            'waitlist_approved', v_waitlist_approved,
            'has_active_subscription', false,
            'can_access_checkout', v_waitlist_approved,
            'can_access_dashboard', false,
            'waitlist', jsonb_build_object(
                'status', v_waitlist_status,
                'invitation_sent_at', v_invitation_sent_at
            ),
            'message', CASE
                WHEN v_waitlist_approved THEN 'User approved in waitlist - can checkout'
                ELSE 'User in waitlist but not approved yet'
            END
        );
    END IF;

    -- ========================================
    -- 4. USUÁRIO NÃO TEM SUBSCRIPTION NEM WAITLIST
    -- ========================================
    RETURN jsonb_build_object(
        'success', true,
        'waitlist_approved', false,
        'has_active_subscription', false,
        'can_access_checkout', false,
        'can_access_dashboard', false,
        'message', 'User not in waitlist and has no subscription'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'waitlist_approved', false,
            'has_active_subscription', false,
            'can_access_checkout', false,
            'can_access_dashboard', false,
            'error', SQLERRM,
            'message', 'Error checking user subscription'
        );
END;
$function$;

-- =============================================
-- Fim da Migration
-- =============================================
