-- =============================================
-- Limpeza de Funções Antigas de Password Reset
-- Data: 2025-01-04
-- Autor: Supabase MCP Expert Agent
--
-- Objetivo: Remover funções antigas não utilizadas
-- Mantém apenas:
--   1. request_password_reset(p_email TEXT)
--   2. validate_and_reset_password(p_token TEXT, p_new_password TEXT)
-- =============================================

-- 1. VERIFICAR ESTADO ATUAL (executar primeiro)
-- Lista todas as funções relacionadas a password reset
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

-- 2. DELETAR FUNÇÕES ANTIGAS (executar após verificação)
-- Remove funções que não são mais necessárias
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_recent_tokens();

-- 3. VERIFICAR RESULTADO FINAL (executar após limpeza)
-- Deve mostrar apenas 2 funções
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname = 'request_password_reset'
    OR p.proname = 'validate_and_reset_password'
  )
ORDER BY p.proname;

-- 4. VERIFICAR SE ALGUMA VIEW OU TRIGGER DEPENDE DAS FUNÇÕES ANTIGAS
-- Antes de deletar, verificar dependências
SELECT
  d.deptype,
  d.objid::regclass AS dependent_object,
  d.refobjid::regprocedure AS referenced_function
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.refobjid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'validate_reset_token',
    'reset_password_with_token',
    'check_recent_tokens'
  )
  AND d.deptype != 'i';  -- Ignora dependências internas

-- Se não houver dependências, as funções foram deletadas com segurança!