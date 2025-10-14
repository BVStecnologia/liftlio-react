-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Install Required Extensions
-- Data: 2024-01-01 (timestamp baixo para rodar PRIMEIRO)
-- Descrição: Instala todas as extensions necessárias antes das tabelas
-- ═══════════════════════════════════════════════════════════════

-- Criar schema para extensions se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- ═══════════════════════════════════════════════════════════════
-- PGVECTOR - Para embeddings de IA (RAG, similarity search)
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- UUID-OSSP - Para geração de UUIDs
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- PGCRYPTO - Para funções de criptografia
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- HTTP - Para chamadas HTTP do banco (se necessário)
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- Garantir permissões corretas
-- ═══════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════
-- Comentários para documentação
-- ═══════════════════════════════════════════════════════════════
COMMENT ON SCHEMA extensions IS 'Schema para todas as PostgreSQL extensions';
COMMENT ON EXTENSION vector IS 'pgvector - Vector similarity search para embeddings de IA';
