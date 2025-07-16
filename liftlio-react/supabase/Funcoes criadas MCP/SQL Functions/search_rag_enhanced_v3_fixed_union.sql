-- Função de busca RAG v3 - Corrigida para incluir mensagens sem embeddings
-- Data: 14/01/2025

DROP FUNCTION IF EXISTS search_rag_enhanced(vector,integer,text,text[],integer,double precision);

CREATE OR REPLACE FUNCTION search_rag_enhanced(
    p_query_embedding vector(1536),
    p_project_id INT,
    p_search_text TEXT,
    p_categories TEXT[] DEFAULT '{}',
    p_limit INT DEFAULT 20,
    p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    result_source_table TEXT,
    result_source_id BIGINT,
    result_content TEXT,
    result_similarity FLOAT,
    result_metadata JSONB,
    result_relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH all_results AS (
        -- Busca vetorial (quando há embedding)
        SELECT 
            r.source_table,
            r.source_id,
            r.content,
            CASE 
                WHEN p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL 
                THEN 1 - (r.embedding <=> p_query_embedding)
                ELSE 0.0
            END AS similarity,
            r.metadata,
            CASE 
                WHEN r.source_table = 'Settings messages posts' THEN 2.0
                WHEN 'scheduled' = ANY(p_categories) AND r.source_table = 'Settings messages posts' THEN 3.0
                ELSE 1.0
            END AS relevance_boost
        FROM rag_embeddings r
        WHERE r.project_id = p_project_id
        AND (
            -- Busca vetorial
            (p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL AND 1 - (r.embedding <=> p_query_embedding) >= p_min_similarity)
            OR
            -- Busca por texto quando não há embedding
            (r.embedding IS NULL AND (
                r.content ILIKE '%' || p_search_text || '%'
                OR r.source_table = 'Settings messages posts'
                OR p_search_text ILIKE '%agendad%' 
                OR p_search_text ILIKE '%scheduled%'
            ))
            OR
            -- Sempre incluir mensagens agendadas quando relevante
            (r.source_table = 'Settings messages posts' AND (
                p_search_text ILIKE '%mensag%' 
                OR p_search_text ILIKE '%agendad%' 
                OR p_search_text ILIKE '%scheduled%'
                OR 'scheduled' = ANY(p_categories)
            ))
        )
    )
    SELECT 
        source_table::TEXT,
        source_id,
        content::TEXT,
        similarity::FLOAT,
        metadata,
        (similarity * relevance_boost)::FLOAT as relevance_score
    FROM all_results
    WHERE similarity > 0.1 
       OR source_table = 'Settings messages posts'
       OR (p_search_text ILIKE '%agendad%' OR p_search_text ILIKE '%scheduled%')
    ORDER BY relevance_score DESC, similarity DESC
    LIMIT p_limit;
END;
$$;