# AGENTE LIFTLIO - Documentação Completa

## 📍 Status Atual (10/01/2025)

### ✅ O que foi implementado:

1. **Agente Claude AI** - Funcionando em produção
   - Edge Function: `agente-liftlio` deployada no Supabase
   - URL: https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio
   - Integração com Claude Opus 4
   - Frontend: FloatingAgent.tsx conectado e operacional

2. **Preparação RAG** - Infraestrutura pronta
   - Tabela `rag_embeddings` criada com pgvector
   - 14 tabelas marcadas com campos `rag_processed` e `rag_processed_at`
   - 2.260 registros prontos para processamento
   - Extensão pgvector ativa e configurada

3. **Sistema de Tickets** - Analisado e documentado
   - Arquitetura completa definida (3 tabelas)
   - Fluxo de notificações bidirecionais
   - Painel admin exclusivo para valdair3d@gmail.com

---

## 🤖 As 3 Camadas do Agente

### 1. Claude AI (Implementado ✅)
**O que faz:**
- Responde perguntas gerais sobre o Liftlio
- Navega entre páginas do sistema
- Entende contexto básico (página atual, projeto selecionado)
- Processa linguagem natural

**Como funciona:**
```typescript
// Edge Function atual
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-opus-4-20250514',
    messages: [...],
    system: systemPrompt // Contexto do Liftlio
  })
});
```

### 2. RAG - Retrieval Augmented Generation (Próximo 🔄)
**O que vai fazer:**
- Buscar em documentação específica do Liftlio
- Acessar dados do projeto do usuário
- Consultar histórico de conversas
- Responder com informações precisas e contextualizadas

**Tabelas preparadas para RAG:**
```
Comentarios_Principais    690 registros
Mensagens                688 registros  
Videos                    96 registros
Videos_trancricao       211 registros
Respostas_Comentarios   471 registros
Scanner de videos        53 registros
Canais do youtube        29 registros
Projeto                   6 registros
Integrações               5 registros
cards                     4 registros
customers                 2 registros
payments                  2 registros
subscriptions             2 registros
Notificacoes              1 registro
----------------------------------------
TOTAL:                2.260 registros
```

**Próximos passos RAG:**
1. Criar função de geração de embeddings
2. Processar todos os registros marcados
3. Implementar busca vetorial
4. Integrar com o agente

### 3. Suporte Humano via Tickets (A implementar 📋)
**O que vai fazer:**
- Detectar quando o agente não consegue resolver
- Oferecer botão "Request Human Support"
- Criar ticket com contexto completo da conversa
- Notificar admin (valdair3d@gmail.com)
- Sistema de mensagens bidirecionais

**Estrutura planejada:**

#### Tabela: support_tickets
```sql
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id TEXT REFERENCES "Projeto"(id),
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    agent_conversation JSONB, -- histórico completo da conversa
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    assigned_to TEXT DEFAULT 'valdair3d@gmail.com'
);
```

#### Tabela: ticket_messages
```sql
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'user', 'admin', 'system'
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: ticket_notifications
```sql
CREATE TABLE ticket_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'new_response', 'status_change', 'resolved'
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 Fluxo Inteligente de Resolução

```
Usuário faz pergunta
        ↓
[1] Claude AI tenta resolver
        ↓
    Resolveu? → Fim ✅
        ↓ Não
[2] RAG busca contexto específico
        ↓
    Encontrou? → Responde → Fim ✅
        ↓ Não
[3] Oferece Suporte Humano
        ↓
    Cria Ticket → Admin responde → Notifica usuário
```

**Estatísticas esperadas:**
- 80% resolvido por Claude AI
- 15% resolvido por RAG
- 5% necessita suporte humano

---

## 🚀 Próximos Passos

### Fase 1: Implementar RAG (Prioridade Alta)
1. [ ] Criar Edge Function para gerar embeddings
2. [ ] Processar os 2.260 registros pendentes
3. [ ] Implementar função de busca semântica
4. [ ] Integrar RAG com agente-liftlio
5. [ ] Testar qualidade das respostas

### Fase 2: Sistema de Tickets (Prioridade Média)
1. [ ] Criar as 3 tabelas de suporte
2. [ ] Implementar detecção de falha do agente
3. [ ] Adicionar botão "Request Human Support"
4. [ ] Criar painel admin em /admin/tickets
5. [ ] Implementar notificações real-time
6. [ ] Configurar emails para admin

### Fase 3: Melhorias (Prioridade Baixa)
1. [ ] Analytics de uso do agente
2. [ ] Feedback dos usuários
3. [ ] Treinamento contínuo do RAG
4. [ ] Integração com mais fontes de dados

---

## 🔧 Configurações e Endpoints

### Edge Function Agente
- **URL**: https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio
- **Método**: POST
- **Headers**: 
  ```
  Authorization: Bearer [SUPABASE_ANON_KEY]
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "prompt": "string",
    "context": {
      "currentPage": "string",
      "currentProject": "object"
    }
  }
  ```

### Variáveis de Ambiente Necessárias
```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (para admin)
```

---

## 📝 Notas Importantes

1. **Segurança**: 
   - API key da Anthropic está segura no Supabase Vault
   - RLS ativo em todas as tabelas
   - Rate limiting implementado

2. **Performance**:
   - Edge Function com timeout de 30s
   - Índices criados para queries RAG
   - Cache de embeddings planejado

3. **Monitoramento**:
   - Logs disponíveis no Supabase Dashboard
   - Métricas de uso a implementar

4. **Custos**:
   - Claude API: ~$0.015 por 1K tokens
   - Supabase Edge Functions: incluído no plano
   - Embeddings: custo a calcular

---

## 🎯 Objetivo Final

Criar um agente inteligente que:
1. Responde instantaneamente a maioria das perguntas
2. Busca informações específicas quando necessário
3. Escala para suporte humano apenas em casos complexos
4. Aprende continuamente com novos dados
5. Oferece experiência excepcional ao usuário

---

*Última atualização: 10/01/2025 por Claude com Valdair*