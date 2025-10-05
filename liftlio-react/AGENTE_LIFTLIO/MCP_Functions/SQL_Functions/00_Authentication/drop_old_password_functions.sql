-- =============================================
-- Script: Remover Funções Antigas de Reset de Senha
-- Descrição: Remove funções antigas que não são mais utilizadas
-- Criado: 2025-01-04
-- Autor: Supabase MCP Expert Agent
-- =============================================

-- Remover funções antigas de reset de senha
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_recent_tokens() CASCADE;

-- Confirmação
SELECT 'Funções antigas removidas com sucesso!' as status;