-- =============================================
-- Função: search_rag_embeddings_filtered
-- Descrição: Busca semântica com filtro de tabelas
-- Autor: Valdair & Claude
-- Data: 10/01/2025
-- =============================================

-- Remover função se já existir (evita erro de duplicação)
DROP FUNCTION IF EXISTS search_rag_embeddings_filtered(vector(1536), float, int, text[]);

-- Criar função de busca com filtros
CREATE OR REPLACE FUNCTION search_rag_embeddings_filtered(
  query_embedding vector(1536),  -- Embedding da query de busca
  similarity_threshold float,     -- Limite mínimo de similaridade (0-1)
  match_count int,                -- Número máximo de resultados
  source_tables text[]            -- Array de tabelas para filtrar (NULL = todas)
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
    -- Filtrar por similaridade
    1 - (re.embedding <=> query_embedding) > similarity_threshold
    -- Garantir embedding válido
    AND re.embedding IS NOT NULL
    -- Filtrar por tabelas se fornecido
    AND (source_tables IS NULL OR re.source_table = ANY(source_tables))
  ORDER BY 
    -- Ordenar por similaridade
    re.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Comentário sobre a função
COMMENT ON FUNCTION search_rag_embeddings_filtered IS 
'Busca semântica com opção de filtrar por tabelas específicas. Útil para buscar apenas em determinados tipos de conteúdo.';

-- =============================================
-- Exemplos de uso:
-- =============================================

/*
-- Exemplo 1: Buscar apenas em Videos e Comentarios_Principais
SELECT * FROM search_rag_embeddings_filtered(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),
  0.7,
  5,
  ARRAY['Videos', 'Comentarios_Principais']
);

-- Exemplo 2: Buscar em todas as tabelas (passar NULL)
SELECT * FROM search_rag_embeddings_filtered(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),
  0.7,
  5,
  NULL
);

-- Exemplo 3: Buscar apenas em tabelas de pagamento
SELECT * FROM search_rag_embeddings_filtered(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),
  0.6,
  10,
  ARRAY['payments', 'subscriptions', 'customers', 'cards']
);

-- Exemplo 4: Buscar conteúdo de um projeto específico
WITH project_tables AS (
  SELECT ARRAY['Projeto', 'Scanner de videos do youtube', 'Integrações'] as tables
)
SELECT * FROM search_rag_embeddings_filtered(
  '[0.1, 0.2, ..., 0.5]'::vector(1536),
  0.7,
  20,
  (SELECT tables FROM project_tables)
);
*/