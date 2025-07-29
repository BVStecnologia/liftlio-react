# 🗺️ Mapa de Comportamento - Agente Liftlio v62

## 🔴 Problema Principal Identificado

O agente está **respondendo como Claude genérico** em vez de usar as funções específicas do Liftlio.

### Evidências:
1. **"oi"** → Responde com introdução genérica em vez de mostrar status do dia
2. **"quais ferramentas você tem?"** → Lista ferramentas do Claude (busca web, código) em vez das 5 RPC tools

---

## 📊 Mapeamento de Intenções vs Respostas

### 1. SAUDAÇÕES
```yaml
Prompts testados:
  - "oi"
  - "olá"
  - "bom dia"

Comportamento ATUAL:
  - Resposta: "Olá! 👋 Sou o assistente do Liftlio..."
  - Intent detectado: NENHUM (fallback para Claude)
  - Linhas: 1-2

Comportamento ESPERADO:
  - Intent: daily_status
  - Resposta: Dashboard com métricas do dia
  - Linhas: 4-5
  - Formato:
    📊 **Resumo de hoje:**
    ↑ **Posts**: 272
    📅 **Agendados**: 3
    📺 **Canais**: 18
```

### 2. FERRAMENTAS/CAPACIDADES
```yaml
Prompts testados:
  - "quais ferramentas você tem?"
  - "o que você pode fazer?"

Comportamento ATUAL:
  - Lista ferramentas genéricas do Claude
  - Menciona busca web, Python, análise de arquivos
  - Não menciona as RPC tools específicas

Comportamento ESPERADO:
  - Listar as 5 ferramentas RPC:
    1. project_stats
    2. channel_performance_analysis
    3. video_engagement_metrics
    4. optimal_posting_schedule
    5. list_all_channels
```

---

## 🧩 Patterns de Detecção (Código v62)

### Patterns Configurados:
```javascript
const INTENT_PATTERNS = {
  daily_status: /como estamos|status hoje|resumo do dia|como está|briefing/i,
  list_channels: /listar canais|todos os canais|quais canais|mostrar canais/i,
  project_status: /status do projeto|informações do projeto/i,
  performance: /performance|desempenho|análise|métricas/i,
  engagement: /engajamento|curtidas|comentários|visualizações/i,
  today_posts: /posts de hoje|postagens hoje|o que foi postado/i,
  scheduled_posts: /posts agendados|agendamentos|próximos posts/i
};
```

### 🚨 FALHAS IDENTIFICADAS:
1. **"oi", "olá", "bom dia"** → NÃO estão no pattern `daily_status`
2. **"ferramentas", "capacidades"** → NÃO existe pattern para isso
3. **Fallback muito rápido** → Confidence threshold muito alto (0.6)

---

## 🔧 Correções Necessárias

### 1. Adicionar Patterns Faltantes:
```javascript
// Atualizar daily_status para incluir saudações
daily_status: /oi|olá|bom dia|boa tarde|boa noite|tudo bem|como estamos|status hoje|resumo do dia|como está|briefing/i,

// Adicionar novo pattern para ferramentas
show_tools: /ferramentas|ferramenta|capacidades|o que você pode|o que vc pode|funcionalidades|suas funções/i,
```

### 2. Criar Handler para show_tools:
```javascript
case 'show_tools':
  return `🛠️ **Minhas ferramentas RPC:**
• 📊 **project_stats** - Estatísticas completas
• 📺 **channel_performance** - Análise de canais  
• 🎯 **video_engagement** - Métricas de vídeos
• ⏰ **optimal_posting** - Melhores horários
• 📋 **list_channels** - Todos os canais`;
```

### 3. Ajustar Lógica de Saudação:
```javascript
// Se detectar saudação simples, sempre mostrar daily_status
if (prompt.length < 15 && /oi|olá|bom dia|boa tarde|boa noite/i.test(prompt)) {
  return { intent: 'daily_status', confidence: 0.95 };
}
```

---

## 📈 Fluxo de Decisão Atual vs Ideal

### ATUAL (Problemático):
```
"oi" → Não detecta intent → Confidence < 0.6 → Claude genérico
```

### IDEAL (Corrigido):
```
"oi" → Detecta daily_status → Confidence 0.95 → RPC get_daily_briefing() → Formato dashboard
```

---

## 🎯 Regras de Negócio Propostas

### Regra 1: Saudações = Status
- Qualquer saudação curta mostra o dashboard do dia
- Prioridade máxima para manter usuário informado

### Regra 2: Dúvidas sobre capacidades
- Sempre listar as 5 RPC tools específicas
- Nunca mencionar ferramentas genéricas do Claude

### Regra 3: Respostas concisas
- Máximo 5 linhas
- Sempre usar markdown e emojis
- Formato consistente por tipo

### Regra 4: Fallback inteligente
- Só usar Claude para perguntas complexas
- Tentar mapear para RPC sempre que possível

---

## 📋 Checklist de Validação

- [ ] Saudações mostram dashboard
- [ ] Ferramentas listam RPCs específicas  
- [ ] Respostas têm máximo 5 linhas
- [ ] Formato markdown com emojis
- [ ] Tempo de resposta < 2s
- [ ] Confidence scores ajustados
- [ ] Patterns cobrem casos comuns

---

**Status**: 🔴 Necessita correções urgentes no código da Edge Function