-- 🎫 Schema do Sistema de Suporte Humano
-- Última atualização: 10/01/2025

-- =====================================================
-- TABELA: support_tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Identificação
    ticket_number SERIAL UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    project_id UUID REFERENCES public."Projeto"(id),
    
    -- Detalhes do ticket
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50),
    
    -- Contexto do agente
    agent_conversation JSONB, -- Histórico completo da conversa com o agente
    agent_failure_reason TEXT, -- Por que o agente não conseguiu resolver
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Métricas
    first_response_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    
    -- Satisfação
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    satisfaction_comment TEXT
);

-- Índices para performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_project_id ON public.support_tickets(project_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- =====================================================
-- TABELA: support_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    
    -- Autor da mensagem
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
    
    -- Conteúdo
    message TEXT NOT NULL,
    attachments JSONB, -- URLs de arquivos anexados
    
    -- Metadata
    is_internal BOOLEAN DEFAULT FALSE, -- Notas internas do admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Ações
    action_taken VARCHAR(50), -- Ex: 'status_changed', 'priority_changed'
    action_data JSONB -- Dados da ação
);

-- Índice para buscar mensagens por ticket
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);

-- =====================================================
-- TABELA: support_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Destinatário
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
    
    -- Notificação
    type VARCHAR(50) NOT NULL, -- 'new_ticket', 'new_message', 'status_change', etc
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB
);

-- Índices para notificações
CREATE INDEX idx_support_notifications_user_id ON public.support_notifications(user_id);
CREATE INDEX idx_support_notifications_read ON public.support_notifications(read);
CREATE INDEX idx_support_notifications_created_at ON public.support_notifications(created_at DESC);

-- =====================================================
-- TABELA: support_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Template
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    subject TEXT,
    content TEXT NOT NULL,
    
    -- Metadata
    placeholders JSONB, -- Lista de placeholders disponíveis
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON public.support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_messages_updated_at 
    BEFORE UPDATE ON public.support_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calcular métricas de tempo automaticamente
CREATE OR REPLACE FUNCTION calculate_support_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é a primeira resposta do admin
    IF NEW.author_type = 'admin' AND OLD.first_response_at IS NULL THEN
        UPDATE support_tickets 
        SET 
            first_response_at = NOW(),
            response_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
        WHERE id = NEW.ticket_id;
    END IF;
    
    -- Se mudou status para resolved
    IF NEW.action_taken = 'status_changed' 
       AND NEW.action_data->>'new_status' = 'resolved' THEN
        UPDATE support_tickets 
        SET 
            resolved_at = NOW(),
            resolution_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
        WHERE id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_metrics_on_message 
    AFTER INSERT ON public.support_messages 
    FOR EACH ROW EXECUTE FUNCTION calculate_support_metrics();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para support_tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
    FOR ALL USING (auth.email() = 'valdair3d@gmail.com');

CREATE POLICY "Users can create tickets" ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para support_messages
CREATE POLICY "Users can view messages from own tickets" ON public.support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = support_messages.ticket_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all messages" ON public.support_messages
    FOR ALL USING (auth.email() = 'valdair3d@gmail.com');

CREATE POLICY "Users can create messages on own tickets" ON public.support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = support_messages.ticket_id
            AND user_id = auth.uid()
        )
        AND author_id = auth.uid()
    );

-- Políticas para support_notifications
CREATE POLICY "Users can view own notifications" ON public.support_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.support_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- VIEWS úteis
-- =====================================================

-- View para dashboard de tickets
CREATE OR REPLACE VIEW support_tickets_dashboard AS
SELECT 
    t.*,
    u.email as user_email,
    p."Project name" as project_name,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT CASE WHEN m.read_at IS NULL THEN m.id END) as unread_messages
FROM support_tickets t
LEFT JOIN auth.users u ON t.user_id = u.id
LEFT JOIN public."Projeto" p ON t.project_id = p.id
LEFT JOIN support_messages m ON t.id = m.ticket_id
GROUP BY t.id, u.email, p."Project name";

-- View para métricas de suporte
CREATE OR REPLACE VIEW support_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
    AVG(response_time_minutes) as avg_response_time,
    AVG(resolution_time_minutes) as avg_resolution_time,
    AVG(satisfaction_rating) as avg_satisfaction
FROM support_tickets
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para criar ticket do agente
CREATE OR REPLACE FUNCTION create_support_ticket_from_agent(
    p_user_id UUID,
    p_project_id UUID,
    p_subject TEXT,
    p_description TEXT,
    p_agent_conversation JSONB,
    p_agent_failure_reason TEXT
)
RETURNS UUID AS $$
DECLARE
    v_ticket_id UUID;
BEGIN
    -- Criar ticket
    INSERT INTO support_tickets (
        user_id,
        project_id,
        subject,
        description,
        agent_conversation,
        agent_failure_reason,
        priority
    ) VALUES (
        p_user_id,
        p_project_id,
        p_subject,
        p_description,
        p_agent_conversation,
        p_agent_failure_reason,
        'medium'
    ) RETURNING id INTO v_ticket_id;
    
    -- Criar mensagem inicial do sistema
    INSERT INTO support_messages (
        ticket_id,
        author_id,
        author_type,
        message
    ) VALUES (
        v_ticket_id,
        p_user_id,
        'system',
        'Ticket criado automaticamente pelo agente AI.'
    );
    
    -- Criar notificação para admin
    INSERT INTO support_notifications (
        user_id,
        ticket_id,
        type,
        title,
        body
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'valdair3d@gmail.com'),
        v_ticket_id,
        'new_ticket',
        'Novo ticket de suporte',
        'Um novo ticket foi criado e precisa de sua atenção.'
    );
    
    RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Templates de resposta padrão
INSERT INTO support_templates (name, category, subject, content, placeholders) VALUES
('Boas-vindas', 'geral', 'Bem-vindo ao suporte', 'Olá {{user_name}},\n\nObrigado por entrar em contato. Vou analisar sua solicitação e responder em breve.\n\nAtenciosamente,\nEquipe Liftlio', '["user_name"]'),
('Problema resolvido', 'resolução', 'Problema resolvido', 'Olá {{user_name}},\n\nSeu problema foi resolvido. {{resolution_details}}\n\nSe precisar de mais ajuda, não hesite em contatar.\n\nAtenciosamente,\nEquipe Liftlio', '["user_name", "resolution_details"]'),
('Aguardando informações', 'followup', 'Precisamos de mais informações', 'Olá {{user_name}},\n\nPara resolver seu problema, preciso de algumas informações adicionais:\n\n{{required_info}}\n\nAguardo seu retorno.\n\nAtenciosamente,\nEquipe Liftlio', '["user_name", "required_info"]')
ON CONFLICT DO NOTHING;