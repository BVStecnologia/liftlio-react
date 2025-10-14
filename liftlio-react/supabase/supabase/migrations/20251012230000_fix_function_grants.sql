-- =============================================
-- Migration: Fix Function GRANTs - Adicionar permissões faltantes
-- Date: 2025-10-12
-- Description: Corrige erro 401 ao chamar funções SQL após autenticação
--
-- PROBLEMA:
-- - Migration anterior (20251012070000_add_rls_policies.sql) só deu
--   GRANT EXECUTE para role 'authenticated', mas não para 'anon'
-- - Se app usa anon key → funções retornam 401 Unauthorized
-- - Funções criadas após a migration também não têm GRANT
--
-- SOLUÇÃO:
-- - Adicionar GRANT EXECUTE para role 'anon'
-- - Re-aplicar GRANT para 'authenticated' (pegar funções novas)
-- - Garantir que TODAS as ~567 funções sejam executáveis
-- =============================================

-- =============================================
-- RE-APLICAR GRANT PARA AUTHENTICATED
-- =============================================

-- Garante que TODAS as funções (inclusive criadas depois) tenham permissão
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- ADICIONAR GRANT PARA ANON (ESTAVA FALTANDO!)
-- =============================================

-- Se app React usa anon key (comum), precisa desta permissão
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- =============================================
-- VERIFICAÇÃO
-- =============================================

-- Mostrar que migration foi aplicada com sucesso
SELECT 'Function grants aplicados com sucesso!' AS status;

-- Mostrar contagem de funções no schema public
SELECT
    n.nspname as schema_name,
    COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY n.nspname;

-- =============================================
-- NOTAS IMPORTANTES
-- =============================================

-- Esta migration é IDEMPOTENTE - pode ser re-executada sem problemas
-- Se precisar fazer rollback (não recomendado):
--   REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Esta correção NÃO deve ser aplicada em MAIN
-- MAIN está funcionando perfeitamente e não precisa desta correção
