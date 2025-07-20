# 🧠 PLANO ETAPA 1: MEMÓRIA PERFEITA DO AGENTE

## 🎯 OBJETIVO PRINCIPAL
Fazer o agente lembrar de TUDO, saber o contexto da tela do usuário e responder qualquer pergunta sobre os dados de forma natural e precisa.

## 🔍 DIAGNÓSTICO ATUAL (A FAZER)

### 1. Testes de Memória
- [ ] Agente lembra de conversas anteriores?
- [ ] Agente mantém contexto durante a sessão?
- [ ] Agente acessa histórico completo via RAG?

### 2. Testes de Contexto
- [ ] Agente sabe qual página o usuário está?
- [ ] Agente sabe quais dados estão visíveis?
- [ ] Agente entende o que o usuário está fazendo?

### 3. Testes de Dados
- [ ] Agente responde sobre métricas atuais?
- [ ] Agente busca dados históricos?
- [ ] Agente correlaciona informações?

## 📋 IMPLEMENTAÇÃO DETALHADA

### FASE 1: Sistema de Memória Robusta (2-3 dias)

#### 1.1 Memória de Conversação
```typescript
interface ConversationMemory {
  session_id: string;
  user_id: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    context?: {
      page: string;
      visible_data: any;
      user_action?: string;
    };
  }[];
  summary?: string; // Resumo para conversas longas
}
```

#### 1.2 Implementações Necessárias:
1. **Tabela `agent_conversations`**
   - Armazenar conversas completas
   - Incluir contexto de cada mensagem
   - Indexar para busca rápida

2. **Função `save_conversation_turn`**
   - Salvar cada interação
   - Incluir contexto da tela
   - Processar embeddings em tempo real

3. **Função `get_conversation_history`**
   - Buscar últimas N mensagens
   - Incluir resumo se conversa longa
   - Retornar com contexto completo

### FASE 2: Sistema de Contexto de Tela (2-3 dias)

#### 2.1 Captura de Contexto
```typescript
interface ScreenContext {
  current_page: string;
  visible_metrics?: {
    total_mentions: number;
    sentiment_score: number;
    reach: number;
    // etc...
  };
  active_filters?: {
    date_range: string;
    video_id?: string;
    // etc...
  };
  user_actions?: string[]; // últimas ações
}
```

#### 2.2 Implementações:
1. **Frontend - FloatingAgent.tsx**
   - Capturar contexto atual
   - Enviar com cada mensagem
   - Atualizar em tempo real

2. **Edge Function - agente-liftlio**
   - Receber e processar contexto
   - Incluir no prompt do Claude
   - Usar para busca RAG direcionada

### FASE 3: RAG Otimizado (3-4 dias)

#### 3.1 Melhorias na Busca
1. **Multi-stage RAG**
   ```sql
   -- Estágio 1: Busca por embeddings
   -- Estágio 2: Filtro por relevância
   -- Estágio 3: Enriquecimento com contexto
   ```

2. **Busca Contextual**
   - Se usuário está em Overview → priorizar métricas gerais
   - Se está em Mentions → focar em menções
   - Se pergunta sobre passado → buscar histórico

3. **Cache Inteligente**
   - Cache por usuário + projeto
   - Invalidação automática
   - Pré-carregamento de dados comuns

### FASE 4: Suite de Testes Completa (2 dias)

#### 4.1 Testes de API
```typescript
// test-agent-memory.ts
const testCases = [
  {
    name: "Lembra conversa anterior",
    steps: [
      { message: "Meu nome é João", expected: "save_name" },
      { message: "Qual é meu nome?", expected: "João" }
    ]
  },
  {
    name: "Entende contexto de tela",
    context: { page: "overview", metrics: {...} },
    message: "O que estou vendo?",
    expected: "dashboard com X menções"
  },
  {
    name: "Busca dados históricos",
    message: "Como foi o desempenho na semana passada?",
    expected: "dados_corretos_semana_anterior"
  }
];
```

#### 4.2 Testes Automatizados
1. **Via Supabase Functions**
   - Criar função de teste
   - Executar todos os cenários
   - Gerar relatório

2. **Validação de Respostas**
   - Verificar precisão
   - Medir tempo de resposta
   - Confirmar contexto mantido

## 🚀 PLANO DE EXECUÇÃO

### Semana 1: Diagnóstico e Memória
- **Dia 1-2**: Diagnóstico completo + fixes urgentes
- **Dia 3-4**: Implementar memória persistente
- **Dia 5**: Testes de memória

### Semana 2: Contexto e RAG
- **Dia 6-7**: Sistema de contexto de tela
- **Dia 8-9**: Otimização do RAG
- **Dia 10**: Integração completa

### Semana 3: Testes e Refinamento
- **Dia 11-12**: Suite de testes
- **Dia 13-14**: Fixes e otimizações
- **Dia 15**: Validação final

## ✅ CRITÉRIOS DE SUCESSO

1. **Memória Perfeita**
   - [ ] 100% recall de conversas anteriores
   - [ ] Contexto mantido durante toda sessão
   - [ ] Resumos automáticos para conversas longas

2. **Contexto de Tela**
   - [ ] Sempre sabe página atual
   - [ ] Identifica dados visíveis
   - [ ] Responde baseado no que usuário vê

3. **Busca Precisa**
   - [ ] 100% precisão em dados do projeto
   - [ ] Respostas em < 2 segundos
   - [ ] Correlação inteligente de dados

4. **Testes Completos**
   - [ ] 50+ casos de teste passando
   - [ ] Nenhuma falha em produção
   - [ ] Documentação de todos os cenários

## 🔧 FERRAMENTAS E RECURSOS

1. **MCP Supabase** - Deploy e testes
2. **Postman/Insomnia** - Testes de API
3. **pgvector** - Busca semântica
4. **Claude API** - Processamento de linguagem
5. **Logs detalhados** - Debug e monitoramento

## 📊 MÉTRICAS DE SUCESSO

- Taxa de acerto: >95%
- Tempo de resposta: <2s
- Satisfação do usuário: >90%
- Zero erros críticos

---

**IMPORTANTE**: Cada fase deve ser testada exaustivamente antes de prosseguir. Nenhuma feature é considerada completa até passar em TODOS os testes.