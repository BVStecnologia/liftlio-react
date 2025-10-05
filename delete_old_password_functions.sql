-- =============================================
-- Script para deletar funções antigas de password reset
-- Data: 2025-01-04
-- Objetivo: Manter apenas as 2 funções atuais:
--   1. request_password_reset(p_email TEXT)
--   2. validate_and_reset_password(p_token TEXT, p_new_password TEXT)
-- =============================================

-- Primeiro, verificar quais funções existem
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'request_password_reset',
    'validate_and_reset_password',
    'validate_reset_token',
    'reset_password_with_token',
    'check_recent_tokens'
  )
ORDER BY p.proname;

-- Deletar funções antigas que não são mais usadas
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_recent_tokens();

-- Verificar funções restantes (deve mostrar apenas 2)
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'request_password_reset',
    'validate_and_reset_password',
    'validate_reset_token',
    'reset_password_with_token',
    'check_recent_tokens'
  )
ORDER BY p.proname;