-- =============================================
-- Função: search_rag_for_agent
-- Descrição: Busca no sistema RAG para o agente AI
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.search_rag_for_agent(vector, integer, text, text[], integer, double precision);

CREATE OR REPLACE FUNCTION public.search_rag_for_agent(
    p_query_embedding vector,
    p_project_id integer,
    p_search_text text DEFAULT NULL,
    p_categories text[] DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_min_similarity double precision DEFAULT 0.3
)
 RETURNS TABLE(
    content text,
    source_table text,
    similarity double precision,
    metadata jsonb,
    relevance_score double precision,
    created_at timestamp with time zone
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        r.content,
        r.source_table,
        1 - (r.embedding <=> p_query_embedding) as similarity,
        r.metadata,
        -- Relevance score baseado em similaridade e keywords
        CASE 
            WHEN p_search_text IS NOT NULL AND r.content ILIKE '%' || p_search_text || '%' 
            THEN (1 - (r.embedding <=> p_query_embedding)) * 1.5
            ELSE 1 - (r.embedding <=> p_query_embedding)
        END as relevance_score,
        r.created_at
    FROM rag_embeddings r
    WHERE r.project_id = p_project_id
        AND r.embedding IS NOT NULL
        AND (1 - (r.embedding <=> p_query_embedding)) >= p_min_similarity
        -- Filtro opcional por categorias/tabelas
        AND (
            p_categories IS NULL 
            OR r.source_table = ANY(p_categories)
            OR (
                'comments' = ANY(p_categories) AND r.source_table IN ('Comentarios_Principais', 'Respostas_Comentarios')
            )
            OR (
                'scheduled' = ANY(p_categories) AND r.source_table = 'Settings messages posts'
            )
            OR (
                'mentions' = ANY(p_categories) AND r.source_table = 'Mensagens'
            )
            OR (
                'videos' = ANY(p_categories) AND r.source_table IN ('Videos', 'Videos_trancricao')
            )
        )
    ORDER BY relevance_score DESC
    LIMIT p_limit;
END;
$function$;