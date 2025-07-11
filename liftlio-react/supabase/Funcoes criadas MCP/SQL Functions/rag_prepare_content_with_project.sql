-- Funções para preparar conteúdo RAG com project_id
-- Criado via MCP em: 11/01/2025
-- Descrição: Prepara conteúdo das tabelas incluindo project_id para isolamento

-- Função para preparar conteúdo das Mensagens
CREATE OR REPLACE FUNCTION prepare_rag_content_mensagens_v2(record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.mensagem as content,
        jsonb_build_object(
            'project_id', m.project_id,
            'user_id', m.user_id,
            'tipo', m.tipo,
            'type', 'mensagem',
            'created_at', m.criado_em
        ) as metadata,
        m.project_id::integer
    FROM "Mensagens" m
    WHERE m.id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função para preparar conteúdo dos Videos
CREATE OR REPLACE FUNCTION prepare_rag_content_videos_v2(record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(v.video_title, '') || ' ' || 
        COALESCE(v.video_description, '') || ' ' || 
        COALESCE(v.ai_analysis_summary, '') as content,
        jsonb_build_object(
            'video_id', v."VIDEO",
            'channel', v."Channel",
            'view_count', v.view_count,
            'like_count', v.like_count,
            'relevance_score', v.relevance_score,
            'type', 'video_metadata',
            'created_at', v.created_at
        ) as metadata,
        s."Projeto_id"::integer as project_id
    FROM "Videos" v
    LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE v.id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função para preparar conteúdo do Projeto
CREATE OR REPLACE FUNCTION prepare_rag_content_projeto_v2(record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p."Project name", '') || ' ' || 
        COALESCE(p."description service", '') || ' ' || 
        COALESCE(p."Keywords", '') as content,
        jsonb_build_object(
            'user_id', p."User id",
            'status', p.status,
            'country', p."País",
            'type', 'projeto',
            'created_at', p.criado_em
        ) as metadata,
        p.id::integer as project_id
    FROM "Projeto" p
    WHERE p.id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função para preparar conteúdo dos Comentarios_Principais
CREATE OR REPLACE FUNCTION prepare_rag_content_comentarios_v2(record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.comentario as content,
        jsonb_build_object(
            'video_id', cp.video_id,
            'canal_id', cp."Canal id",
            'sentiment', cp.sentiment,
            'autor', cp.autor,
            'type', 'comentario',
            'created_at', cp.created_at
        ) as metadata,
        cp.project_id::integer
    FROM "Comentarios_Principais" cp
    WHERE cp.id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função para preparar conteúdo das Videos_trancricao
CREATE OR REPLACE FUNCTION prepare_rag_content_transcricao_v2(record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vt.transcricao as content,
        jsonb_build_object(
            'video_id', vt.video_id,
            'type', 'transcricao',
            'created_at', vt.created_at
        ) as metadata,
        COALESCE(
            -- Primeiro tenta via table video
            (SELECT s."Projeto_id"::integer 
             FROM "Videos" v 
             JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id 
             WHERE v.id = vt."table video"),
            -- Se não encontrar, tenta via YouTube ID
            (SELECT s."Projeto_id"::integer 
             FROM "Videos" v 
             JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id 
             WHERE v."VIDEO" = vt.video_id)
        ) as project_id
    FROM "Videos_trancricao" vt
    WHERE vt.id::text = record_id;
END;
$$ LANGUAGE plpgsql;

-- Função genérica atualizada para incluir project_id
CREATE OR REPLACE FUNCTION prepare_rag_content_v2(table_name text, record_id text)
RETURNS TABLE (content text, metadata jsonb, project_id integer) AS $$
BEGIN
    CASE table_name
        WHEN 'Mensagens' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_mensagens_v2(record_id);
        WHEN 'Videos' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_videos_v2(record_id);
        WHEN 'Projeto' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_projeto_v2(record_id);
        WHEN 'Comentarios_Principais' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_comentarios_v2(record_id);
        WHEN 'Videos_trancricao' THEN
            RETURN QUERY SELECT * FROM prepare_rag_content_transcricao_v2(record_id);
        ELSE
            -- Para outras tabelas, retornar vazio
            RETURN;
    END CASE;
END;
$$ LANGUAGE plpgsql;