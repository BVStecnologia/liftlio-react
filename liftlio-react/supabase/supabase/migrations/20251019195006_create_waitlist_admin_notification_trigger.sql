-- =============================================
-- Migration: Create Waitlist Admin Notification Trigger
-- Description: Automatically sends email notification to admins when new user signs up for waitlist
-- Created: 2025-10-19T19:50:06Z
-- Branch: DEV (cdnzajygbcujwcaoswpi)
-- =============================================

-- 1. CRIAR FUNÇÃO DO TRIGGER
DROP FUNCTION IF EXISTS public.trigger_notify_admin_new_waitlist_signup() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_notify_admin_new_waitlist_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_result JSONB;
BEGIN
    -- ENVIAR NOTIFICAÇÃO PARA ADMINS
    BEGIN
        v_email_result := public.send_waitlist_admin_notification(
            NEW.name,
            NEW.email,
            NEW.website_url,
            NEW.discovery_source,
            NEW.position_in_queue
        );

        RAISE NOTICE 'Admin notification result: %', v_email_result;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
    END;

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_notify_admin_new_waitlist_signup: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. CRIAR TRIGGER NA TABELA WAITLIST (ONLY IF TABLE EXISTS)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'waitlist'
    ) THEN
        DROP TRIGGER IF EXISTS notify_admin_new_waitlist_signup ON public.waitlist;

        CREATE TRIGGER notify_admin_new_waitlist_signup
            AFTER INSERT ON public.waitlist
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_notify_admin_new_waitlist_signup();

        RAISE NOTICE 'Trigger notify_admin_new_waitlist_signup created successfully';
    ELSE
        RAISE NOTICE 'Table waitlist does not exist - skipping trigger creation';
    END IF;
END $$;

-- 3. COMENTÁRIOS DESCRITIVOS
COMMENT ON FUNCTION public.trigger_notify_admin_new_waitlist_signup() IS
'Trigger function that sends admin notification email when a new user signs up for the waitlist';
