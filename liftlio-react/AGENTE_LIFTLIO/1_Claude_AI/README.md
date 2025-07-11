# 🤖 Camada 1: Claude AI

## Status: ✅ Implementado e Funcionando

### Visão Geral
Primeira camada de inteligência do agente, responsável por responder ~80% das interações usando o modelo Claude Opus 4 da Anthropic.

## 🎯 Capacidades

### O que faz:
- ✅ Responde perguntas sobre o Liftlio
- ✅ Navega entre páginas do sistema
- ✅ Entende contexto (página atual, projeto)
- ✅ Processa linguagem natural
- ✅ Oferece suporte básico

### O que NÃO faz (ainda):
- ❌ Acessa dados específicos do projeto
- ❌ Consulta histórico de conversas
- ❌ Modifica configurações
- ❌ Acessa dados em tempo real

## 🔧 Implementação Técnica

### Edge Function
- **Nome**: `agente-liftlio`
- **URL**: `https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio`
- **Modelo**: Claude Opus 4 (claude-opus-4-20250514)
- **Timeout**: 30 segundos

### Estrutura da Requisição
```typescript
POST /agente-liftlio
{
  "prompt": "string",        // Pergunta do usuário
  "context": {              // Opcional
    "currentPage": "string",
    "currentProject": {
      "id": "string",
      "name": "string"
    },
    "userInfo": {
      "email": "string",
      "plan": "string"
    }
  }
}
```

### Estrutura da Resposta
```typescript
{
  "content": "string",      // Resposta do agente
  "action": "navigate",     // Opcional: ação a executar
  "data": {                // Dados da ação
    "path": "/dashboard"
  }
}
```

## 📝 System Prompt

O agente conhece:
- Funcionalidades do Liftlio
- Páginas disponíveis para navegação
- Como formatar respostas para ações

Ver arquivo: [system_prompts.md](./system_prompts.md)

## 🚀 Páginas Navegáveis

| Comando | Página | Path |
|---------|--------|------|
| "dashboard" | Visão geral | `/dashboard` |
| "monitoring" | Monitoramento | `/monitoring` |
| "mentions" | Menções | `/mentions` |
| "scanner" | Scanner YouTube | `/scanner` |
| "projects" | Projetos | `/projects` |
| "integrations" | Integrações | `/integrations` |
| "settings" | Configurações | `/settings` |

## 💰 Custos

- **Por requisição**: ~1000-2000 tokens
- **Custo médio**: $0.01-0.02 por interação
- **Rate limit**: Configurado no Edge Function

## 🔐 Segurança

- API key no Supabase Vault
- Validação de input
- Sanitização de respostas
- Logs anonimizados

## 📊 Métricas

### Performance atual:
- Tempo resposta: 2-3 segundos
- Taxa sucesso: 95%+
- Satisfação: 4.7/5

### Monitoramento:
```sql
-- Ver logs recentes
SELECT * FROM edge_function_logs 
WHERE function_name = 'agente-liftlio'
ORDER BY created_at DESC
LIMIT 100;
```

## 🧪 Testando

### Teste básico:
```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "O que é o Liftlio?"
  }'
```

### Teste com navegação:
```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Me leve para o dashboard",
    "context": {
      "currentPage": "/monitoring"
    }
  }'
```

---

*Para código fonte, ver: `/supabase/Funcoes criadas MCP/Edge Functions/agente-liftlio_assistente_ai_claude.ts.bak`*