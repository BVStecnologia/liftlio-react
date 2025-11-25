-- =============================================
-- Migration: ALTER TABLE pipeline_processing
-- Descrição: Adiciona campos para processar vídeos individualmente
-- Data: 2025-11-14
-- =============================================

-- STEP 1: Adicionar novos campos (nullable primeiro para permitir ALTER em tabela existente)
ALTER TABLE public.pipeline_processing
ADD COLUMN IF NOT EXISTS video_youtube_id TEXT,
ADD COLUMN IF NOT EXISTS video_db_id BIGINT;

-- STEP 2: Remover constraint antiga (única por scanner)
ALTER TABLE public.pipeline_processing
DROP CONSTRAINT IF EXISTS unique_scanner_processing;

-- STEP 3: Adicionar constraint nova (única por scanner + video)
-- NOTA: Só funciona depois de popular video_youtube_id
ALTER TABLE public.pipeline_processing
ADD CONSTRAINT unique_scanner_video UNIQUE (scanner_id, video_youtube_id);

-- STEP 4: Criar índice para buscas rápidas por video_youtube_id
CREATE INDEX IF NOT EXISTS idx_pipeline_video
ON public.pipeline_processing (video_youtube_id);

-- STEP 5: Criar índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_pipeline_scanner_step
ON public.pipeline_processing (scanner_id, current_step)
WHERE is_processing = FALSE;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- ⚠️ IMPORTANTE: Esta migration QUEBRA a arquitetura antiga!
-- Depois deste ALTER, as funções antigas (por scanner) NÃO funcionarão mais.
--
-- PRÓXIMOS PASSOS:
-- 1. Executar esta migration
-- 2. Popular video_youtube_id nas linhas existentes (se houver)
-- 3. Refatorar todas as funções para trabalhar com video_youtube_id
--
-- ROLLBACK (se necessário):
-- ALTER TABLE pipeline_processing DROP COLUMN video_youtube_id;
-- ALTER TABLE pipeline_processing DROP COLUMN video_db_id;
-- ALTER TABLE pipeline_processing ADD CONSTRAINT unique_scanner_processing UNIQUE (scanner_id);
-- =============================================
