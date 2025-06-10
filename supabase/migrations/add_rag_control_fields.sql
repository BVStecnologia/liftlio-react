-- Migration: Adicionar campos de controle RAG
-- Data: 2025-01-06
-- Descrição: Adiciona campos para rastrear processamento RAG em todas as tabelas relevantes

-- 1. Adicionar campo rag_processed em Videos
ALTER TABLE "Videos" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_embedding_id BIGINT;

-- 2. Adicionar campo rag_processed em Videos_trancricao
ALTER TABLE "Videos_trancricao" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_embedding_id BIGINT;

-- 3. Adicionar campo rag_processed em Comentarios_Principais
ALTER TABLE "Comentarios_Principais" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_embedding_id BIGINT;

-- 4. Adicionar campo rag_processed em Respostas_Comentarios
ALTER TABLE "Respostas_Comentarios" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_embedding_id BIGINT;

-- 5. Adicionar campo rag_processed em Mensagens
ALTER TABLE "Mensagens" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_embedding_id BIGINT;

-- 6. Criar tabela de embeddings para RAG
CREATE TABLE IF NOT EXISTS "rag_embeddings" (
    id BIGSERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT GENERATED ALWAYS AS (md5(content)) STORED,
    embedding vector(1536), -- Para OpenAI embeddings
    model_used TEXT DEFAULT 'text-embedding-ada-002',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_table, source_id)
);

-- 7. Criar índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_videos_rag_processed 
ON "Videos"(rag_processed) 
WHERE rag_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_videos_transcricao_rag_processed 
ON "Videos_trancricao"(rag_processed) 
WHERE rag_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_comentarios_rag_processed 
ON "Comentarios_Principais"(rag_processed) 
WHERE rag_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_respostas_rag_processed 
ON "Respostas_Comentarios"(rag_processed) 
WHERE rag_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_mensagens_rag_processed 
ON "Mensagens"(rag_processed) 
WHERE rag_processed = FALSE;

-- Índice para busca vetorial
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector 
ON rag_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 8. Criar função para marcar item como processado
CREATE OR REPLACE FUNCTION mark_as_rag_processed(
    p_table_name TEXT,
    p_record_id TEXT,
    p_embedding_id BIGINT
) RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        UPDATE %I 
        SET rag_processed = TRUE, 
            rag_processed_at = NOW(),
            rag_embedding_id = $1
        WHERE id = $2',
        p_table_name
    ) USING p_embedding_id, p_record_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar view para monitorar progresso do RAG
CREATE OR REPLACE VIEW rag_processing_status AS
SELECT 
    'Videos' as table_name,
    COUNT(*) FILTER (WHERE rag_processed = TRUE) as processed,
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL) as pending,
    COUNT(*) as total
FROM "Videos"
UNION ALL
SELECT 
    'Videos_trancricao',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*)
FROM "Videos_trancricao"
UNION ALL
SELECT 
    'Comentarios_Principais',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*)
FROM "Comentarios_Principais"
UNION ALL
SELECT 
    'Respostas_Comentarios',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*)
FROM "Respostas_Comentarios"
UNION ALL
SELECT 
    'Mensagens',
    COUNT(*) FILTER (WHERE rag_processed = TRUE),
    COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL),
    COUNT(*)
FROM "Mensagens";

-- 10. Criar função para buscar próximos itens para processar
CREATE OR REPLACE FUNCTION get_next_rag_items(
    p_table_name TEXT,
    p_limit INT DEFAULT 10
) RETURNS TABLE (
    id TEXT,
    content TEXT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT id::TEXT, 
               CASE 
                   WHEN %I = ''Videos'' THEN "Titulo" || '' - '' || COALESCE("Descricao", '''')
                   WHEN %I = ''Videos_trancricao'' THEN "transcricao"
                   WHEN %I = ''Comentarios_Principais'' THEN "Comentario"
                   WHEN %I = ''Respostas_Comentarios'' THEN "Resposta"
                   WHEN %I = ''Mensagens'' THEN "conteudo"
               END as content
        FROM %I
        WHERE rag_processed = FALSE OR rag_processed IS NULL
        ORDER BY created_at DESC
        LIMIT $1',
        p_table_name, p_table_name, p_table_name, p_table_name, p_table_name, p_table_name
    ) USING p_limit;
END;
$$ LANGUAGE plpgsql;

-- Comentários sobre o uso:
COMMENT ON COLUMN "Videos".rag_processed IS 'Indica se o vídeo foi processado para RAG';
COMMENT ON COLUMN "Videos".rag_processed_at IS 'Data/hora do processamento RAG';
COMMENT ON COLUMN "Videos".rag_embedding_id IS 'ID do embedding na tabela rag_embeddings';
COMMENT ON TABLE rag_embeddings IS 'Armazena embeddings de todos os conteúdos para busca semântica (RAG)';