-- Adicionar coluna project_id à tabela rag_embeddings
-- Criado via MCP em: 11/01/2025
-- Descrição: Adiciona project_id para isolamento de dados entre projetos

ALTER TABLE public.rag_embeddings 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES public."Projeto"(id);

-- Criar índice composto para performance
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_project_combo 
ON public.rag_embeddings(project_id, source_table, created_at DESC);

-- Adicionar comentário
COMMENT ON COLUMN public.rag_embeddings.project_id IS 'ID do projeto para isolamento de dados entre usuários';