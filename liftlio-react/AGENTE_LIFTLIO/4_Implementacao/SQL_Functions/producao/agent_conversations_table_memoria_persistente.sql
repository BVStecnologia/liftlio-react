-- Criar tabela de conversas do agente
CREATE TABLE IF NOT EXISTS public.agent_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES public."Projeto"(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    rag_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_agent_conversations_user_project 
ON public.agent_conversations(user_id, project_id);

CREATE INDEX idx_agent_conversations_session 
ON public.agent_conversations(session_id);

CREATE INDEX idx_agent_conversations_created 
ON public.agent_conversations(created_at DESC);

-- Índice para busca vetorial (só cria se houver embeddings)
CREATE INDEX idx_agent_conversations_embedding 
ON public.agent_conversations 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Índice para processamento RAG
CREATE INDEX idx_agent_conversations_rag_pending
ON public.agent_conversations(rag_processed, created_at)
WHERE rag_processed = FALSE;

-- RLS (Row Level Security)
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver suas próprias conversas
CREATE POLICY "Users can view own conversations" 
ON public.agent_conversations
FOR SELECT 
USING (auth.uid() = user_id);

-- Política: Usuários podem criar suas próprias conversas
CREATE POLICY "Users can create own conversations" 
ON public.agent_conversations
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política: Sistema pode ler todas as conversas (para admin/análise)
CREATE POLICY "Service role can access all conversations"
ON public.agent_conversations
FOR ALL
USING (auth.role() = 'service_role');

-- Função para limpar conversas antigas (opcional - 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
    DELETE FROM public.agent_conversations
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários na tabela
COMMENT ON TABLE public.agent_conversations IS 'Armazena histórico de conversas do agente AI para memória persistente';
COMMENT ON COLUMN public.agent_conversations.session_id IS 'UUID único para cada sessão de conversa';
COMMENT ON COLUMN public.agent_conversations.message_type IS 'Tipo da mensagem: user (usuário) ou assistant (AI)';
COMMENT ON COLUMN public.agent_conversations.embedding IS 'Vetor de embedding para busca semântica';
COMMENT ON COLUMN public.agent_conversations.rag_processed IS 'Indica se o embedding foi processado para RAG';