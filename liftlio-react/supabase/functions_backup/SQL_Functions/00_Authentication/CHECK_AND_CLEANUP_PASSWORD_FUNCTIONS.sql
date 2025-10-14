-- =============================================
-- Script de Verificação e Limpeza de Funções de Password Reset
-- Data: 2025-10-04
-- Objetivo: Identificar e remover funções duplicadas ou antigas
-- =============================================

-- PASSO 1: VERIFICAR QUAIS FUNÇÕES EXISTEM
-- Execute este SELECT primeiro para ver o que existe no banco:

SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  obj_description(p.oid, 'pg_proc') as description
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

-- =============================================
-- PASSO 2: REMOVER FUNÇÕES ANTIGAS/NÃO USADAS
-- Execute estes DROPs apenas se as funções existirem
-- =============================================

-- Função antiga que usa tabela inexistente password_reset_tokens
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);

-- Função antiga que usa tabela inexistente password_reset_tokens
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);

-- Função de debug que não é mais necessária
DROP FUNCTION IF EXISTS public.check_recent_tokens();

-- =============================================
-- PASSO 3: VERIFICAR SE FUNÇÕES CORRETAS EXISTEM
-- Estas são as funções que DEVEM existir
-- =============================================

-- Verificar se as funções corretas existem com os parâmetros corretos:
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  'DEVE EXISTIR' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    (p.proname = 'request_password_reset' AND pg_get_function_arguments(p.oid) = 'p_email text')
    OR
    (p.proname = 'validate_and_reset_password' AND pg_get_function_arguments(p.oid) = 'p_token text, p_new_password text')
  )
ORDER BY p.proname;

-- =============================================
-- PASSO 4: VERIFICAR SE HÁ OUTRAS FUNÇÕES RELACIONADAS
-- Busca ampla por qualquer função com "password" ou "reset" no nome
-- =============================================

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
  )
ORDER BY p.proname;

-- =============================================
-- RESULTADO ESPERADO:
--
-- Após executar este script, você deve ter apenas:
-- 1. request_password_reset(p_email text)
-- 2. validate_and_reset_password(p_token text, p_new_password text)
--
-- Qualquer outra função relacionada a password reset deve ser removida
-- =============================================

-- =============================================
-- INSTRUÇÕES DE USO:
--
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Execute o PASSO 1 para ver o que existe
-- 4. Execute o PASSO 2 para limpar funções antigas
-- 5. Execute o PASSO 3 para confirmar que as funções corretas existem
-- 6. Execute o PASSO 4 para verificar se há outras funções não mapeadas
-- =============================================