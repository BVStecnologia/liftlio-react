# Deploy do Agente Liftlio v61 - Guia Completo

## 🎯 Resumo das Melhorias

### Problemas Resolvidos:
1. ❌ **Respostas muito longas** → ✅ Máximo 3-5 linhas
2. ❌ **Dados desnecessários** → ✅ Apenas informação relevante
3. ❌ **Formatação inconsistente** → ✅ Markdown padronizado
4. ❌ **Sem contexto** → ✅ Sistema inteligente de intenções
5. ❌ **Performance ruim** → ✅ Tools específicas otimizadas

### Nova Arquitetura:
- **Sistema de Tools**: Funções SQL específicas para cada necessidade
- **Detecção de Intenções**: Identifica o que o usuário realmente quer
- **Respostas Concisas**: Formatação inteligente e direta
- **Modelo Claude Sonnet 4**: Mais recente e eficiente

## 📋 Passo a Passo do Deploy

### 1. Criar Tabelas e Funções no Supabase

```sql
-- Executar via MCP Supabase
-- Arquivo: agent_tools_system.sql
mcp__supabase__apply_migration({
  project_id: "suqjifkhmekcdflwowiw",
  name: "create_agent_tools_system",
  query: "-- conteúdo do arquivo agent_tools_system.sql"
});

-- Arquivo: agent_tool_functions.sql
mcp__supabase__apply_migration({
  project_id: "suqjifkhmekcdflwowiw",
  name: "create_agent_tool_functions",
  query: "-- conteúdo do arquivo agent_tool_functions.sql"
});
```

### 2. Deploy da Edge Function v61

```typescript
// Via MCP Supabase
mcp__supabase__deploy_edge_function({
  project_id: "suqjifkhmekcdflwowiw",
  name: "agente-liftlio",
  files: [{
    name: "index.ts",
    content: "-- conteúdo do arquivo agente-liftlio-v61.ts"
  }]
});
```

### 3. Testar Funções SQL

Execute no Supabase Dashboard para validar:

```sql
-- Test 1: Daily Briefing
SELECT * FROM get_daily_briefing(58);

-- Test 2: Channels List
SELECT * FROM get_all_channels_stats(58, 10);

-- Test 3: Today Posts
SELECT * FROM get_posts_by_date(58, CURRENT_DATE);

-- Test 4: Performance Analysis
SELECT * FROM analyze_channel_performance(58, 7);

-- Test 5: Engagement Metrics
SELECT * FROM get_engagement_metrics(58);
```

### 4. Testar o Agente Completo

#### Teste Manual via cURL:

```bash
# Teste 1: Como estamos hoje?
curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "prompt": "como estamos hoje?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    }
  }'

# Resposta esperada (concisa):
# 📊 **Resumo de hoje:**
# ↑ **Posts hoje**: 5
# 📅 **Agendados**: 3
# 📺 **Canais ativos**: 18
# 🔥 **Engajamento médio**: 7.5%
```

#### Teste via Interface:

1. Abrir o chat do agente no frontend
2. Perguntar: "como estamos hoje?"
3. Verificar se a resposta é concisa (3-5 linhas)
4. Testar outras perguntas da lista

### 5. Monitorar Logs

```typescript
// Verificar logs de execução
mcp__supabase__get_logs({
  project_id: "suqjifkhmekcdflwowiw",
  service: "edge-function"
});

// Verificar uso das tools
SELECT * FROM agent_tool_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

## 🧪 Casos de Teste Essenciais

| Pergunta | Resposta Esperada | Linhas |
|----------|-------------------|--------|
| "como estamos hoje?" | Resumo com 4 métricas principais | 5 |
| "liste todos os canais" | Lista top 10 canais com stats | 12 |
| "o que foi postado hoje?" | Posts do dia organizados | 5-10 |
| "qual a performance?" | 3 métricas chave com insights | 4 |
| "oi" | Saudação breve | 1-2 |

## ⚠️ Troubleshooting

### Problema: Respostas ainda muito longas
- Verificar se está usando v61 (não v60)
- Confirmar max_tokens: 500 no código
- Verificar system prompt

### Problema: Tools não funcionam
- Verificar se tabelas foram criadas
- Testar funções SQL individualmente
- Verificar logs de erro

### Problema: Intent não detectado
- Adicionar padrão no IntentDetector
- Verificar idioma detectado
- Logs do console

## 📊 Métricas de Sucesso

- [ ] Respostas com média de 3-5 linhas
- [ ] Tempo de resposta < 2 segundos
- [ ] Taxa de acerto de intenção > 80%
- [ ] Usuários satisfeitos com concisão

## 🚀 Próximos Passos

1. Monitorar feedback dos usuários
2. Ajustar patterns de detecção
3. Adicionar novas tools conforme necessidade
4. Otimizar queries SQL se necessário

---

**Versão**: v61  
**Data**: 25/01/2025  
**Status**: Pronto para deploy