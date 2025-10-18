-- =============================================
-- Migration: Add processing lock to Projeto table
-- Data: 2025-10-17 18:00
-- Objetivo:
--   Adicionar sistema de lock para evitar race conditions
--   entre múltiplos cron jobs processando o mesmo projeto
-- =============================================

-- Adicionar coluna de lock com timeout automático
ALTER TABLE public."Projeto"
ADD COLUMN IF NOT EXISTS processing_locked_until TIMESTAMPTZ;

-- Comentário da coluna
COMMENT ON COLUMN public."Projeto".processing_locked_until IS
'Timestamp até quando o projeto está bloqueado para processamento.
NULL = desbloqueado.
Se timestamp < NOW() = lock expirado (auto-recovery).
Evita race conditions entre cron jobs simultâneos.';

-- Índice para consultas eficientes de locks ativos
CREATE INDEX IF NOT EXISTS idx_projeto_processing_lock
ON public."Projeto"(id, processing_locked_until)
WHERE processing_locked_until IS NOT NULL;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 20251017180000 aplicada com sucesso!';
    RAISE NOTICE '- Coluna processing_locked_until adicionada';
    RAISE NOTICE '- Índice idx_projeto_processing_lock criado';
    RAISE NOTICE '- Sistema de lock pronto para uso';
END $$;
