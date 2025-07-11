-- 🔍 Função para buscar embeddings similares
-- Realiza busca vetorial por similaridade de cosseno
-- Criado via MCP em: 09/01/2025

CREATE OR REPLACE FUNCTION public.search_rag_embeddings(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    filter_source_table text DEFAULT NULL,
    filter_metadata jsonb DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    source_table text,
    source_id text,
    source_type text,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        re.id,
        re.source_table,
        re.source_id,
        re.source_type,
        re.content,
        re.metadata,
        1 - (re.embedding <=> query_embedding) as similarity
    FROM 
        public.rag_embeddings re
    WHERE 
        -- Filtro de similaridade
        1 - (re.embedding <=> query_embedding) > similarity_threshold
        
        -- Filtros opcionais
        AND (filter_source_table IS NULL OR re.source_table = filter_source_table)
        AND (filter_metadata IS NULL OR re.metadata @> filter_metadata)
        
    ORDER BY 
        re.embedding <=> query_embedding -- Ordenar por distância (menor = mais similar)
    LIMIT 
        match_count;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.search_rag_embeddings IS 'Busca embeddings similares usando similaridade de cosseno';

-- Exemplo de uso:
/*
SELECT * FROM search_rag_embeddings(
    (SELECT embedding FROM rag_embeddings LIMIT 1), -- embedding de exemplo
    0.7,  -- threshold de similaridade
    10,   -- número de resultados
    'Videos_trancricao', -- filtrar por tabela (opcional)
    '{"project_id": "123"}'::jsonb -- filtrar por metadata (opcional)
);
*/

-- Função auxiliar para buscar por texto (vai gerar embedding via Edge Function)
CREATE OR REPLACE FUNCTION public.search_rag_by_text(
    query_text text,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    source_table text,
    source_id text,
    source_type text,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Esta função retorna vazio por enquanto
    -- A Edge Function vai chamar search_rag_embeddings com o embedding gerado
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.search_rag_by_text IS 'Placeholder - use a Edge Function search-rag para buscar por texto';