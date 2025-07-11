-- 🔧 Funções para preparar conteúdo para embeddings
-- Extrai e formata texto de cada tabela para processamento
-- Criado via MCP em: 09/01/2025

-- Videos_trancricao
CREATE OR REPLACE FUNCTION prepare_rag_content_videos_transcricao(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        transcricao as content,
        jsonb_build_object(
            'video_id', video_id,
            'type', 'transcricao'
        ) as metadata
    FROM Videos_trancricao
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios_Principais
CREATE OR REPLACE FUNCTION prepare_rag_content_comentarios(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        comentario as content,
        jsonb_build_object(
            'video_id', "vídeo id",
            'canal_id', "Canal id",
            'sentiment', sentiment,
            'autor', autor,
            'type', 'comentario'
        ) as metadata
    FROM "Comentarios_Principais"
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Mensagens
CREATE OR REPLACE FUNCTION prepare_rag_content_mensagens(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mensagem as content,
        jsonb_build_object(
            'project_id', project_id,
            'user_id', user_id,
            'tipo', tipo,
            'type', 'mensagem'
        ) as metadata
    FROM Mensagens
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Videos
CREATE OR REPLACE FUNCTION prepare_rag_content_videos(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(video_title, '') || ' ' || 
        COALESCE(video_description, '') || ' ' || 
        COALESCE(ai_analysis_summary, '') as content,
        jsonb_build_object(
            'video_id', "VIDEO",
            'channel', "Channel",
            'view_count', view_count,
            'like_count', like_count,
            'relevance_score', relevance_score,
            'type', 'video_metadata'
        ) as metadata
    FROM Videos
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Projeto
CREATE OR REPLACE FUNCTION prepare_rag_content_projeto(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE("Project name", '') || ' ' || 
        COALESCE("description service", '') || ' ' || 
        COALESCE("Keywords", '') as content,
        jsonb_build_object(
            'user_id', "User id",
            'status', status,
            'country', "País",
            'type', 'projeto'
        ) as metadata
    FROM Projeto
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Canais do youtube
CREATE OR REPLACE FUNCTION prepare_rag_content_canais(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(nome, '') || ' ' || COALESCE(descricao, '') as content,
        jsonb_build_object(
            'canal_id', canal_id,
            'inscritos', inscritos,
            'type', 'canal'
        ) as metadata
    FROM "Canais do youtube"
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Scanner de videos
CREATE OR REPLACE FUNCTION prepare_rag_content_scanner(record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(query, '') || ' Status: ' || COALESCE(status, '') as content,
        jsonb_build_object(
            'project_id', project_id,
            'resultados', resultados_encontrados,
            'type', 'scanner_query'
        ) as metadata
    FROM "Scanner de videos"
    WHERE id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função genérica para preparar conteúdo de qualquer tabela
CREATE OR REPLACE FUNCTION prepare_rag_content(table_name text, record_id text)
RETURNS TABLE (content text, metadata jsonb) AS $$
BEGIN
    -- Roteamento baseado no nome da tabela
    CASE table_name
        WHEN 'Videos_trancricao' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_videos_transcricao(record_id);
        WHEN 'Comentarios_Principais' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_comentarios(record_id);
        WHEN 'Mensagens' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_mensagens(record_id);
        WHEN 'Videos' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_videos(record_id);
        WHEN 'Projeto' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_projeto(record_id);
        WHEN 'Canais do youtube' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_canais(record_id);
        WHEN 'Scanner de videos' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_scanner(record_id);
        ELSE
            -- Para outras tabelas, retornar vazio
            RETURN;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Função para listar registros pendentes de uma tabela
CREATE OR REPLACE FUNCTION get_pending_rag_records(
    table_name text,
    limit_count int DEFAULT 50
)
RETURNS TABLE (id text) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT id::text 
        FROM %I 
        WHERE rag_processed = FALSE OR rag_processed IS NULL
        ORDER BY created_at DESC
        LIMIT %s
    ', table_name, limit_count);
EXCEPTION
    WHEN undefined_column THEN
        -- Se não tem created_at, ordenar por id
        RETURN QUERY EXECUTE format('
            SELECT id::text 
            FROM %I 
            WHERE rag_processed = FALSE OR rag_processed IS NULL
            LIMIT %s
        ', table_name, limit_count);
END;
$$ LANGUAGE plpgsql;