-- =============================================
-- Migration: 20250606074816_enable_pgvector_extension_before_rag
-- Descrição: Instala extensão pgvector ANTES das migrations RAG
-- Propósito: Corrige ordem de dependências - esta migration DEVE
--            executar ANTES da migration RAG (timestamp 074817)
-- Criado: 2025-01-09T20:30:00Z
-- Projeto: Liftlio (suqjifkhmekcdflwowiw)
-- Autor: Supabase MCP Expert Agent
-- =============================================
--
-- CONTEXTO:
-- O sistema RAG do Agente Liftlio depende da extensão pgvector
-- para armazenar embeddings vetoriais em 14 tabelas.
-- Esta migration garante que pgvector esteja disponível
-- ANTES de qualquer tabela com tipo 'vector' ser criada.
--
-- TIMESTAMP ESPECÍFICO:
-- 074816 < 074817 (migration RAG)
-- Isso garante ordem correta de execução no Supabase.
-- =============================================

-- Habilitar extensão pgvector ANTES de criar tabelas com tipo vector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Comentário para documentação
COMMENT ON EXTENSION vector IS 'Extensão pgvector para embeddings vetoriais do sistema RAG';
