-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Adicionar campos RAG básicos e tabela de embeddings
-- Data: 2025-06-06
-- Depende de: 20240101000000_install_extensions.sql
-- ═══════════════════════════════════════════════════════════════

-- Garantir que extension existe (redundância proposital)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: rag_embeddings
-- Descrição: Armazena embeddings vetoriais para busca semântica
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rag_embeddings (
    id BIGSERIAL PRIMARY KEY,

    -- Metadados da origem
    source_table TEXT NOT NULL,           -- Nome da tabela de origem (Videos, Comentarios, etc)
    source_id TEXT NOT NULL,              -- ID do registro original

    -- Conteúdo e embedding
    content TEXT NOT NULL,                -- Texto que foi convertido em embedding
    embedding extensions.vector(1536),   -- ⚠️ Vetor do embedding (1536 dimensões para OpenAI)

    -- Metadados adicionais
    metadata JSONB DEFAULT '{}'::jsonb,  -- Dados extras (tags, categorias, etc)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT rag_embeddings_source_unique UNIQUE(source_table, source_id)
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES - Otimização de queries
-- ═══════════════════════════════════════════════════════════════

-- Index para busca por source
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source
  ON public.rag_embeddings(source_table, source_id);

-- Index para similarity search (IVFFLAT)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON public.rag_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- Index para busca temporal
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_created
  ON public.rag_embeddings(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: Atualizar updated_at automaticamente
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_rag_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar timestamp em updates
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trigger_update_rag_embeddings_updated_at
  BEFORE UPDATE ON public.rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rag_embeddings_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ler
CREATE POLICY "Authenticated users can read embeddings"
  ON public.rag_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas service_role pode inserir/atualizar
CREATE POLICY "Service role can insert embeddings"
  ON public.rag_embeddings
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update embeddings"
  ON public.rag_embeddings
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete embeddings"
  ON public.rag_embeddings
  FOR DELETE
  TO service_role
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- GRANTS - Permissões
-- ═══════════════════════════════════════════════════════════════

GRANT SELECT ON public.rag_embeddings TO authenticated;
GRANT ALL ON public.rag_embeddings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE rag_embeddings_id_seq TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- COMENTÁRIOS - Documentação
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE public.rag_embeddings IS 'Armazena embeddings vetoriais para busca semântica RAG';
COMMENT ON COLUMN public.rag_embeddings.embedding IS 'Vetor de 1536 dimensões (OpenAI text-embedding-3-small)';
COMMENT ON COLUMN public.rag_embeddings.source_table IS 'Tabela de origem do conteúdo';
COMMENT ON COLUMN public.rag_embeddings.source_id IS 'ID do registro na tabela de origem';
