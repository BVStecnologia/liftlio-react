-- =============================================
-- Migration: Etapa 2 - Detecção Automática
-- Descrição: Adiciona colunas para rastreamento de
--            verificações de comentários e deleções
-- Criado: 2025-10-03
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNAS EM "Mensagens"
-- =============================================

-- Coluna: Última vez que comentário foi verificado
ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN "Mensagens".last_verified_at IS
'Última vez que verificamos se comentário ainda existe no YouTube';

-- Coluna: Contador de verificações (máximo 6)
ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

COMMENT ON COLUMN "Mensagens".verification_count IS
'Quantas vezes já verificamos este comentário (max 6: 1h, 6h, 24h, 3d, 7d, 14d)';

-- Coluna: Comentário ainda existe?
ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS still_exists BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN "Mensagens".still_exists IS
'Se FALSE, comentário foi deletado do YouTube';

-- Coluna: Data de detecção da deleção
ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN "Mensagens".deleted_at IS
'Data/hora em que detectamos que comentário foi deletado';

-- =============================================
-- 2. ADICIONAR COLUNA EM "Canais do youtube"
-- =============================================

-- Coluna: Contador de comentários deletados
ALTER TABLE "Canais do youtube"
ADD COLUMN IF NOT EXISTS comments_deleted_count INTEGER DEFAULT 0;

COMMENT ON COLUMN "Canais do youtube".comments_deleted_count IS
'Quantos comentários nossos este canal deletou (usado para blacklist automática)';

-- =============================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índice para buscar mensagens que precisam verificação
CREATE INDEX IF NOT EXISTS idx_mensagens_verificacao
ON "Mensagens" (last_verified_at, verification_count, still_exists)
WHERE respondido = TRUE
  AND youtube_comment_id IS NOT NULL
  AND still_exists = TRUE
  AND verification_count < 6;

COMMENT ON INDEX idx_mensagens_verificacao IS
'Otimiza busca de comentários que precisam ser verificados pelo CRON';

-- Índice para buscar comentários deletados
CREATE INDEX IF NOT EXISTS idx_mensagens_deletadas
ON "Mensagens" (deleted_at)
WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX idx_mensagens_deletadas IS
'Otimiza busca de comentários deletados para análise';

-- Índice para canais com deleções
CREATE INDEX IF NOT EXISTS idx_canais_deleted_count
ON "Canais do youtube" (comments_deleted_count)
WHERE comments_deleted_count > 0;

COMMENT ON INDEX idx_canais_deleted_count IS
'Otimiza busca de canais que deletaram comentários';

-- =============================================
-- 4. VERIFICAÇÃO FINAL
-- =============================================

-- Mostrar colunas adicionadas em Mensagens
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Mensagens'
  AND column_name IN (
    'last_verified_at',
    'verification_count',
    'still_exists',
    'deleted_at'
  )
ORDER BY column_name;

-- Mostrar coluna adicionada em Canais do youtube
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Canais do youtube'
  AND column_name = 'comments_deleted_count';

-- Mostrar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('Mensagens', 'Canais do youtube')
  AND indexname LIKE 'idx_%verifica%'
     OR indexname LIKE 'idx_%deleted%'
ORDER BY tablename, indexname;

-- =============================================
-- RESULTADO ESPERADO:
-- =============================================

/*
Colunas em Mensagens (4):
- last_verified_at      TIMESTAMPTZ   YES   NULL
- verification_count    INTEGER       YES   0
- still_exists          BOOLEAN       YES   TRUE
- deleted_at           TIMESTAMPTZ   YES   NULL

Coluna em Canais do youtube (1):
- comments_deleted_count INTEGER      YES   0

Índices criados (3):
- idx_mensagens_verificacao
- idx_mensagens_deletadas
- idx_canais_deleted_count
*/
