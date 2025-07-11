-- =============================================
-- Função: search_rag_embeddings
-- Descrição: Busca semântica básica nos embeddings
-- Autor: Valdair & Claude
-- Data: 10/01/2025
-- =============================================

-- Remover função se já existir (evita erro de duplicação)
DROP FUNCTION IF EXISTS search_rag_embeddings(vector(1536), float, int);

-- Criar função de busca semântica
CREATE OR REPLACE FUNCTION search_rag_embeddings(
  query_embedding vector(1536),  -- Embedding da query de busca
  similarity_threshold float,     -- Limite mínimo de similaridade (0-1)
  match_count int                 -- Número máximo de resultados
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
    -- Filtrar apenas resultados acima do threshold
    1 - (re.embedding <=> query_embedding) > similarity_threshold
    -- Garantir que temos embedding válido
    AND re.embedding IS NOT NULL
  ORDER BY 
    -- Ordenar por similaridade (maior primeiro)
    re.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Comentário sobre a função
COMMENT ON FUNCTION search_rag_embeddings IS 
'Busca semântica nos embeddings usando similaridade de cosseno. Retorna os resultados mais similares à query fornecida.';

-- =============================================
-- Exemplos de uso:
-- =============================================

/*
-- Exemplo 1: Busca com embedding literal
SELECT * FROM search_rag_embeddings(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),  -- Embedding da query
  0.7,                                     -- Threshold mínimo
  5                                        -- Top 5 resultados
);

-- Exemplo 2: Busca usando embedding existente
WITH query_embed AS (
  SELECT embedding FROM rag_embeddings WHERE id = 1
)
SELECT * FROM search_rag_embeddings(
  (SELECT embedding FROM query_embed),
  0.7,
  10
);

-- Exemplo 3: Testar com próprio embedding (deve retornar 100% similaridade)
WITH test AS (
  SELECT id, embedding FROM rag_embeddings LIMIT 1
)
SELECT * FROM search_rag_embeddings(
  (SELECT embedding FROM test),
  0.5,
  5
);
*/