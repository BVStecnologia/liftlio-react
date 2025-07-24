# Edge Function com Operações em Batch e Timeout Dinâmico

## Capacidades da v6

### 1. **Operações Múltiplas em Paralelo**
A Edge Function pode executar várias operações MCP simultaneamente:
- Buscar listas
- Buscar cards
- Criar múltiplos cards
- Mover cards
- Atualizar cards

### 2. **Timeout Dinâmico**
```typescript
const calculateTimeout = (operations: string[]): number => {
  const baseTimeout = 30000 // 30 segundos base
  const perOperationTimeout = 15000 // 15 segundos por operação
  const maxTimeout = 390000 // 6.5 minutos (limite Edge Function: 6.6min)
  
  const calculatedTimeout = baseTimeout + (operations.length * perOperationTimeout)
  return Math.min(calculatedTimeout, maxTimeout)
}
```

### 3. **Exemplos de Comandos Complexos**

#### Criar múltiplas tarefas:
```json
{
  "messages": [{
    "role": "user",
    "content": "criar 5 tarefas para o valdair sobre implementação do sistema de notificações"
  }]
}
```

#### Operações combinadas:
```json
{
  "messages": [{
    "role": "user",
    "content": "listar todas as tarefas do steve, criar 3 novas tarefas de testes, e mover as completadas para done"
  }]
}
```

### 4. **Limites e Performance**

| Operação | Tempo Estimado | Limite |
|----------|----------------|---------|
| Buscar listas | 1-2s | 1x por request |
| Buscar cards | 2-3s | 10 listas |
| Criar card | 1-2s | 10 cards |
| Mover card | 1-2s | 20 cards |
| **Total máximo** | 6.5 min | ~25 operações |

### 5. **Resposta com Batch Info**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Criei 5 tarefas para o Valdair..."
    }
  }],
  "batch_info": {
    "total_operations": 6,
    "successful": 6,
    "failed": 0,
    "timeout_ms": 120000,
    "cards_created": 5,
    "cards_moved": 0
  }
}
```

### 6. **Vantagens do Batch**
1. **Performance**: Operações em paralelo são até 5x mais rápidas
2. **Atomicidade**: Todas as operações são reportadas juntas
3. **Timeout inteligente**: Ajusta baseado na complexidade
4. **Limite de segurança**: Máximo 10 cards por criação para evitar spam

### 7. **Casos de Uso Ideais**
- Planejamento de sprint (criar múltiplas tarefas)
- Organização em massa (mover cards entre listas)
- Relatórios complexos (buscar de várias listas)
- Automação de workflow (criar, atribuir e organizar)

### 8. **Como o MCP Processa**
```
User Request → Edge Function → Parse Operations → Calculate Timeout
                                       ↓
                              Execute in Parallel:
                              - MCP Operation 1
                              - MCP Operation 2
                              - MCP Operation N
                                       ↓
                              Aggregate Results → Claude → Response
```

### 9. **Exemplo de Comando Ultra-Complexo**
"Busque todas as tarefas do Steve e Valdair, crie 3 novas tarefas de revisão de código para cada um, mova as tarefas antigas completadas para done, e me dê um resumo do que foi feito"

Isso resultaria em:
- 2 operações de busca (Steve + Valdair lists)
- 6 operações de criação (3 para cada)
- N operações de movimentação (baseado em quantas estão completas)
- Total: ~8-15 operações em paralelo
- Timeout: ~165 segundos (2.75 minutos)

### 10. **Monitoramento e Debug**
O `batch_info` no response sempre mostra:
- Quantas operações foram executadas
- Taxa de sucesso/falha
- Tempo alocado
- Tipo de operações realizadas

Isso permite debug fácil e otimização de comandos futuros.