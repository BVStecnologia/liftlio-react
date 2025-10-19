-- =============================================
-- ARQUIVO 02: Função send_waitlist_email
-- =============================================
--
-- DESCRIÇÃO:
-- Envia email de confirmação para inscritos na waitlist.
-- Usa template 'waitlist-confirmation' da tabela email_templates.
--
-- ORDEM DE EXECUÇÃO: 2º (executar DEPOIS do arquivo 01)
--
-- TESTE RÁPIDO:
-- SELECT send_waitlist_email('valdair3d@gmail.com', 'Valdair');
--
-- Ver documentação completa em: WAITLIST_IMPLEMENTATION.md
--
-- =============================================

DROP FUNCTION IF EXISTS public.send_waitlist_email(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.send_waitlist_email(
    p_email TEXT,
    p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template record;
    v_result JSONB;
    v_variables JSONB;
BEGIN
    -- Buscar template completo 'waitlist-confirmation'
    SELECT * INTO v_template
    FROM public.email_templates
    WHERE name = 'waitlist-confirmation'
    AND is_active = true
    LIMIT 1;

    -- Verificar se template existe
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template waitlist-confirmation not found or inactive'
        );
    END IF;

    -- Preparar variáveis para o template
    v_variables := jsonb_build_object(
        'userName', p_name
    );

    -- Chamar função send_email com o conteúdo do template
    v_result := public.send_email(
        recipient_email := p_email,
        email_subject := v_template.subject,
        email_html := v_template.html_content,
        email_text := v_template.text_content,
        template_id := NULL,                  -- Não usar template_id
        variables := v_variables,
        actions := NULL,
        attachments := NULL,
        complexity := 'simple'
    );

    -- Retornar resultado
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Error sending email: ' || SQLERRM
    );
END;
$$;

-- Adicionar comentário descritivo na função
COMMENT ON FUNCTION public.send_waitlist_email(TEXT, TEXT) IS
'Sends waitlist confirmation email using waitlist-confirmation template';
