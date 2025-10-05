-- =============================================
-- Função: fix_auth_gen_random_bytes
-- Descrição: Wrapper function para tornar gen_random_bytes acessível ao auth schema
-- Criado: 2025-01-04
-- Problema: Auth schema não consegue encontrar gen_random_bytes do pgcrypto
-- Solução: Criar wrapper com SECURITY DEFINER no public schema
-- =============================================

-- First, ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Drop the old function if it exists (without SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.gen_random_bytes(integer);

-- Create a SECURITY DEFINER wrapper function in public schema
CREATE OR REPLACE FUNCTION public.gen_random_bytes(length integer)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
BEGIN
  RETURN extensions.gen_random_bytes(length);
END;
$$;

-- Grant execute permissions to necessary roles
GRANT EXECUTE ON FUNCTION public.gen_random_bytes(integer) TO postgres, anon, authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.gen_random_bytes(integer) IS 'Wrapper function for pgcrypto gen_random_bytes to be accessible by auth schema';