-- =============================================
-- Função: send_waitlist_approval_email
-- Envia email de aprovação quando você muda status para 'approved'
-- Template 'waitlist-approval' deve existir na tabela email_templates
-- =============================================
--
-- COMO TESTAR (copie e cole no SQL Editor):
-- SELECT send_waitlist_approval_email('valdair3d@gmail.com', 'Valdair');
--
-- RESULTADO esperado:
-- {"success": true, "message": "Email sent", "email_id": "..."}
--
-- Verifique o email em valdair3d@gmail.com
--
-- =============================================

DROP FUNCTION IF EXISTS public.send_waitlist_approval_email(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.send_waitlist_approval_email(
    p_email TEXT,
    p_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email_result JSONB;
    v_template_body TEXT;
    v_template_subject TEXT;
BEGIN
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email is required');
    END IF;

    SELECT html_content, subject
    INTO v_template_body, v_template_subject
    FROM public.email_templates
    WHERE name = 'waitlist-approval' AND is_active = true
    LIMIT 1;

    IF v_template_body IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Template not found');
    END IF;

    v_template_body := REPLACE(v_template_body, '{{userName}}', COALESCE(p_name, 'there'));

    v_email_result := public.send_email(
        recipient_email := p_email,
        email_subject := v_template_subject,
        email_html := v_template_body
    );

    IF (v_email_result->>'success')::boolean THEN
        UPDATE public.waitlist
        SET
            status = 'approved',
            invitation_sent_at = NOW()
        WHERE email = p_email;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Email sent',
            'email_id', v_email_result->'email_id'
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', v_email_result->>'error');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
