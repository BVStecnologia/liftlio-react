# Debug Realtime - Projeto 116

## Problema
Usuário mudou status do projeto 116 no Supabase Dashboard, mas a UI não atualizou em tempo real.

## Mudanças Implementadas (16/10/2025)

### 1. Logs Melhorados no ProjectContext.tsx
- ✅ Adicionado log quando evento real-time é CAPTURADO
- ✅ Adicionado log quando status MUDA
- ✅ Adicionado callback no `.subscribe()` para monitorar status da conexão
- ✅ Canal único por usuário: `projeto-changes-${email}`

### 2. Lógica de Atualização Otimizada
**Antes:**
```typescript
setCurrentProject(updatedProject);
setTimeout(() => checkProjectProcessingState(id), 100);
```

**Depois:**
```typescript
// Limpar cache IMEDIATAMENTE
cacheKeys.forEach(key => sessionStorage.removeItem(key));

// Atualizar projeto com spread operator (nova referência)
setCurrentProject({ ...updatedProject });

// Re-verificar SEM debounce
checkProjectProcessingState(updatedProject.id);
```

### 3. Verificação do Supabase Realtime

**IMPORTANTE:** Para o Realtime funcionar, é necessário:

1. **Realtime habilitado no projeto Supabase**
   - Ir em: Settings > API > Realtime
   - Verificar se está ENABLED

2. **Realtime Publications na tabela `Projeto`**
   - Ir em: Database > Replication
   - Verificar se a tabela `Projeto` está publicada
   - Se não estiver, executar:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE "Projeto";
   ```

3. **RLS (Row Level Security) não pode bloquear realtime**
   - Verificar políticas RLS na tabela `Projeto`
   - Usuário precisa ter permissão SELECT na própria linha

## Como Testar

### 1. Abrir DevTools Console
Procurar por logs:
```
[Real-time] 📡 Tentando estabelecer subscription no canal: projeto-changes-...
[Real-time] 🟢 SUBSCRIPTION STATUS: SUBSCRIBED
[Real-time] ✅ REALTIME ATIVO! Escutando mudanças na tabela Projeto
```

### 2. Mudar Status no Supabase Dashboard
```sql
UPDATE "Projeto" SET status = 10 WHERE id = 116;
```

### 3. Verificar Logs no Console
Deve aparecer:
```
[Real-time] 🔴 EVENTO CAPTURADO: {
  eventType: 'UPDATE',
  projectId: 116,
  oldStatus: '6',
  newStatus: '10',
  timestamp: '...'
}
[Real-time] 🔴 PROJETO ATUAL ATUALIZADO: { ... }
[Real-time] 🚨 STATUS MUDOU! Forçando atualização IMEDIATA...
[ProjectContext] Atualizando estado de processamento para projeto 116: false
```

## Possíveis Erros

### Erro 1: CHANNEL_ERROR
```
[Real-time] ❌ ERRO NO CANAL! Realtime NÃO está funcionando
```
**Causa:** Realtime não está habilitado ou tabela não está publicada
**Solução:** Verificar configurações no Dashboard (item 3 acima)

### Erro 2: TIMED_OUT
```
[Real-time] ⏱️ TIMEOUT! Realtime demorou demais para conectar
```
**Causa:** Problema de rede ou firewall
**Solução:** Verificar conexão com internet

### Erro 3: Nenhum log aparece
**Causa:** Subscription não foi criada (user não autenticado)
**Solução:** Fazer login novamente

### Erro 4: Evento capturado mas UI não atualiza
**Causa:** ProcessingWrapper não está reagindo ao `currentProject.status`
**Solução:** Verificar se `currentProject?.status` está nas dependências do useEffect

## Próximos Passos se Não Funcionar

1. Verificar no Supabase Dashboard se Realtime está habilitado
2. Executar SQL para adicionar tabela à publicação
3. Verificar RLS policies
4. Testar com conta do usuário logado (não como admin)
