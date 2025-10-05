-- =============================================
-- EXECUTAR ESTE ARQUIVO NO SUPABASE SQL EDITOR
-- Data: 2025-01-04
-- Objetivo: Limpar funções antigas de password reset
-- =============================================

-- PASSO 1: Verificar estado atual (executar primeiro para ver o que existe)
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%password%'
    OR p.proname LIKE '%reset%'
    OR p.proname LIKE '%token%'
  )
ORDER BY p.proname;

-- PASSO 2: EXECUTAR OS DROPS (copie e execute estas 3 linhas)
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_recent_tokens();

-- PASSO 3: Verificar resultado final (deve mostrar apenas 2 funções)
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%password%' OR p.proname LIKE '%reset%')
ORDER BY p.proname;

-- RESULTADO ESPERADO:
-- Devem restar apenas 2 funções:
-- 1. request_password_reset(p_email text)
-- 2. validate_and_reset_password(p_token text, p_new_password text)