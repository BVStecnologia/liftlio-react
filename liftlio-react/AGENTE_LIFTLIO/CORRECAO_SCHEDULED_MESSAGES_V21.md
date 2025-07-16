# Correção de Mensagens Agendadas - V21

## Problema Identificado
O agente estava reportando "0 mensagens agendadas" quando a interface claramente mostrava mensagens na aba "Scheduled".

## Análise do Problema

### Query da V20 (Incorreta)
```typescript
// Buscava direto na tabela Mensagens
const { count: scheduledCount } = await supabase
  .from('Mensagens')
  .select('*', { count: 'exact', head: true })
  .eq('ProjetoID', projectId)
  .not('DataPostagem', 'is', null)
  .is('Postado', false);
```

### Como a UI Determina Mensagens Agendadas
A interface usa a view `mentions_overview` com a condição:
```typescript
.eq('status_das_postagens', 'pending')
```

## Solução Implementada na V21

### 1. Buscar o Scanner ID Correspondente
```typescript
const { data: scannerData } = await supabase
  .from('Scanner de videos do youtube')
  .select('id')
  .eq('Projeto_id', projectId)
  .single();
```

### 2. Usar mentions_overview Como a UI
```typescript
const { count } = await supabase
  .from('mentions_overview')
  .select('*', { count: 'exact', head: true })
  .eq('scanner_project_id', scannerData.id)
  .eq('status_das_postagens', 'pending');
```

## Comparação de Resultados

- **Query V20**: Retornava 0 mensagens agendadas
- **Query UI**: Mostrava corretamente as mensagens pendentes
- **Query V21**: Agora usa a mesma lógica da UI

## Mudanças Principais

1. **getProjectStats**: Modificado para usar mentions_overview
2. **getRecentScheduledMessages**: Também usa mentions_overview agora
3. **Mapeamento de IDs**: ProjetoID → Scanner ID → mentions_overview

## Como Testar

1. Deploy da v21:
```bash
supabase functions deploy agente-liftlio --no-verify-jwt
```

2. Atualizar o frontend para usar v21:
```typescript
// Em FloatingAgent.tsx
const { data, error } = await supabase.functions.invoke('agente-liftlio', {
  body: { 
    prompt: message,
    projectId: currentProject.id,
    userId: user?.id,
    currentPage: location.pathname,
    conversationHistory
  }
});
```

3. Perguntar ao agente sobre mensagens agendadas

## Resultado Esperado
O agente agora deve reportar o mesmo número de mensagens agendadas que aparece na interface.