-- =============================================
-- Migration: Remove discovery_source CHECK constraint
-- =============================================
--
-- DESCRIÇÃO:
-- Remove o CHECK constraint do campo discovery_source na tabela waitlist.
-- Isso permite que usuários digitem qualquer fonte de descoberta
-- (ex: ProductHunt, Podcast, Blog, etc.) além das opções pré-definidas.
--
-- A normalização na função add_to_waitlist() ainda funcionará para
-- valores conhecidos (Twitter, LinkedIn, etc.), mas aceitará qualquer texto.
--
-- IMPORTANTE:
-- Execute este SQL no Supabase SQL Editor ou aplique via migrations.
--
-- Data: 2025-10-20
-- =============================================

-- Remove o CHECK constraint existente
ALTER TABLE public.waitlist
DROP CONSTRAINT IF EXISTS waitlist_discovery_source_check;

-- Adiciona comentário explicativo
COMMENT ON COLUMN public.waitlist.discovery_source IS
'How user discovered Liftlio - accepts any text value (no constraint)';
