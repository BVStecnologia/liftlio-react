-- 1. Função para buscar próximos itens para processar
CREATE OR REPLACE FUNCTION get_unprocessed_items(
    p_limit INT DEFAULT 10
) 
RETURNS TABLE (
    table_name TEXT,
    item_id TEXT,
    content TEXT,
    metadata JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Videos
    RETURN QUERY
    SELECT 
        'Videos'::TEXT,
        v.id::TEXT,
        COALESCE(v."Titulo", '') || ' ' || COALESCE(v."Descricao", '') as content,
        jsonb_build_object(
            'titulo', v."Titulo",
            'canal_id', v."Canal ID",
            'data_publicacao', v."Data de publicação",
            'views', v."Visualizacoes"
        ) as metadata
    FROM "Videos" v
    WHERE v.rag_processed = FALSE OR v.rag_processed IS NULL
    LIMIT p_limit;

    -- Videos_trancricao
    RETURN QUERY
    SELECT 
        'Videos_trancricao'::TEXT,
        vt."ID_video"::TEXT,
        vt."transcricao" as content,
        jsonb_build_object(
            'video_id', vt."ID_video",
            'idioma', vt."Idioma"
        ) as metadata
    FROM "Videos_trancricao" vt
    WHERE vt.rag_processed = FALSE OR vt.rag_processed IS NULL
    LIMIT p_limit;

    -- Comentarios_Principais
    RETURN QUERY
    SELECT 
        'Comentarios_Principais'::TEXT,
        cp.id::TEXT,
        cp."Comentario" as content,
        jsonb_build_object(
            'video_id', cp."Video ID",
            'autor', cp."Autor",
            'likes', cp."Likes",
            'data', cp."Data"
        ) as metadata
    FROM "Comentarios_Principais" cp
    WHERE cp.rag_processed = FALSE OR cp.rag_processed IS NULL
    LIMIT p_limit;

    -- Respostas_Comentarios
    RETURN QUERY
    SELECT 
        'Respostas_Comentarios'::TEXT,
        rc.id::TEXT,
        rc."Resposta" as content,
        jsonb_build_object(
            'comentario_pai_id', rc."Comentario Pai ID",
            'autor', rc."Autor",
            'likes', rc."Likes"
        ) as metadata
    FROM "Respostas_Comentarios" rc
    WHERE rc.rag_processed = FALSE OR rc.rag_processed IS NULL
    LIMIT p_limit;
END;
$$;

-- 2. Função para marcar item como processado
CREATE OR REPLACE FUNCTION mark_item_as_processed(
    p_table_name TEXT,
    p_item_id TEXT,
    p_embedding_id BIGINT DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atualizar o registro na tabela específica
    CASE p_table_name
        WHEN 'Videos' THEN
            UPDATE "Videos" 
            SET rag_processed = TRUE, rag_processed_at = NOW()
            WHERE id::TEXT = p_item_id;
            
        WHEN 'Videos_trancricao' THEN
            UPDATE "Videos_trancricao" 
            SET rag_processed = TRUE, rag_processed_at = NOW()
            WHERE "ID_video"::TEXT = p_item_id;
            
        WHEN 'Comentarios_Principais' THEN
            UPDATE "Comentarios_Principais" 
            SET rag_processed = TRUE, rag_processed_at = NOW()
            WHERE id::TEXT = p_item_id;
            
        WHEN 'Respostas_Comentarios' THEN
            UPDATE "Respostas_Comentarios" 
            SET rag_processed = TRUE, rag_processed_at = NOW()
            WHERE id::TEXT = p_item_id;
            
        WHEN 'Mensagens' THEN
            UPDATE "Mensagens" 
            SET rag_processed = TRUE, rag_processed_at = NOW()
            WHERE id::TEXT = p_item_id;
    END CASE;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- 3. Função para busca semântica
CREATE OR REPLACE FUNCTION search_embeddings(
    query_embedding vector(1536),
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id BIGINT,
    source_table TEXT,
    source_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
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
        1 - (re.embedding <=> query_embedding) as similarity
    FROM rag_embeddings re
    WHERE 1 - (re.embedding <=> query_embedding) > match_threshold
    ORDER BY re.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. Função auxiliar para obter contexto completo
CREATE OR REPLACE FUNCTION get_full_context(
    p_source_table TEXT,
    p_source_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    CASE p_source_table
        WHEN 'Videos' THEN
            SELECT jsonb_build_object(
                'tipo', 'video',
                'titulo', v."Titulo",
                'descricao', v."Descricao",
                'canal', v."Nome do canal",
                'url', 'https://youtube.com/watch?v=' || v.id,
                'views', v."Visualizacoes",
                'likes', v."Likes"
            ) INTO result
            FROM "Videos" v
            WHERE v.id::TEXT = p_source_id;
            
        WHEN 'Videos_trancricao' THEN
            SELECT jsonb_build_object(
                'tipo', 'transcricao',
                'video_id', vt."ID_video",
                'transcricao', vt."transcricao",
                'idioma', vt."Idioma"
            ) INTO result
            FROM "Videos_trancricao" vt
            WHERE vt."ID_video"::TEXT = p_source_id;
            
        WHEN 'Comentarios_Principais' THEN
            SELECT jsonb_build_object(
                'tipo', 'comentario',
                'comentario', cp."Comentario",
                'autor', cp."Autor",
                'video_id', cp."Video ID",
                'likes', cp."Likes"
            ) INTO result
            FROM "Comentarios_Principais" cp
            WHERE cp.id::TEXT = p_source_id;
            
        WHEN 'Respostas_Comentarios' THEN
            SELECT jsonb_build_object(
                'tipo', 'resposta',
                'resposta', rc."Resposta",
                'autor', rc."Autor",
                'likes', rc."Likes"
            ) INTO result
            FROM "Respostas_Comentarios" rc
            WHERE rc.id::TEXT = p_source_id;
    END CASE;
    
    RETURN result;
END;
$$;

-- 5. View para monitorar progresso
CREATE OR REPLACE VIEW rag_processing_progress AS
SELECT 
    'Videos' as table_name,
    COUNT(*) FILTER (WHERE rag_processed = TRUE) as processed,
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL) as pending,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE rag_processed = TRUE) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM "Videos"
UNION ALL
SELECT 
    'Videos_trancricao',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*),
    ROUND(100.0 * COUNT(*) FILTER (WHERE rag_processed = TRUE) / NULLIF(COUNT(*), 0), 2)
FROM "Videos_trancricao"
UNION ALL
SELECT 
    'Comentarios_Principais',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*),
    ROUND(100.0 * COUNT(*) FILTER (WHERE rag_processed = TRUE) / NULLIF(COUNT(*), 0), 2)
FROM "Comentarios_Principais"
UNION ALL
SELECT 
    'Respostas_Comentarios',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*),
    ROUND(100.0 * COUNT(*) FILTER (WHERE rag_processed = TRUE) / NULLIF(COUNT(*), 0), 2)
FROM "Respostas_Comentarios";