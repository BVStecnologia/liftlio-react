# 🚨 MODELO CLAUDE PADRÃO - OBRIGATÓRIO

## ⚡ SEMPRE USAR: claude-sonnet-4-20250514

### Regra Absoluta
**TODAS** as Edge Functions que usam Claude devem SEMPRE usar o modelo:
```
claude-sonnet-4-20250514
```

### ❌ NÃO USAR OUTROS MODELOS
- ~~claude-3-haiku-20240307~~ 
- ~~claude-3-opus-20240229~~
- ~~claude-3-sonnet-20240229~~
- ~~claude-3-5-sonnet-20241022~~
- Qualquer outro modelo

### ✅ Exemplo Correto
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514', // SEMPRE este modelo
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages
  })
})
```

### 📝 Checklist para Edge Functions
Ao criar ou modificar Edge Functions com Claude:
1. [ ] Usar modelo `claude-sonnet-4-20250514`
2. [ ] Adicionar comentário `// SEMPRE usar Claude Sonnet 4`
3. [ ] Incluir no response: `model_used: 'claude-sonnet-4-20250514'`
4. [ ] Documentar na própria função qual modelo está usando

### 🎯 Motivo
Claude Sonnet 4 (2025-05-14) é o modelo mais recente e poderoso, oferecendo:
- Melhor compreensão de contexto
- Respostas mais precisas
- Maior velocidade
- Custo-benefício otimizado

### 📌 Aplicação
Esta regra se aplica a:
- Edge Functions do agente Liftlio
- Edge Functions com MCP (Trello, Gmail, etc)
- Qualquer nova Edge Function que use Claude
- Scripts e ferramentas que chamam Claude API

**Data de criação**: 24/01/2025
**Última atualização**: 24/01/2025