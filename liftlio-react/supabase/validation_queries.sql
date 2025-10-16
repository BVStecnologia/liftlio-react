-- =============================================
-- QUERIES DE VALIDAÇÃO: Funções SQL no Supabase
-- Criado: 2025-10-14
-- Propósito: Validar se funções existem no banco mesmo que não apareçam no Dashboard
-- =============================================

-- 1️⃣ CONTAR TODAS AS FUNÇÕES NO SCHEMA PUBLIC
-- Retorna quantidade total de funções user-defined (exclui system functions)
SELECT COUNT(*) as total_functions
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f';  -- 'f' = function, 'p' = procedure, 'a' = aggregate

-- 2️⃣ LISTAR TODAS AS FUNÇÕES COM ASSINATURA COMPLETA
-- Mostra nome, argumentos e schema
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 3️⃣ LISTAR FUNÇÕES COM DEFINIÇÃO COMPLETA (SQL CODE)
-- Mostra o código SQL de cada função
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 4️⃣ VERIFICAR FUNÇÕES EM OUTROS SCHEMAS (auth, storage, extensions)
-- Útil para debug de funções que podem estar em schemas não-public
SELECT
    n.nspname as schema_name,
    COUNT(*) as function_count
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prokind = 'f'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')  -- Exclui system schemas
GROUP BY n.nspname
ORDER BY function_count DESC;

-- 5️⃣ VERIFICAR SE FUNÇÃO ESPECÍFICA EXISTE
-- Substitua 'nome_da_funcao' pelo nome que você está procurando
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc as source_code
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'nome_da_funcao'  -- ⚠️ SUBSTITUIR AQUI
  AND p.prokind = 'f';

-- 6️⃣ LISTAR FUNÇÕES COM METADATA (language, security type)
-- Mostra detalhes técnicos de cada função
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    l.lanname as language,
    CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    p.provolatile as volatility  -- 'i' = immutable, 's' = stable, 'v' = volatile
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
INNER JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 7️⃣ VERIFICAR TRIGGERS (relacionados às funções)
-- Lista todos os triggers e suas funções associadas
SELECT
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
INNER JOIN pg_class c ON t.tgrelid = c.oid
INNER JOIN pg_namespace n ON c.relnamespace = n.oid
INNER JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- 8️⃣ VERIFICAR RLS POLICIES (para debug de permissões)
-- Lista todas as políticas RLS nas tabelas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,  -- SELECT, INSERT, UPDATE, DELETE, ALL
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9️⃣ VERIFICAR VIEWS (podem usar funções)
-- Lista todas as views no schema public
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 🔟 ESTATÍSTICAS GERAIS DO BANCO
-- Overview completo de objetos no schema public
SELECT
    'Tables' as object_type,
    COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Functions' as object_type,
    COUNT(*)
FROM pg_proc p
INNER JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f'
UNION ALL
SELECT
    'Views' as object_type,
    COUNT(*)
FROM pg_views
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Triggers' as object_type,
    COUNT(*)
FROM pg_trigger t
INNER JOIN pg_class c ON t.tgrelid = c.oid
INNER JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY object_type;

-- =============================================
-- COMO USAR:
-- 1. Execute estas queries no SQL Editor do Dashboard Supabase
-- 2. Compare os resultados com o que aparece na UI do Dashboard
-- 3. Se houver discrepância, as funções EXISTEM mas a UI não mostra
-- =============================================
