# check_project_display_state - Documentação Completa

> **Função SQL que decide qual interface mostrar ao usuário com base no estado do projeto**

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Como Funciona](#como-funciona)
4. [Integração com Frontend](#integração-com-frontend)
5. [Fluxo de Decisão](#fluxo-de-decisão)
6. [Casos de Uso](#casos-de-uso)
7. [Problemas Comuns](#problemas-comuns)
8. [Histórico de Mudanças](#histórico-de-mudanças)

---

## 🎯 Visão Geral

A função `check_project_display_state` é o **cérebro central** que decide qual interface mostrar ao usuário. Ela recebe o email do usuário e o ID do projeto (opcional), e retorna um JSON com todas as informações necessárias para o frontend decidir o que renderizar.

### Por que existe?

Antes, o frontend tinha múltiplas verificações em lugares diferentes:
- ❌ `App.tsx` verificava integrações
- ❌ `ProjectContext` verificava mensagens
- ❌ `ProcessingWrapper` verificava status
- ❌ Cada componente fazia suas próprias queries

**Resultado:** Race conditions, loops infinitos, componentes piscando, projeto mudando sozinho.

### Solução

✅ **Uma única fonte da verdade:** A SQL decide tudo em uma chamada otimizada.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ProcessingWrapperSimplified.tsx                │
│  - Chama check_project_display_state UMA VEZ no mount      │
│  - Reage a mudanças de currentProject?.id                  │
│  - Aplica projeto retornado APENAS se contexto vazio       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Supabase RPC: check_project_display_state           │
│  - Recebe: p_user_email, p_project_id (opcional)           │
│  - Retorna: JSON com display_component e todas flags       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DECISÃO ÚNICA                            │
│  ✓ Verificar se usuário existe                             │
│  ✓ Buscar projeto com projetc_index=true (se ID null)      │
│  ✓ Verificar integrações ativas                            │
│  ✓ Verificar mensagens                                     │
│  ✓ Retornar display_component correto                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Como Funciona

### 1. Assinatura da Função

```sql
CREATE OR REPLACE FUNCTION public.check_project_display_state(
  p_user_email text,
  p_project_id bigint DEFAULT NULL
)
RETURNS json
```

### 2. Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `p_user_email` | text | ✅ Sim | Email do usuário logado |
| `p_project_id` | bigint | ❌ Não | ID do projeto (se null, busca com `projetc_index=true`) |

### 3. Retorno (JSON)

```json
{
  "display_component": "dashboard",
  "user_email": "user@example.com",
  "project_id": 58,
  "has_messages": true,
  "message_count": 242,
  "project_status": 6,
  "progress_percentage": 100,
  "processing_message": "Dashboard available",
  "auto_selected_project": false,
  "checked_at": "2025-10-10T15:00:00Z"
}
```

### 4. Valores de `display_component`

| Valor | Quando Acontece | O que o Frontend Faz |
|-------|----------------|---------------------|
| `login` | Usuário não existe ou não autenticado | Redireciona para `/login` |
| `create_project` | Usuário sem projetos | Mostra `ProjectCreationPage` |
| `need_integration` | Projeto sem integração YouTube | Navega para `/integrations` |
| `setup_processing` | Projeto com integração, sem mensagens, status ≤ 6 | Mostra tela de processamento animada |
| `dashboard` | Projeto com mensagens OU status > 6 | Renderiza `{children}` (Overview, Analytics, etc) |
| `error` | Erro na execução | Mostra tela de erro |

---

## 🔗 Integração com Frontend

### ProcessingWrapperSimplified.tsx

**Localização:** `/liftlio-react/src/components/ProcessingWrapperSimplified.tsx`

#### Código Principal

```typescript
const checkProjectState = useCallback(async (isPolling: boolean = false) => {
  if (!user?.email) {
    setIsLoading(false);
    return;
  }

  try {
    // 1️⃣ CHAMADA À SQL
    const { data, error } = await supabase.rpc('check_project_display_state', {
      p_user_email: user.email,
      p_project_id: currentProject?.id || null  // ⚠️ CRÍTICO: Passa o ID atual
    });

    if (error) {
      console.error('[ProcessingWrapper] Erro no RPC:', error);
      return;
    }

    // 2️⃣ APLICAR PROJETO (APENAS SE CONTEXTO VAZIO)
    if (data?.project_id && !currentProject) {
      // Buscar dados completos do projeto
      const { data: projectData } = await supabase
        .from('Projeto')
        .select('*')
        .eq('id', data.project_id)
        .single();

      if (projectData) {
        await setCurrentProject(projectData);
      }
    }

    // 3️⃣ SALVAR ESTADO
    setDisplayState(data);

    // 4️⃣ POLLING (se necessário)
    if (data?.display_component === 'setup_processing' && !data?.has_messages) {
      // Setup polling a cada 5 segundos
    }

  } catch (err) {
    console.error('[ProcessingWrapper] Erro:', err);
  }
}, [user, currentProject, ...]);

// 5️⃣ EFFECT QUE CHAMA A FUNÇÃO
useEffect(() => {
  checkProjectState();

  return () => {
    // Cleanup polling
  };
}, [user?.email, currentProject?.id, checkProjectState]);
```

#### 🔑 Pontos Críticos

1. **Passar `currentProject?.id`:**
   - ✅ **DEVE** passar o ID atual para a SQL
   - ❌ **NÃO** passar null sempre (causava auto-seleção indesejada)

2. **Aplicar Projeto APENAS se Contexto Vazio:**
   - ✅ `if (data?.project_id && !currentProject)`
   - ❌ **NÃO** aplicar sempre (causava loops infinitos)

3. **Dependencies do useEffect:**
   - ✅ `[user?.email, currentProject?.id, checkProjectState]`
   - ⚠️ Reage a mudanças de projeto

4. **Dependencies do useCallback:**
   - ✅ `[user, currentProject, pollingInterval, ...]`
   - ⚠️ Atualiza quando projeto muda

---

### App.tsx - O que NÃO Fazer

**Localização:** `/liftlio-react/src/App.tsx`

#### ❌ ERRADO (Causa Redirecionamentos Indesejados)

```typescript
// NÃO FAZER ISSO - App.tsx não deve decidir baseado em integrações
if (currentProject && !projectHasIntegrations) {
  return 'integration-setup';  // ❌ Sobrescreve decisão da SQL
}
```

#### ✅ CORRETO

```typescript
// Deixar ProcessingWrapper decidir via SQL
const getLayoutType = () => {
  if (loading || !onboardingReady || isLoading) return 'loading';
  if (!user) return 'login';
  if (!hasProjects) return 'create-project';

  // Caso padrão: dashboard (ProcessingWrapper decide internamente)
  return 'dashboard';
};
```

**Por quê?**
- `App.tsx` não sabe se projeto tem mensagens
- `projectIntegrations` pode estar desatualizado durante reload
- Race condition entre ProjectContext e ProcessingWrapper
- Duplicação de lógica causa inconsistências

---

## 🌊 Fluxo de Decisão

### Diagrama Completo

```
                        ┌──────────────────┐
                        │  Usuário Recarrega│
                        │     a Página     │
                        └────────┬─────────┘
                                 │
                                 ▼
                ┌────────────────────────────────┐
                │ ProcessingWrapper monta        │
                │ currentProject = null          │
                └────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ Chama check_project_display_state      │
        │ - p_user_email: 'user@example.com'     │
        │ - p_project_id: null (primeira carga)  │
        └────────┬───────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────────┐
        │ SQL: Busca projeto com projetc_index=true│
        │ Encontra: Projeto ID 58 (HW)            │
        └────────┬────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────┐
        │ SQL: Verifica integrações                │
        │ ✓ Projeto 58 tem integração YouTube ativa│
        └────────┬─────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────┐
        │ SQL: Verifica mensagens                  │
        │ ✓ Projeto 58 tem 242 mensagens           │
        └────────┬─────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────┐
        │ SQL: Retorna                             │
        │ {                                        │
        │   display_component: "dashboard",        │
        │   project_id: 58,                        │
        │   has_messages: true,                    │
        │   message_count: 242                     │
        │ }                                        │
        └────────┬─────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────┐
        │ ProcessingWrapper:                       │
        │ - Aplica projeto 58 ao contexto          │
        │ - setDisplayState(data)                  │
        │ - Renderiza {children} (dashboard)       │
        └──────────────────────────────────────────┘
```

---

## 💡 Casos de Uso

### Caso 1: Primeira Visita (Novo Usuário)

```
Input:  p_user_email: "newuser@example.com", p_project_id: null
Output: { display_component: "create_project", ... }
Ação:   Mostra ProjectCreationPage
```

### Caso 2: Projeto Sem Integração

```
Input:  p_user_email: "user@example.com", p_project_id: 106
Checks:
  - Projeto existe? ✅
  - Tem integração? ❌
  - Tem mensagens? ❌
Output: { display_component: "need_integration", ... }
Ação:   Navega para /integrations
```

### Caso 3: Projeto em Processamento

```
Input:  p_user_email: "user@example.com", p_project_id: 76
Checks:
  - Projeto existe? ✅
  - Tem integração? ✅
  - Tem mensagens? ❌
  - Status? 3 (processando)
Output: {
  display_component: "setup_processing",
  progress_percentage: 45,
  processing_message: "Processing engagement metrics...",
  ...
}
Ação:   Mostra tela animada de processamento
```

### Caso 4: Projeto Pronto

```
Input:  p_user_email: "user@example.com", p_project_id: 58
Checks:
  - Projeto existe? ✅
  - Tem integração? ✅
  - Tem mensagens? ✅ (242 mensagens)
Output: {
  display_component: "dashboard",
  has_messages: true,
  message_count: 242,
  ...
}
Ação:   Renderiza Overview/Analytics/Mentions
```

### Caso 5: Reload de Página (Projeto Já Selecionado)

```
Antes:  currentProject = { id: 76, name: "Shamo" }
Input:  p_user_email: "user@example.com", p_project_id: 76
Output: { display_component: "dashboard", project_id: 76, ... }
Ação:   Mantém projeto 76, não sobrescreve contexto
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: Projeto Muda Sozinho ao Recarregar

**Sintomas:**
- Usuário seleciona projeto A
- Recarrega página
- Projeto muda para projeto B

**Causa:**
ProcessingWrapper aplicava `auto_selected_project` sempre, sobrescrevendo seleção do usuário.

**Solução:**
```typescript
// ✅ Aplicar projeto APENAS se contexto vazio
if (data?.project_id && !currentProject) {
  await setCurrentProject(projectData);
}
```

---

### Problema 2: Loop Infinito de Renderizações

**Sintomas:**
- Componentes renderizam infinitamente
- Console cheio de logs
- App trava

**Causa:**
ProcessingWrapper aplicava projeto → dispara useEffect → chama SQL → aplica projeto → loop

**Solução:**
```typescript
// ✅ Adicionar currentProject às dependencies e passar ID para SQL
const { data } = await supabase.rpc('check_project_display_state', {
  p_user_email: user.email,
  p_project_id: currentProject?.id || null  // ⚠️ CRÍTICO
});

useEffect(() => {
  checkProjectState();
}, [user?.email, currentProject?.id, checkProjectState]);
```

---

### Problema 3: Projeto com Mensagens Vai para Integrations

**Sintomas:**
- Projeto tem 242 mensagens
- SQL retorna `display_component: "dashboard"`
- Frontend mostra página de Integrations

**Causa:**
`App.tsx` tinha lógica de verificação de integrações que sobrescrevia a decisão da SQL.

**Solução:**
```typescript
// ❌ REMOVER de App.tsx
if (currentProject && !projectHasIntegrations) {
  return 'integration-setup';
}

// ✅ Deixar ProcessingWrapper decidir
return 'dashboard';  // ProcessingWrapper decide via SQL
```

---

### Problema 4: Loading Aparece e Desaparece Múltiplas Vezes

**Sintomas:**
- Tela pisca
- Loading mostra → esconde → mostra → esconde

**Causa:**
Múltiplos componentes chamando `showGlobalLoader()` e `hideGlobalLoader()` ao mesmo tempo.

**Solução:**
```typescript
// ✅ ProcessingWrapper mostra loading APENAS na primeira carga
if (isInitialLoad && !isPolling) {
  showGlobalLoader('Loading Dashboard', 'Please wait...');
}

// ✅ Header mostra loading APENAS ao trocar projeto
const handleProjectSelect = async () => {
  showGlobalLoader('Switching Project', 'Please wait...');
  await setCurrentProject(project);
  hideGlobalLoader();
};
```

---

## 📚 Histórico de Mudanças

### v3.0 - 10/10/2025 (VERSÃO ATUAL)
**Mudanças:**
- ✅ ProcessingWrapper passa `currentProject?.id` para SQL
- ✅ Aplicação de projeto APENAS quando contexto vazio
- ✅ Removida lógica de integrações de `App.tsx`
- ✅ Dependencies corretas no useEffect e useCallback

**Bugs Corrigidos:**
- ✅ Projeto não muda mais sozinho ao recarregar
- ✅ Sem loops infinitos
- ✅ Projeto com mensagens vai corretamente para dashboard
- ✅ Loading aparece apenas uma vez

---

### v2.0 - 09/10/2025
**Mudanças:**
- Removida lógica complexa de multiple queries
- Criada função SQL única para decisão
- ProcessingWrapper como orquestrador central

**Problemas:**
- ❌ Projeto mudava automaticamente (auto_selected_project sempre aplicado)
- ❌ Loops infinitos (sem passar currentProject?.id)
- ❌ App.tsx sobrescrevia decisão da SQL

---

### v1.0 - Antes de 09/10/2025
**Arquitetura Antiga:**
- Múltiplas verificações em componentes diferentes
- Race conditions
- Inconsistências de estado
- Performance ruim

---

## 🎯 Regras de Ouro

1. **Uma Única Fonte da Verdade:**
   - SQL decide tudo
   - Frontend apenas obedece

2. **Não Duplicar Lógica:**
   - Se SQL já verifica, não verificar no frontend
   - Evitar race conditions

3. **Passar Contexto para SQL:**
   - Sempre passar `currentProject?.id`
   - SQL precisa saber o estado atual

4. **Aplicar Projeto Apenas na Primeira Carga:**
   - `if (!currentProject)` antes de aplicar
   - Evita sobrescrever seleção do usuário

5. **Dependencies Corretas:**
   - useEffect: `[user?.email, currentProject?.id, checkProjectState]`
   - useCallback: `[user, currentProject, ...]`

6. **Loading Controlado:**
   - ProcessingWrapper: primeira carga
   - Header: troca de projeto
   - Nunca os dois ao mesmo tempo

---

## 📝 Checklist de Manutenção

Ao modificar o sistema, verificar:

- [ ] SQL retorna `display_component` correto para todos cenários?
- [ ] ProcessingWrapper passa `currentProject?.id`?
- [ ] Aplicação de projeto tem verificação `!currentProject`?
- [ ] Dependencies do useEffect estão corretas?
- [ ] App.tsx não sobrescreve decisão da SQL?
- [ ] Loading aparece apenas uma vez?
- [ ] Projeto não muda sozinho ao recarregar?
- [ ] Testes em navegador confirmam comportamento?

---

## 🔧 Como Debugar

### 1. Ativar Logs no Console

```typescript
// ProcessingWrapper
console.log('[ProcessingWrapper] Chamando SQL:', {
  userEmail: user.email,
  currentProjectId: currentProject?.id
});

console.log('[ProcessingWrapper] Estado retornado:', data);
```

### 2. Verificar Valor no Banco

```sql
-- Rodar no Supabase SQL Editor
SELECT * FROM check_project_display_state(
  'user@example.com',  -- email do usuário
  58                    -- ID do projeto (ou null)
);
```

### 3. Verificar Flag no Banco

```sql
SELECT id, "Project name", projetc_index
FROM "Projeto"
WHERE "user" = 'user@example.com';
```

### 4. Verificar Mensagens

```sql
SELECT COUNT(*) as count
FROM "Mensagens"
WHERE project_id = 58;
```

### 5. Verificar Integrações

```sql
SELECT *
FROM "Integrações"
WHERE "PROJETO id" = 58;
```

---

## 📞 Contato

**Desenvolvido por:** Claude Code
**Data:** 10/10/2025
**Versão:** 3.0

**Em caso de dúvidas, verificar:**
1. Esta documentação
2. Commits relacionados: `git log --grep="ProcessingWrapper"`
3. Screenshots de teste em `.playwright-mcp/`

---

**🎉 Sistema Funcionando Perfeitamente! 🎉**
