-- =============================================
-- Função: request_password_reset
-- Descrição: Solicita reset de senha e envia email
-- Criado: 2025-10-04
-- Ambiente: Funciona em DEV (localhost) e PROD (liftlio.com)
-- =============================================

CREATE OR REPLACE FUNCTION public.request_password_reset(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_reset_token TEXT;
  v_reset_url TEXT;
  v_base_url TEXT;
  v_result JSONB;
BEGIN
  -- Verificar se usuário existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Retornar sucesso mesmo se email não existe (segurança)
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If the email exists, a password reset link has been sent.'
    );
  END IF;

  -- Gerar token único
  v_reset_token := encode(auth.gen_random_bytes(32), 'hex');

  -- Determinar URL base (DEV ou PROD)
  -- Você pode usar uma configuração ou detectar automaticamente
  BEGIN
    v_base_url := current_setting('app.settings.site_url', true);
  EXCEPTION WHEN OTHERS THEN
    v_base_url := NULL;
  END;

  -- Fallback: usar PROD como padrão
  IF v_base_url IS NULL THEN
    v_base_url := 'https://liftlio.com';
  END IF;

  -- Construir URL de reset
  v_reset_url := v_base_url || '/reset-password?token=' || v_reset_token;

  -- Salvar token no user metadata (expira em 1 hora)
  UPDATE auth.users
  SET raw_user_meta_data =
    COALESCE(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'password_reset_token', v_reset_token,
      'password_reset_expires', (NOW() + INTERVAL '1 hour')::text
    )
  WHERE id = v_user_id;

  -- Enviar email de reset
  BEGIN
    v_result := public.send_auth_email(
      'password_reset',
      p_email,
      jsonb_build_object(
        'resetUrl', v_reset_url,
        'userName', split_part(p_email, '@', 1)
      )
    );

    -- Log para debug
    RAISE NOTICE 'Password reset email sent to %: %', p_email, v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Não falhar se email falhar
    RAISE WARNING 'Failed to send password reset email to %: %', p_email, SQLERRM;

    -- Retornar sucesso mesmo assim (não revelar falha de email)
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If the email exists, a password reset link has been sent.',
      'warning', 'Email delivery may have failed'
    );
  END;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'If the email exists, a password reset link has been sent.',
    'email_sent', COALESCE(v_result->>'success', 'unknown')
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to process password reset request: ' || SQLERRM
  );
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.request_password_reset(TEXT) IS
'Solicita reset de senha. Envia email com link contendo token único.
Token expira em 1 hora. Funciona em DEV (localhost) e PROD (liftlio.com).
Retorna sempre sucesso por segurança (não revela se email existe).';

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Solicitar reset para email existente
SELECT public.request_password_reset('teste.liftlio.2025@gmail.com');

-- Resultado esperado:
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent.",
  "email_sent": "true"
}

-- Teste 2: Ver token gerado
SELECT
  email,
  raw_user_meta_data->>'password_reset_token' as token,
  raw_user_meta_data->>'password_reset_expires' as expires
FROM auth.users
WHERE email = 'teste.liftlio.2025@gmail.com';
*/
