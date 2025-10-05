-- =============================================
-- Função: Fix pgcrypto auth error
-- Descrição: Corrige erro "gen_random_bytes does not exist" no sistema de autenticação do Supabase
-- Criado: 2025-01-04
-- Problema: pgcrypto está instalado no schema 'extensions', mas auth não consegue encontrar
-- Solução: Criar funções wrapper no schema 'public' que referenciam as funções em 'extensions'
-- =============================================

-- Drop existing functions if they exist (to avoid parameter conflicts)
DROP FUNCTION IF EXISTS public.gen_random_bytes(integer);
DROP FUNCTION IF EXISTS public.gen_random_uuid();

-- Create wrapper function for gen_random_bytes
-- This allows auth schema to access the pgcrypto function
CREATE OR REPLACE FUNCTION public.gen_random_bytes(length integer)
RETURNS bytea
LANGUAGE SQL
SECURITY DEFINER
SET search_path = extensions
AS $$
  SELECT extensions.gen_random_bytes(length);
$$;

-- Grant execute permission to necessary roles
GRANT EXECUTE ON FUNCTION public.gen_random_bytes(integer) TO anon, authenticated, service_role;

-- Create wrapper function for gen_random_uuid
-- Also commonly needed by auth system
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE SQL
SECURITY DEFINER
SET search_path = extensions
AS $$
  SELECT extensions.gen_random_uuid();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.gen_random_uuid() TO anon, authenticated, service_role;

-- Test the functions
-- SELECT
--     length(public.gen_random_bytes(16)) as random_bytes_length,
--     public.gen_random_uuid() as random_uuid;