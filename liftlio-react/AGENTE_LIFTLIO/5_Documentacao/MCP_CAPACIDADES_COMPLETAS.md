# 🚀 MCP SUPABASE - CAPACIDADES COMPLETAS

## ✅ TUDO QUE O MCP PODE FAZER

### 1. 📊 Gerenciamento de Projetos
- `mcp__supabase__list_projects` - Lista todos os projetos
- `mcp__supabase__get_project` - Detalhes de um projeto específico
- `mcp__supabase__create_project` - Criar novo projeto
- `mcp__supabase__pause_project` - Pausar projeto
- `mcp__supabase__restore_project` - Restaurar projeto pausado

### 2. 🏢 Organizações
- `mcp__supabase__list_organizations` - Lista organizações do usuário
- `mcp__supabase__get_organization` - Detalhes da organização (inclui plano)

### 3. 💰 Custos e Billing
- `mcp__supabase__get_cost` - Verifica custo de criar projeto/branch
- `mcp__supabase__confirm_cost` - Confirma entendimento do custo

### 4. 🌿 Branches (Desenvolvimento)
- `mcp__supabase__create_branch` - Criar branch de desenvolvimento
- `mcp__supabase__list_branches` - Listar todas as branches
- `mcp__supabase__delete_branch` - Deletar branch
- `mcp__supabase__merge_branch` - Merge de branch para produção
- `mcp__supabase__reset_branch` - Reset de branch
- `mcp__supabase__rebase_branch` - Rebase branch com produção

### 5. 🗄️ Banco de Dados
- `mcp__supabase__list_tables` - Lista todas as tabelas
- `mcp__supabase__list_extensions` - Lista extensões Postgres
- `mcp__supabase__list_migrations` - Lista migrações aplicadas
- `mcp__supabase__apply_migration` - Aplica DDL (CREATE, ALTER, DROP)
- `mcp__supabase__execute_sql` - Executa SQL (SELECT, INSERT, UPDATE, DELETE)

### 6. ⚡ Edge Functions
- `mcp__supabase__list_edge_functions` - Lista todas as Edge Functions
- `mcp__supabase__deploy_edge_function` - **DEPLOY DE EDGE FUNCTIONS** ✅
  ```typescript
  // Exemplo de uso:
  mcp__supabase__deploy_edge_function({
    project_id: "suqjifkhmekcdflwowiw",
    name: "minha-funcao",
    files: [{
      name: "index.ts",
      content: "// código da função"
    }],
    entrypoint_path: "index.ts", // opcional
    import_map_path: null // opcional
  })
  ```

### 7. 📊 Monitoramento e Debug
- `mcp__supabase__get_logs` - Busca logs por serviço:
  - `api` - Logs da API REST
  - `postgres` - Logs do banco
  - `edge-function` - Logs das Edge Functions
  - `auth` - Logs de autenticação
  - `storage` - Logs de storage
  - `realtime` - Logs realtime
  - `branch-action` - Logs de ações em branches
- `mcp__supabase__get_advisors` - Avisos de segurança e performance

### 8. 🔧 Desenvolvimento
- `mcp__supabase__get_project_url` - URL da API do projeto
- `mcp__supabase__get_anon_key` - Chave anônima do projeto
- `mcp__supabase__generate_typescript_types` - Gera tipos TypeScript do banco

### 9. 📚 Documentação
- `mcp__supabase__search_docs` - Busca na documentação com GraphQL
  ```graphql
  # Exemplo:
  {
    searchDocs(query: "edge functions deploy", limit: 5) {
      nodes {
        title
        href
        content
      }
    }
  }
  ```

### 10. 🔧 IDE Integration
- `mcp__ide__getDiagnostics` - Obter diagnósticos do VS Code
- `mcp__ide__executeCode` - Executar código Python no Jupyter

## ❌ O QUE O MCP NÃO PODE FAZER

### 1. 📦 Storage
- Upload de arquivos
- Criar/gerenciar buckets
- Configurar políticas de storage
- Download de arquivos

### 2. 🔐 Auth
- Modificar providers OAuth
- Configurar templates de email
- Gerenciar usuários diretamente
- Alterar configurações de SMS

### 3. 🌐 Realtime
- Configurar canais realtime
- Gerenciar presence
- Alterar broadcast settings

## 📋 WORKFLOW COMPLETO COM MCP

### Para SQL/Banco de Dados:
```sql
-- 1. Criar migração
mcp__supabase__apply_migration({
  project_id: "id",
  name: "create_users_table",
  query: "CREATE TABLE users (id uuid primary key);"
})

-- 2. Executar queries
mcp__supabase__execute_sql({
  project_id: "id",
  query: "SELECT * FROM users;"
})
```

### Para Edge Functions:
```typescript
// 1. Desenvolver localmente
// 2. Deploy via MCP
mcp__supabase__deploy_edge_function({
  project_id: "id",
  name: "my-function",
  files: [{
    name: "index.ts",
    content: "código aqui"
  }]
})

// 3. Verificar logs
mcp__supabase__get_logs({
  project_id: "id",
  service: "edge-function"
})
```

## 🎯 MELHORES PRÁTICAS

1. **Sempre verificar custos** antes de criar projetos/branches
2. **Usar migrations** para mudanças de schema (DDL)
3. **Usar execute_sql** para queries de dados (DML)
4. **Deploy Edge Functions** diretamente via MCP
5. **Monitorar logs** após deploys
6. **Checar advisors** regularmente para segurança

## 📝 NOTAS IMPORTANTES

- MCP usa Personal Access Token para autenticação
- Todos os comandos são executados com permissões do token
- Edge Functions deployadas via MCP vão direto para produção
- Branches são úteis para testar mudanças antes do merge

---

**ATUALIZADO EM**: 13/01/2025 - Confirmado que MCP PODE fazer deploy de Edge Functions!