# 🧪 Estratégia Completa de Testes - Agente Liftlio v62

## 📋 Sumário
1. [Análise do Comportamento Atual](#análise-do-comportamento-atual)
2. [Problemas Identificados](#problemas-identificados)
3. [Suite de Testes](#suite-de-testes)
4. [Prompts Padronizados](#prompts-padronizados)
5. [Métricas de Qualidade](#métricas-de-qualidade)
6. [Plano de Ação](#plano-de-ação)

---

## 🔍 Análise do Comportamento Atual

### Resposta Atual vs Esperada:

| Pergunta | Resposta Atual | Resposta Esperada | Status |
|----------|----------------|-------------------|---------|
| "oi" | "Olá! 👋 Sou o assistente do **Liftlio**. Como posso ajudar você hoje?" | "📊 **Resumo de hoje:**<br>↑ **Posts**: 272<br>📅 **Agendados**: 3<br>📺 **Canais**: 18" | ❌ |
| "quais ferramentas vc tem?" | Lista ferramentas genéricas (busca web, código, etc) | Lista as 5 RPC tools específicas do Liftlio | ❌ |

### Diagnóstico:
- **Agente está respondendo como Claude genérico** em vez de usar as funções específicas do Liftlio
- **Não está detectando intenções** corretamente
- **Fallback muito rápido** para respostas genéricas

---

## 🚨 Problemas Identificados

1. **Detecção de Intenção Falha**
   - Pattern "oi" não está mapeado para `daily_status`
   - Pattern "ferramentas" não está mapeado

2. **Configuração do Sistema**
   - Possível problema com variáveis de ambiente
   - RPC functions podem não estar acessíveis

3. **Formatação Inconsistente**
   - Respostas muito longas
   - Não segue padrão 3-5 linhas

---

## 🧪 Suite de Testes

### Categoria 1: Saudações e Status
```yaml
test_greetings:
  inputs:
    - "oi"
    - "olá"
    - "bom dia"
    - "como estamos?"
    - "tudo bem?"
  expected_intent: "daily_status"
  expected_response_format: |
    📊 **Resumo de hoje:**
    [2-4 métricas principais]
```

### Categoria 2: Listagens
```yaml
test_listings:
  inputs:
    - "liste os canais"
    - "quais canais temos?"
    - "mostrar todos os canais"
    - "canais monitorados"
  expected_intent: "list_channels"
  expected_response_format: |
    📺 **X canais monitorados:**
    • Canal 1 (XXXk subs)
    • Canal 2 (XXXk subs)
    [máximo 10 canais]
```

### Categoria 3: Ferramentas e Capacidades
```yaml
test_capabilities:
  inputs:
    - "quais ferramentas você tem?"
    - "o que você pode fazer?"
    - "suas capacidades"
    - "funcionalidades"
  expected_intent: "show_tools"
  expected_response_format: |
    🛠️ **Minhas ferramentas:**
    • 📊 Estatísticas do projeto
    • 📺 Análise de canais
    • 🎯 Performance metrics
    • 📅 Posts agendados
    • 💬 Análise de engajamento
```

### Categoria 4: Performance e Métricas
```yaml
test_performance:
  inputs:
    - "qual a performance?"
    - "como está o desempenho?"
    - "métricas de hoje"
    - "análise de performance"
  expected_intent: "performance"
  expected_response_format: |
    📈 **Performance (7 dias):**
    • Posts realizados: XX
    • Taxa de resposta: XX%
    • Engajamento médio: X.X%
```

### Categoria 5: Posts e Agendamentos
```yaml
test_posts:
  inputs:
    - "o que foi postado hoje?"
    - "posts de hoje"
    - "postagens recentes"
    - "últimas respostas"
  expected_intent: "today_posts"
  expected_response_format: |
    📝 **Posts de hoje:**
    • [HH:MM] Canal X - "preview do comentário..."
    • [HH:MM] Canal Y - "preview do comentário..."
    [máximo 5 posts]
```

---

## 📝 Prompts Padronizados para Testes

### Teste 1: Inicialização
```javascript
// Primeiro contato - deve mostrar status
prompts: [
  "oi",
  "olá, tudo bem?",
  "bom dia"
]
```

### Teste 2: Consultas Diretas
```javascript
// Perguntas específicas sobre dados
prompts: [
  "quantos posts hoje?",
  "qual canal tem mais inscritos?",
  "posts agendados para amanhã",
  "melhor horário para postar?"
]
```

### Teste 3: Análises Complexas
```javascript
// Requer processamento de múltiplas tabelas
prompts: [
  "compare a performance desta semana com a anterior",
  "qual vídeo teve melhor engajamento?",
  "tendência de crescimento dos canais"
]
```

---

## 📊 Métricas de Qualidade

### 1. Precisão da Detecção
```yaml
metric: intent_accuracy
formula: (correct_intents / total_prompts) * 100
target: > 85%
```

### 2. Concisão
```yaml
metric: response_brevity
formula: average_lines_per_response
target: 3-5 linhas
```

### 3. Tempo de Resposta
```yaml
metric: response_time
formula: time_to_first_byte
target: < 2 segundos
```

### 4. Relevância
```yaml
metric: relevance_score
formula: (relevant_info / total_info) * 100
target: > 90%
```

### 5. Formatação
```yaml
metric: format_compliance
checks:
  - usa_markdown: true
  - tem_emoji: true
  - estrutura_consistente: true
target: 100%
```

---

## 🎯 Plano de Ação

### Fase 1: Diagnóstico (Imediato)
1. **Verificar Edge Function**
   ```bash
   # Testar diretamente a edge function
   curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [ANON_KEY]" \
     -d '{"prompt": "oi", "context": {"currentProject": {"id": "58"}}}'
   ```

2. **Verificar Logs**
   - Checar logs da Edge Function
   - Verificar se está detectando intenções
   - Ver se RPC calls estão funcionando

### Fase 2: Ajustes no Código
1. **Adicionar patterns faltantes**:
   ```javascript
   daily_status: /oi|olá|bom dia|boa tarde|boa noite|tudo bem/i
   show_tools: /ferramentas|capacidades|o que você pode|funcionalidades/i
   ```

2. **Melhorar fallback**:
   - Saudações sempre mostram daily_status
   - Perguntas sobre capacidades mostram tools

### Fase 3: Implementar Testes Automatizados
1. **Criar script de testes**
2. **Executar bateria completa**
3. **Gerar relatório de qualidade**

### Fase 4: Monitoramento Contínuo
1. **Dashboard de métricas**
2. **Alertas para degradação**
3. **Feedback dos usuários**

---

## 🚀 Próximos Passos

1. [ ] Executar diagnóstico completo
2. [ ] Corrigir patterns de detecção
3. [ ] Implementar testes automatizados
4. [ ] Deploy da versão corrigida
5. [ ] Monitorar métricas por 48h

---

**Última atualização**: 28/01/2025
**Versão do agente**: v62 (deploy v70)
**Status**: 🔴 Necessita correções urgentes