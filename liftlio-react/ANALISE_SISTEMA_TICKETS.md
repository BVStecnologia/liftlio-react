# Análise Sistema de Tickets - Agente Liftlio

## 1. Visão Geral do Sistema

### Objetivo
Criar um sistema de suporte integrado ao agente onde:
- O agente detecta quando não consegue resolver um problema
- Permite ao usuário abrir um ticket
- Admin (valdair3d@gmail.com) gerencia tickets
- Sistema de notificações bidirecionais

## 2. Estrutura do Banco de Dados

### Tabela: support_tickets
```sql
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Informações do ticket
  ticket_number TEXT UNIQUE NOT NULL, -- Ex: LIFT-2024-0001
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Dados do usuário
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  project_id INTEGER REFERENCES Projeto(id),
  project_name TEXT,
  
  -- Contexto do problema
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  agent_conversation JSONB, -- Histórico da conversa com o agente
  page_context TEXT, -- Página onde o problema ocorreu
  browser_info JSONB, -- Navegador, OS, etc
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin
  assigned_to TEXT DEFAULT 'valdair3d@gmail.com',
  
  -- Indices
  INDEX idx_ticket_status (status),
  INDEX idx_ticket_user (user_id),
  INDEX idx_ticket_created (created_at DESC)
);
```

### Tabela: ticket_messages
```sql
CREATE TABLE ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Mensagem
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'user', 'admin', 'system'
  sender_email TEXT NOT NULL,
  
  -- Anexos (opcional)
  attachments JSONB DEFAULT '[]',
  
  -- Metadata
  is_internal BOOLEAN DEFAULT FALSE, -- Notas internas do admin
  read_by_user BOOLEAN DEFAULT FALSE,
  read_by_admin BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: ticket_notifications
```sql
CREATE TABLE ticket_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  type TEXT NOT NULL, -- 'ticket_replied', 'ticket_resolved', 'ticket_closed'
  message TEXT NOT NULL,
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Fluxo do Sistema

### 3.1 Detecção de Necessidade de Suporte
```typescript
// Na edge function agente-liftlio
const needsHumanSupport = (userInput: string, agentResponse: string) => {
  const triggers = [
    'preciso falar com alguém',
    'quero abrir um chamado',
    'need human help',
    'talk to support',
    'isso não resolve meu problema',
    'ainda estou com problema'
  ];
  
  const lowConfidenceResponse = 
    agentResponse.includes("não tenho certeza") ||
    agentResponse.includes("não entendi") ||
    agentResponse.includes("I'm not sure");
    
  return triggers.some(t => userInput.toLowerCase().includes(t)) || lowConfidenceResponse;
};
```

### 3.2 Interface de Criação de Ticket no Agente
```typescript
// Componente TicketForm dentro do FloatingAgent
interface TicketFormData {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  includeConversation: boolean;
}

// Botão "Create Support Ticket" aparece quando apropriado
```

### 3.3 Página Admin de Tickets (/admin/tickets)
```
Funcionalidades:
- Lista de tickets com filtros (status, prioridade, data)
- Visualização detalhada do ticket
- Sistema de mensagens (chat)
- Ações: responder, resolver, fechar, reabrir
- Estatísticas: tempo médio de resposta, tickets resolvidos, etc
- Busca por texto, usuário, projeto
```

### 3.4 Sistema de Notificações

#### Para o Usuário:
1. Badge no FloatingAgent mostrando notificações não lidas
2. Popup quando admin responde
3. Email opcional

#### Para o Admin:
1. Dashboard mostrando novos tickets
2. Notificação browser/push
3. Email para valdair3d@gmail.com

## 4. Implementação Técnica

### 4.1 Edge Functions Necessárias

#### create-ticket
```typescript
// Cria novo ticket
// Envia email para admin
// Retorna número do ticket
```

#### get-user-tickets
```typescript
// Lista tickets do usuário
// Inclui contagem de não lidas
```

#### update-ticket
```typescript
// Admin atualiza status/responde
// Cria notificação para usuário
```

### 4.2 RLS (Row Level Security)
```sql
-- Usuários veem apenas seus tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id OR auth.email() = 'valdair3d@gmail.com');

-- Apenas admin pode atualizar
CREATE POLICY "Only admin can update tickets" ON support_tickets
  FOR UPDATE USING (auth.email() = 'valdair3d@gmail.com');
```

### 4.3 Integração com o Agente

```typescript
// FloatingAgent.tsx
const [showTicketForm, setShowTicketForm] = useState(false);
const [unreadNotifications, setUnreadNotifications] = useState(0);

// Verificar notificações a cada 30 segundos
useEffect(() => {
  const interval = setInterval(checkNotifications, 30000);
  return () => clearInterval(interval);
}, []);

// Mostrar opção de ticket quando apropriado
if (agentCantHelp || userRequestsSupport) {
  return <TicketCreationFlow />;
}
```

## 5. Interface Admin

### 5.1 Rota Protegida
```typescript
// Apenas valdair3d@gmail.com acessa /admin/*
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.email !== 'valdair3d@gmail.com') {
    return <Navigate to="/" />;
  }
  return children;
};
```

### 5.2 Dashboard Admin
```
Componentes:
- TicketList: Lista com filtros e busca
- TicketDetail: Visualização e resposta
- TicketStats: Métricas e gráficos
- QuickActions: Ações em lote
```

## 6. Casos de Uso

### UC1: Usuário Abre Ticket
1. Conversa com agente
2. Agente não resolve
3. Oferece criar ticket
4. Usuário preenche formulário
5. Ticket criado com contexto
6. Email enviado para admin

### UC2: Admin Responde
1. Admin acessa dashboard
2. Vê novo ticket
3. Responde via interface
4. Usuário recebe notificação
5. Badge aparece no agente

### UC3: Conversa Continua
1. Usuário vê resposta
2. Pode responder novamente
3. Thread de mensagens
4. Histórico preservado

## 7. Melhorias Futuras

1. **Categorização Automática**: IA categoriza tickets
2. **Respostas Sugeridas**: Base de conhecimento
3. **Escalação**: Múltiplos níveis de suporte
4. **SLA**: Tempo de resposta garantido
5. **Integração Slack/Discord**: Notificações em tempo real
6. **Dashboard Analytics**: Insights sobre problemas comuns

## 8. Segurança

- Validação de inputs
- Rate limiting para evitar spam
- Criptografia de dados sensíveis
- Audit log de todas ações
- Backup de conversas

## 9. Estimativa de Implementação

1. **Backend (2-3 dias)**
   - Tabelas e RLS
   - Edge functions
   - Sistema de notificações

2. **Frontend Usuário (2 dias)**
   - Formulário de ticket
   - Visualização de respostas
   - Notificações no agente

3. **Frontend Admin (3-4 dias)**
   - Dashboard completo
   - Sistema de mensagens
   - Filtros e busca

4. **Testes e Ajustes (2 dias)**
   - Fluxo completo
   - Edge cases
   - Performance

**Total: ~10 dias de desenvolvimento**