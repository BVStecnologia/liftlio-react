-- ========================================
-- SCRIPT COMPLETO - SISTEMA RAG EMBEDDINGS
-- Pode executar este script completo sem se preocupar com duplicações
-- Autor: Valdair & Claude
-- Data: 10/01/2025
-- ========================================

-- 1. Função de busca semântica básica
DROP FUNCTION IF EXISTS search_rag_embeddings(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_rag_embeddings(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  source_table text,
  source_id text,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.source_table,
    re.source_id,
    re.content,
    re.metadata,
    1 - (re.embedding <=> query_embedding) as similarity,
    re.created_at
  FROM rag_embeddings re
  WHERE 
    1 - (re.embedding <=> query_embedding) > similarity_threshold
    AND re.embedding IS NOT NULL
  ORDER BY 
    re.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_rag_embeddings IS 
'Busca semântica nos embeddings usando similaridade de cosseno.';

-- 2. Função de busca com filtros
DROP FUNCTION IF EXISTS search_rag_embeddings_filtered(vector(1536), float, int, text[]);

CREATE OR REPLACE FUNCTION search_rag_embeddings_filtered(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  source_tables text[]
)
RETURNS TABLE (
  id bigint,
  source_table text,
  source_id text,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.source_table,
    re.source_id,
    re.content,
    re.metadata,
    1 - (re.embedding <=> query_embedding) as similarity,
    re.created_at
  FROM rag_embeddings re
  WHERE 
    1 - (re.embedding <=> query_embedding) > similarity_threshold
    AND re.embedding IS NOT NULL
    AND (source_tables IS NULL OR re.source_table = ANY(source_tables))
  ORDER BY 
    re.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_rag_embeddings_filtered IS 
'Busca semântica com opção de filtrar por tabelas específicas.';

-- 3. Índice para performance
DROP INDEX IF EXISTS idx_rag_embeddings_vector;

CREATE INDEX idx_rag_embeddings_vector 
ON rag_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- ========================================
-- FIM DO SCRIPT
-- ========================================