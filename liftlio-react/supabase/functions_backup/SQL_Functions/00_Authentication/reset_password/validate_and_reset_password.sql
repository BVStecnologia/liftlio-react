-- =============================================
-- Função: validate_and_reset_password
-- Descrição: Valida token e reseta senha
-- Criado: 2025-10-04
-- Ambiente: Funciona em DEV e PROD
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_and_reset_password(
  p_token TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_stored_token TEXT;
  v_token_expires TIMESTAMP;
  v_result JSONB;
BEGIN
  -- Validar inputs
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid reset token'
    );
  END IF;

  IF p_new_password IS NULL OR LENGTH(p_new_password) < 6 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Password must be at least 6 characters'
    );
  END IF;

  -- Buscar usuário com este token
  SELECT
    id,
    email,
    raw_user_meta_data->>'password_reset_token' as token,
    (raw_user_meta_data->>'password_reset_expires')::timestamp as expires
  INTO v_user_id, v_user_email, v_stored_token, v_token_expires
  FROM auth.users
  WHERE raw_user_meta_data->>'password_reset_token' = p_token
  LIMIT 1;

  -- Verificar se token existe
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired reset token'
    );
  END IF;

  -- Verificar se token expirou
  IF v_token_expires < NOW() THEN
    -- Limpar token expirado
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'password_reset_token' - 'password_reset_expires'
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reset token has expired. Please request a new one.'
    );
  END IF;

  -- Resetar senha usando extensão pgcrypto do schema auth
  BEGIN
    UPDATE auth.users
    SET
      encrypted_password = auth.crypt(p_new_password, auth.gen_salt('bf')),
      updated_at = NOW(),
      -- Limpar token após uso
      raw_user_meta_data = raw_user_meta_data - 'password_reset_token' - 'password_reset_expires'
    WHERE id = v_user_id;

    -- Log sucesso
    RAISE NOTICE 'Password reset successful for user %', v_user_email;

    -- Retornar sucesso
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Password has been reset successfully. You can now log in with your new password.'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to reset password: ' || SQLERRM
    );
  END;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'An error occurred: ' || SQLERRM
  );
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.validate_and_reset_password(TEXT, TEXT) IS
'Valida token de reset de senha e atualiza para nova senha.
Token é consumido após uso (one-time use).
Retorna erro se token inválido, expirado ou senha muito curta.';

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Resetar senha com token válido
SELECT public.validate_and_reset_password(
  'token_aqui',
  'NovaSenhaForte123!'
);

-- Resultado esperado (sucesso):
{
  "success": true,
  "message": "Password has been reset successfully..."
}

-- Resultado esperado (token expirado):
{
  "success": false,
  "error": "Reset token has expired. Please request a new one."
}

-- Resultado esperado (senha curta):
{
  "success": false,
  "error": "Password must be at least 6 characters"
}

-- Teste 2: Verificar que token foi removido após uso
SELECT
  email,
  raw_user_meta_data ? 'password_reset_token' as has_token
FROM auth.users
WHERE email = 'teste.liftlio.2025@gmail.com';
-- Deve retornar has_token = false
*/
