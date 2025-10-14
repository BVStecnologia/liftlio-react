-- =============================================
-- Função: send_auth_email
-- Descrição: Envia emails de autenticação usando templates personalizados
-- Criado: 2025-09-26
-- =============================================

DROP FUNCTION IF EXISTS public.send_auth_email(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.send_auth_email(
    p_event_type text,          -- 'signup', 'password_reset', 'magic_link'
    p_user_email text,
    p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_template_name text;
    v_variables jsonb;
    v_template record;
    v_result jsonb;
    v_user_name text;
    v_confirm_url text;
    v_site_url text;
BEGIN
    -- Obter URL do site
    v_site_url := 'https://liftlio.com';

    -- Extrair nome do usuário do email
    v_user_name := split_part(p_user_email, '@', 1);

    -- Determinar template baseado no evento
    CASE p_event_type
        WHEN 'signup' THEN
            v_template_name := 'auth_welcome';
            -- Gerar URL de confirmação
            v_confirm_url := COALESCE(
                p_data->>'confirmUrl',
                v_site_url || '/auth/confirm?token=' || encode(gen_random_bytes(32), 'hex')
            );
            v_variables := jsonb_build_object(
                'userName', v_user_name,
                'confirmUrl', v_confirm_url,
                'userEmail', p_user_email
            );

        WHEN 'password_reset' THEN
            v_template_name := 'auth_password_reset';
            -- Gerar URL de reset
            v_confirm_url := COALESCE(
                p_data->>'resetUrl',
                v_site_url || '/auth/reset-password?token=' || encode(gen_random_bytes(32), 'hex')
            );
            v_variables := jsonb_build_object(
                'userName', v_user_name,
                'resetUrl', v_confirm_url,
                'userEmail', p_user_email
            );

        WHEN 'magic_link' THEN
            v_template_name := 'auth_magic_link';
            -- Gerar magic link e OTP
            v_confirm_url := COALESCE(
                p_data->>'magicLink',
                v_site_url || '/auth/magic?token=' || encode(gen_random_bytes(32), 'hex')
            );
            v_variables := jsonb_build_object(
                'userName', v_user_name,
                'magicLink', v_confirm_url,
                'otpCode', COALESCE(p_data->>'otpCode', LPAD(floor(random() * 1000000)::text, 6, '0')),
                'userEmail', p_user_email
            );

        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Tipo de evento não suportado: ' || p_event_type
            );
    END CASE;

    -- Buscar template
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = v_template_name
    AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template não encontrado: ' || v_template_name
        );
    END IF;

    -- Mesclar variáveis adicionais do parâmetro
    IF p_data ? 'variables' THEN
        v_variables := v_variables || (p_data->'variables');
    END IF;

    -- Enviar email usando a função send_email existente
    v_result := send_email(
        recipient_email := p_user_email,
        email_subject := v_template.subject,
        email_html := v_template.html_content,
        email_text := v_template.text_content,
        template_id := NULL,  -- Não usar template_id pois já temos o conteúdo
        variables := v_variables,
        actions := NULL,
        attachments := NULL,
        complexity := 'simple'
    );

    -- Log do envio (opcional - criar tabela email_logs se necessário)
    IF v_result->>'success' = 'true' THEN
        -- Podemos criar uma tabela de logs futuramente
        RAISE NOTICE 'Email de % enviado com sucesso para %', p_event_type, p_user_email;
    ELSE
        RAISE WARNING 'Falha ao enviar email de % para %: %', p_event_type, p_user_email, v_result->>'error';
    END IF;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro ao enviar email: ' || SQLERRM
    );
END;
$function$;

-- =============================================
-- EXEMPLOS DE USO
-- =============================================

-- 1. Enviar email de boas-vindas
-- SELECT send_auth_email('signup', 'usuario@example.com');

-- 2. Enviar email de reset de senha
-- SELECT send_auth_email('password_reset', 'usuario@example.com');

-- 3. Enviar magic link com dados customizados
-- SELECT send_auth_email(
--     'magic_link',
--     'usuario@example.com',
--     jsonb_build_object(
--         'otpCode', '123456',
--         'variables', jsonb_build_object('customField', 'value')
--     )
-- );

-- =============================================
-- INTEGRAÇÃO COM SUPABASE AUTH
-- =============================================
-- Para desabilitar emails padrão do Supabase:
-- 1. Acesse Dashboard > Authentication > Email Templates
-- 2. Desabilite "Enable email confirmations"
-- 3. Os triggers criados assumem o controle do envio

-- =============================================
-- TEMPLATES DISPONÍVEIS
-- =============================================
-- auth_welcome: Email de boas-vindas/confirmação
-- auth_password_reset: Email de redefinição de senha
-- auth_magic_link: Email com link mágico de login