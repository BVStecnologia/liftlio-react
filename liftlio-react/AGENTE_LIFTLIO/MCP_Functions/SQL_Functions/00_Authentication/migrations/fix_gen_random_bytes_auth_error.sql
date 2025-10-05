-- =============================================
-- Função: fix_gen_random_bytes_auth_error
-- Descrição: Corrige erro "function gen_random_bytes(integer) does not exist" no Supabase Auth
-- Criado: 2025-01-03
-- Autor: Supabase MCP Expert Agent
-- =============================================

-- PROBLEMA IDENTIFICADO:
-- O Supabase Auth não consegue encontrar a função gen_random_bytes durante o signup de email
-- Erro: "ERROR: function gen_random_bytes(integer) does not exist (SQLSTATE 42883)"

-- CAUSA RAIZ:
-- 1. A função gen_random_bytes existe apenas no schema 'extensions' (onde pgcrypto está instalado)
-- 2. O contexto de execução do Auth não inclui 'extensions' no search_path
-- 3. Não temos permissão para criar funções diretamente no schema 'auth'
-- 4. O Auth procura a função sem especificar schema, esperando encontrá-la no search_path

-- SOLUÇÃO IMPLEMENTADA:
-- Criar uma função wrapper no schema 'public' que chama extensions.gen_random_bytes
-- Esta função usa SECURITY DEFINER para garantir que funcione em qualquer contexto

-- ============= SCRIPT DE CORREÇÃO =============

-- 1. Garantir que pgcrypto está instalado no schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Remover funções problemáticas anteriores (se existirem)
DROP FUNCTION IF EXISTS gen_random_bytes(integer);  -- Remove função recursiva se existir
DROP FUNCTION IF EXISTS public.gen_random_bytes(integer);  -- Remove versão antiga

-- 3. Criar função wrapper no schema public
CREATE OR REPLACE FUNCTION public.gen_random_bytes(len integer)
RETURNS bytea
LANGUAGE sql
SECURITY DEFINER  -- Executa com privilégios do owner (postgres)
STABLE            -- Função é estável (mesmo input = mesmo output)
AS $$
  SELECT extensions.gen_random_bytes(len);
$$;

-- 4. Conceder permissões amplas para garantir acesso
GRANT EXECUTE ON FUNCTION public.gen_random_bytes(integer) TO PUBLIC;

-- 5. Configurar search_path do banco para incluir extensions
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- 6. Adicionar documentação
COMMENT ON FUNCTION public.gen_random_bytes(integer) IS
'Wrapper para pgcrypto gen_random_bytes para garantir disponibilidade no sistema de Auth do Supabase.
Esta função resolve o erro SQLSTATE 42883 durante signup de email.';

-- ============= VERIFICAÇÃO =============

-- Para verificar se a correção funcionou:
-- 1. Teste a função diretamente:
SELECT length(public.gen_random_bytes(16));  -- Deve retornar 16

-- 2. Verifique as funções existentes:
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'gen_random_bytes'
ORDER BY n.nspname;

-- Resultado esperado:
-- schema     | function_name      | arguments
-- -----------|-------------------|------------
-- extensions | gen_random_bytes  | integer
-- public     | gen_random_bytes  | len integer

-- ============= NOTAS IMPORTANTES =============

-- 1. NÃO criar função com mesmo nome sem schema (causa loop recursivo)
-- 2. NÃO tentar criar funções no schema 'auth' (permission denied)
-- 3. SEMPRE usar SECURITY DEFINER para garantir execução
-- 4. O search_path do database deve incluir 'extensions' como fallback

-- ============= TROUBLESHOOTING =============

-- Se o erro persistir após aplicar esta correção:
-- 1. Verifique se há cache do Auth que precisa ser limpo
-- 2. Reinicie o serviço Auth via Dashboard se possível
-- 3. Contate o suporte Supabase mencionando:
--    - Erro SQLSTATE 42883 com gen_random_bytes
--    - Auth não encontra função mesmo com wrapper em public
--    - Projeto já tem pgcrypto instalado em extensions

-- Se receber erro de "stack depth limit exceeded":
-- Isso indica que criou uma função recursiva acidentalmente
-- Execute: DROP FUNCTION IF EXISTS gen_random_bytes(integer);
-- E reaplique este script