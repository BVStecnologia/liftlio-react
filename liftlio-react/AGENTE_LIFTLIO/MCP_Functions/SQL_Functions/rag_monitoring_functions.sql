-- Funções de monitoramento do sistema RAG
-- Criado em: 11/01/2025
-- Descrição: Funções para monitorar o progresso e status do processamento RAG

-- 1. Status geral do processamento
CREATE OR REPLACE FUNCTION get_rag_processing_status()
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    processed BIGINT,
    pending BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Mensagens'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN rag_processed = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN rag_processed = false THEN 1 END)::BIGINT,
        ROUND(COUNT(CASE WHEN rag_processed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
    FROM "Mensagens"
    
    UNION ALL
    
    SELECT 
        'Comentarios_Principais'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN rag_processed = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN rag_processed = false THEN 1 END)::BIGINT,
        ROUND(COUNT(CASE WHEN rag_processed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
    FROM "Comentarios_Principais"
    
    UNION ALL
    
    SELECT 
        'Videos'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN rag_processed = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN rag_processed = false THEN 1 END)::BIGINT,
        ROUND(COUNT(CASE WHEN rag_processed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
    FROM "Videos"
    
    UNION ALL
    
    SELECT 
        'Respostas_Comentarios'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN rag_processed = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN rag_processed = false THEN 1 END)::BIGINT,
        ROUND(COUNT(CASE WHEN rag_processed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
    FROM "Respostas_Comentarios"
    
    ORDER BY pending DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Estatísticas do RAG embeddings
CREATE OR REPLACE FUNCTION get_rag_embeddings_stats()
RETURNS TABLE(
    source_table TEXT,
    total_embeddings BIGINT,
    projects_count BIGINT,
    avg_content_length NUMERIC,
    last_processed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.source_table,
        COUNT(*)::BIGINT as total_embeddings,
        COUNT(DISTINCT r.project_id)::BIGINT as projects_count,
        ROUND(AVG(LENGTH(r.content))::NUMERIC, 0) as avg_content_length,
        MAX(r.created_at) as last_processed
    FROM rag_embeddings r
    GROUP BY r.source_table
    ORDER BY total_embeddings DESC;
END;
$$ LANGUAGE plpgsql;