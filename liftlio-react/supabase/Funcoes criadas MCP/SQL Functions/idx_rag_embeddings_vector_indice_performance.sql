-- =============================================
-- Índice: idx_rag_embeddings_vector
-- Descrição: Índice HNSW para busca vetorial rápida
-- Autor: Valdair & Claude
-- Data: 10/01/2025
-- =============================================

-- Remover índice se já existir (evita erro de duplicação)
DROP INDEX IF EXISTS idx_rag_embeddings_vector;

-- Criar índice para melhorar performance das buscas
-- Usa índice HNSW (Hierarchical Navigable Small World) para busca aproximada rápida
CREATE INDEX idx_rag_embeddings_vector 
ON rag_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- =============================================
-- Informações sobre o índice:
-- =============================================

/*
O índice HNSW é ideal para busca de similaridade em vetores de alta dimensão.

Características:
- Busca aproximada muito rápida (sub-linear)
- Ótimo para datasets grandes (milhões de vetores)
- Trade-off entre velocidade e precisão
- Usa operador de distância de cosseno

Parâmetros de configuração (opcionais):
- m: número de conexões por nó (default: 16)
- ef_construction: tamanho da lista durante construção (default: 200)

Exemplo com parâmetros customizados:
CREATE INDEX idx_rag_embeddings_vector 
ON rag_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 400);

Para verificar se o índice está sendo usado:
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM search_rag_embeddings(
  '[...]'::vector(1536), 
  0.7, 
  5
);
*/

-- =============================================
-- Queries úteis para monitoramento:
-- =============================================

/*
-- Verificar tamanho do índice
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname = 'idx_rag_embeddings_vector';

-- Verificar uso do índice
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname = 'idx_rag_embeddings_vector';

-- Reconstruir índice se necessário (manutenção)
REINDEX INDEX idx_rag_embeddings_vector;
*/