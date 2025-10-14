-- =============================================
-- Migration: enable_pgvector_extension
-- Descrição: Instala a extensão pgvector para suporte a embeddings vetoriais
-- Uso: Sistema RAG (Retrieval-Augmented Generation) do Agente Liftlio
-- Tecnologia: pgvector (PostgreSQL extension for vector similarity search)
-- Embeddings: OpenAI text-embedding-ada-002 (1536 dimensões)
-- Criado: 2025-10-09
-- Autor: Supabase MCP Expert Agent
-- =============================================
--
-- Contexto:
-- Esta extensão permite armazenar e buscar vetores (embeddings) no PostgreSQL,
-- essencial para o sistema de RAG que permite o Agente Liftlio responder
-- perguntas baseadas em contexto armazenado em 14 tabelas diferentes.
--
-- Após instalação, tabelas podem ter colunas tipo vector(1536) para embeddings
-- e usar operadores de similaridade (<->, <#>, <=>) para busca semântica.
-- =============================================

-- Criar extensão pgvector se não existir
CREATE EXTENSION IF NOT EXISTS vector;

-- Comentário de documentação
COMMENT ON EXTENSION vector IS 'Extensão para armazenamento e busca de vetores (embeddings) usado no sistema RAG do Agente Liftlio';
