-- =============================================
-- ARQUIVO 07: Trigger - Notify Admin on New Waitlist Signup
-- =============================================
--
-- DESCRIÇÃO:
-- Cria trigger que dispara automaticamente após INSERT na tabela waitlist.
-- Envia email de notificação para os admins usando send_waitlist_admin_notification().
--
-- ORDEM DE EXECUÇÃO: 7º (executar DEPOIS do arquivo 06)
--
-- TESTE:
-- INSERT INTO waitlist (name, email, website_url, discovery_source, position_in_queue, status)
-- VALUES ('Test User', 'test@example.com', 'https://test.com', 'LinkedIn', 999, 'pending');
--
-- =============================================

-- ========================================
-- 1. CRIAR FUNÇÃO DO TRIGGER
-- ========================================

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
    -- ========================================
    -- ENVIAR NOTIFICAÇÃO PARA ADMINS
    -- ========================================

    BEGIN
        -- Chamar função de notificação administrativa
        v_email_result := public.send_waitlist_admin_notification(
            NEW.name,                    -- Nome do usuário
            NEW.email,                   -- Email do usuário
            NEW.website_url,             -- Website
            NEW.discovery_source,        -- Como descobriu o Liftlio
            NEW.position_in_queue        -- Posição na fila
        );

        -- Log do resultado (para debugging)
        RAISE NOTICE 'Admin notification result: %', v_email_result;

    EXCEPTION WHEN OTHERS THEN
        -- Se falhar ao enviar notificação, registrar mas NÃO falhar o INSERT
        RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
    END;

    -- Retornar NEW para permitir o INSERT
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, registrar mas não bloquear o INSERT
    RAISE WARNING 'Error in trigger_notify_admin_new_waitlist_signup: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ========================================
-- 2. CRIAR TRIGGER NA TABELA WAITLIST
-- ========================================

DROP TRIGGER IF EXISTS notify_admin_new_waitlist_signup ON public.waitlist;

CREATE TRIGGER notify_admin_new_waitlist_signup
    AFTER INSERT ON public.waitlist
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notify_admin_new_waitlist_signup();

-- ========================================
-- 3. COMENTÁRIOS DESCRITIVOS
-- ========================================

COMMENT ON FUNCTION public.trigger_notify_admin_new_waitlist_signup() IS
'Trigger function that sends admin notification email when a new user signs up for the waitlist';

COMMENT ON TRIGGER notify_admin_new_waitlist_signup ON public.waitlist IS
'Automatically sends email notification to admins (valdair3d@gmail.com and steven@stevenjwilson.com) when a new user is added to the waitlist';
