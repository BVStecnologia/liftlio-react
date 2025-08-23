# 📚 Guia Completo dos Serviços MCP

## O que é MCP?

MCP (Model Context Protocol) é um protocolo que permite que modelos de linguagem (como Claude) interajam com ferramentas e serviços externos de forma padronizada.

## Arquitetura

```
Claude/LLM → Edge Function → MCP Service → External API
     ↑                              ↓
     └──────── Response ────────────┘
```

## Serviços Disponíveis

### 1. MCP Trello
- **Propósito**: Gerenciar boards, listas e cards do Trello
- **Status**: ✅ Funcionando
- **Capacidades**:
  - Listar boards, listas e cards
  - Criar novos cards
  - Mover cards entre listas
  - Atualizar detalhes dos cards
  - Operações em batch (múltiplas de uma vez)

### 2. MCP Gmail
- **Propósito**: Enviar emails via Gmail API
- **Status**: 🔄 Aguardando configuração OAuth2
- **Capacidades**:
  - Enviar emails simples
  - Usar templates
  - Envio em massa
  - Anexar arquivos

## Edge Functions

### agente-mcp-trello-real (v5)
- **Endpoint**: `/functions/v1/agente-mcp-trello-real`
- **Modelo**: claude-sonnet-4-20250514
- **Funcionalidades**:
  - Detecta menções a Trello/tarefas
  - Busca dados reais via MCP
  - Responde em português

### agente-mcp-trello-batch (v1)
- **Endpoint**: `/functions/v1/agente-mcp-trello-batch`
- **Modelo**: claude-sonnet-4-20250514
- **Funcionalidades**:
  - Operações múltiplas em paralelo
  - Timeout dinâmico (até 6.5 min)
  - Até 25 operações simultâneas

## Como Usar

### 1. Via Claude (Frontend)
```javascript
const response = await supabase.functions.invoke('agente-mcp-trello-real', {
  body: { 
    messages: [
      { role: 'user', content: 'listar tarefas do steve' }
    ]
  }
});
```

### 2. Via API Direta
```bash
curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-mcp-trello-real \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "criar 3 tarefas"}]}'
```

## Melhores Práticas

1. **Use operações em batch** quando precisar fazer múltiplas ações
2. **Seja específico** nas instruções (mencione nomes: Steve, Valdair)
3. **Verifique o status** do MCP antes de operações críticas
4. **Use timeout adequado** para operações complexas

## Troubleshooting

### MCP não responde
```bash
# Verificar container
docker ps | grep mcp-

# Ver logs
docker logs mcp-trello -f

# Reiniciar se necessário
docker restart mcp-trello
```

### Edge Function timeout
- Reduza o número de operações
- Use a versão batch para operações múltiplas
- Verifique o `batch_info` na resposta

### Dados incorretos
- Verifique se o MCP está conectado (`mcp_status` na resposta)
- Confirme o `list_id` correto
- Use `debug_info` para diagnóstico