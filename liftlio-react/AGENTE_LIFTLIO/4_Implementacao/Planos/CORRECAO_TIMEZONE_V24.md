# Correção de Timezone - v24

## Data: 14/01/2025

### Problema Identificado:
- Datas das mensagens agendadas mostram em UTC
- Usuário no Brasil espera ver horário de Brasília (GMT-3)
- Exemplo: "2025-07-14 19:25:00" UTC aparece como "14/07/2025 22:25" em Brasília

### Solução Implementada na v24:

1. **Nova função formatDateTimeBrazil()**:
```typescript
function formatDateTimeBrazil(dateString: string, language: 'pt' | 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  if (language === 'pt') {
    return date.toLocaleString('pt-BR', options);
  } else {
    return date.toLocaleString('en-US', options);
  }
}
```

2. **Atualização em formatRAGContext()**:
- Usa formatDateTimeBrazil() para datas agendadas
- Adiciona "(Horário de Brasília)" na exibição

3. **Atualização no System Prompt**:
- Instrução para sempre indicar que é horário de Brasília
- Formatação amigável de datas

### Arquivos Criados:
- agente-liftlio_v24_timezone_fix.ts
- Backup em MCP_Functions/Edge_Functions/

### Status:
- Código pronto para deploy
- Aguardando deploy via MCP