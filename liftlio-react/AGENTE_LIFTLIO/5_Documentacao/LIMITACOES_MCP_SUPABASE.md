# 🚨 LIMITAÇÕES DO MCP SUPABASE - LEIA ISSO!

## O MCP Supabase está FUNCIONANDO ✅

**Mas tem limitações específicas que você PRECISA conhecer:**

## ✅ O que o MCP PODE fazer (e usamos sempre):

### 1. Funções SQL
```sql
-- Criar funções
CREATE OR REPLACE FUNCTION minha_funcao()
-- Modificar funções
-- Deletar funções
-- Tudo via mcp__supabase__apply_migration ou execute_sql
```

### 2. Gerenciar Dados
- Executar queries (SELECT, INSERT, UPDATE, DELETE)
- Criar/modificar tabelas
- Criar índices
- Configurar RLS policies

### 3. Administração
- Listar projetos
- Ver logs
- Gerar TypeScript types
- Criar branches
- Monitorar custos

### 4. Buscar Documentação
- `mcp__supabase__search_docs` com GraphQL

## ✅ O MCP TAMBÉM PODE fazer:

### 1. Edge Functions
- **PODE fazer deploy** ✅ (descoberto em 13/01/2025!)
- **PODE criar novas functions** ✅
- **PODE atualizar código existente** ✅
- **PODE listar functions** ✅
- Use: `mcp__supabase__deploy_edge_function`

### 2. Storage
- **NÃO pode fazer upload de arquivos** ❌
- **NÃO pode gerenciar buckets** ❌

### 3. Auth
- **NÃO pode modificar providers** ❌
- **NÃO pode configurar emails** ❌

## 🚀 Como fazer deploy de Edge Functions via MCP:

### Deploy Direto pelo MCP (FUNCIONA!):

```typescript
// Usar a ferramenta mcp__supabase__deploy_edge_function
await mcp__supabase__deploy_edge_function({
  project_id: "suqjifkhmekcdflwowiw",
  name: "nome-da-funcao",
  files: [{
    name: "index.ts",
    content: "// código da função aqui"
  }]
});
```

### Workflow Completo:

1. **Desenvolvimento**:
   - Escrever o código localmente
   - Testar a lógica
   - Salvar em `/AGENTE_LIFTLIO/4_Implementacao/Edge_Functions/producao/`

2. **Deploy via MCP**:
   - Ler o arquivo local
   - Usar `mcp__supabase__deploy_edge_function`
   - Verificar logs com `mcp__supabase__get_logs`

3. **Backup**:
   - Sempre salvar cópia em `/supabase/Funcoes criadas MCP/Edge Functions/`
   - Atualizar INDICE_COMPLETO.md

## 📝 Resumo ATUALIZADO:

- **MCP = Ótimo para SQL e dados** ✅
- **MCP = PODE fazer deploy de Edge Functions** ✅ (CORRIGIDO!)
- **MCP = Ferramenta completa para Supabase** 🚀

## 🎯 Workflow correto ATUALIZADO:

1. **Desenvolver** Edge Function localmente
2. **Testar** lógica (se possível)
3. **Salvar** código na pasta correta
4. **Deploy via MCP** com `mcp__supabase__deploy_edge_function`
5. **Documentar** no INDICE_COMPLETO.md
6. **Verificar logs** com `mcp__supabase__get_logs`

---

**CORREÇÃO IMPORTANTE (13/01/2025)**: O MCP Supabase **PODE SIM** fazer deploy de Edge Functions! A documentação anterior estava incorreta. A ferramenta `mcp__supabase__deploy_edge_function` funciona perfeitamente para criar e atualizar Edge Functions.