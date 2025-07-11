-- 🔍 Criação da tabela rag_embeddings
-- Armazena os vetores de embeddings para busca semântica
-- Criado via MCP em: 09/01/2025

-- Habilitar extensão pgvector se não existir
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela principal de embeddings
CREATE TABLE IF NOT EXISTS public.rag_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Identificação da fonte
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT, -- 'video', 'comment', 'project', etc
    
    -- Conteúdo e embedding
    content TEXT NOT NULL, -- Texto original usado para gerar o embedding
    embedding vector(1536) NOT NULL, -- Vetor do OpenAI text-embedding-3-small
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Dados adicionais da fonte
    
    -- Controle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    token_count INTEGER,
    
    -- Único por fonte
    UNIQUE(source_table, source_id)
);

-- Índice para busca vetorial rápida usando HNSW
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector 
ON public.rag_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source 
ON public.rag_embeddings(source_table, source_type);

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_created 
ON public.rag_embeddings(created_at DESC);

-- Índice GIN para busca em metadata JSONB
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata 
ON public.rag_embeddings USING gin(metadata);

-- Comentários para documentação
COMMENT ON TABLE public.rag_embeddings IS 'Armazena embeddings de conteúdo para busca semântica via RAG';
COMMENT ON COLUMN public.rag_embeddings.embedding IS 'Vetor de 1536 dimensões gerado pelo OpenAI text-embedding-3-small';
COMMENT ON COLUMN public.rag_embeddings.metadata IS 'Dados adicionais como project_id, user_id, sentiment, etc';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_rag_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rag_embeddings_updated_at
    BEFORE UPDATE ON public.rag_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_rag_embeddings_updated_at();

-- Grant permissões necessárias
GRANT SELECT ON public.rag_embeddings TO authenticated;
GRANT INSERT, UPDATE ON public.rag_embeddings TO service_role;