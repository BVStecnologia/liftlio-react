-- =============================================
-- Função: check_user_waitlist_status
-- Verifica se o usuário logado está na waitlist
-- e retorna status de aprovação (pending/approved/rejected)
-- =============================================
--
-- COMO TESTAR (copie e cole no SQL Editor):
-- SELECT check_user_waitlist_status();
--
-- RESULTADO se está na waitlist:
-- {"in_waitlist": true, "status": "pending", "position": 1, "is_approved": false}
--
-- RESULTADO se NÃO está na waitlist:
-- {"in_waitlist": false, "status": null}
--
-- =============================================

DROP FUNCTION IF EXISTS public.check_user_waitlist_status();

CREATE OR REPLACE FUNCTION public.check_user_waitlist_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_waitlist RECORD;
    v_user_email TEXT;
BEGIN
    v_user_email := auth.email();

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'User not authenticated',
            'in_waitlist', false,
            'status', null
        );
    END IF;

    SELECT status, position_in_queue, created_at, invitation_sent_at
    INTO v_waitlist
    FROM public.waitlist
    WHERE email = v_user_email
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'in_waitlist', false,
            'status', null,
            'position', null,
            'created_at', null
        );
    END IF;

    RETURN jsonb_build_object(
        'in_waitlist', true,
        'status', v_waitlist.status,
        'position', v_waitlist.position_in_queue,
        'created_at', v_waitlist.created_at,
        'invitation_sent_at', v_waitlist.invitation_sent_at,
        'is_approved', (v_waitlist.status = 'approved'),
        'is_pending', (v_waitlist.status = 'pending'),
        'is_rejected', (v_waitlist.status = 'rejected')
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', 'Error: ' || SQLERRM,
        'in_waitlist', false,
        'status', null
    );
END;
$$;
