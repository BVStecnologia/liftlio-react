-- RLS policies para rag_embeddings
-- Criado via MCP em: 11/01/2025
-- Descrição: Políticas de segurança para isolamento de embeddings por projeto

-- Habilitar RLS na tabela rag_embeddings
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários só veem embeddings de seus projetos
CREATE POLICY "Users see only their project embeddings" 
ON public.rag_embeddings 
FOR SELECT 
USING (
    project_id IN (
        SELECT id FROM public."Projeto" 
        WHERE "User id" = auth.uid()
    )
);

-- Política para INSERT: service_role pode inserir (para Edge Functions)
CREATE POLICY "Service role can insert embeddings" 
ON public.rag_embeddings 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Política para UPDATE: service_role pode atualizar
CREATE POLICY "Service role can update embeddings" 
ON public.rag_embeddings 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Política para DELETE: service_role pode deletar
CREATE POLICY "Service role can delete embeddings" 
ON public.rag_embeddings 
FOR DELETE 
TO service_role
USING (true);