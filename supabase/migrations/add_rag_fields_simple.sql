-- Migration: Adicionar campos RAG básicos
-- Data: 2025-01-06

-- 1. Criar tabela única de embeddings
CREATE TABLE IF NOT EXISTS "rag_embeddings" (
    id BIGSERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,  -- nome da tabela de origem (Videos, Comentarios, etc)
    source_id TEXT NOT NULL,      -- ID do registro original
    content TEXT NOT NULL,        -- texto que foi convertido em embedding
    embedding vector(1536),       -- vetor do embedding (1536 dimensões para OpenAI)
    metadata JSONB,              -- dados extras (título, autor, data, etc)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar campos de controle nas tabelas
ALTER TABLE "Videos" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ;

ALTER TABLE "Videos_trancricao" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ;

ALTER TABLE "Comentarios_Principais" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ;

ALTER TABLE "Respostas_Comentarios" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ;

ALTER TABLE "Mensagens" 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMPTZ;

-- 3. Criar índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_embeddings_unique 
ON rag_embeddings(source_table, source_id);

-- 4. Criar índice para busca vetorial rápida
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector 
ON rag_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);