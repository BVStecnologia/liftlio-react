# MCP (Model Context Protocol) - Guia Completo

## 🤖 REGRA AUTOMÁTICA: Delegação de Agentes MCP
**⚠️ OBRIGATÓRIO - SEMPRE que for usar ferramentas MCP do Supabase:**
```
ANTES de qualquer chamada mcp__supabase__*,
SEMPRE delegar para o agente supabase-mcp-expert usando Task tool.
```

**Exemplo:**
```typescript
// ❌ ERRADO - Nunca chamar diretamente
await mcp__supabase__execute_sql({ query: "..." })

// ✅ CORRETO - Sempre delegar para o agente
await Task({
  subagent_type: "supabase-mcp-expert",
  prompt: "Execute esta query SQL: SELECT * FROM users",
  description: "Query SQL via agente"
})
```

## Supabase MCP - Capacidades
**✅ PODE fazer via MCP:**
- Deploy de Edge Functions: `mcp__supabase__deploy_edge_function`
- Criar/modificar funções SQL: `mcp__supabase__apply_migration`
- Executar queries: `mcp__supabase__execute_sql`
- Buscar logs: `mcp__supabase__get_logs`
- Gerar tipos TypeScript: `mcp__supabase__generate_typescript_types`

**❌ NÃO pode via MCP:**
- Criar/alterar tabelas (use Dashboard)
- Modificar RLS policies (use Dashboard)
- Acessar Vault/Secrets diretamente (use Dashboard)

**Exemplo de uso:**
```typescript
// Deploy Edge Function
await mcp__supabase__deploy_edge_function({
  project_id: "suqjifkhmekcdflwowiw",
  name: "minha-funcao",
  files: [{
    name: "index.ts",
    content: "// código"
  }]
});
```

## 🔴 REGRAS CRÍTICAS: Organização de Funções MCP

**⚠️ OBRIGATÓRIO ao criar/modificar funções no Supabase:**

1. **SEMPRE usar DROP FUNCTION IF EXISTS antes de CREATE**
   ```sql
   DROP FUNCTION IF EXISTS nome_funcao(parametros);
   CREATE OR REPLACE FUNCTION nome_funcao(...)
   ```

2. **SEMPRE salvar cópia local IMEDIATAMENTE após criar/editar:**
   - SQL Functions: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/nome_funcao.sql`
   - Edge Functions: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions/nome-funcao.ts`

3. **NUNCA deixar funções duplicadas ou antigas no banco:**
   - Remover versões antigas (ex: função sem parâmetro email quando criar com email)
   - Manter apenas uma versão de cada função
   - Usar nomes descritivos (ex: `check_user_youtube_integrations_by_email`)

4. **SEMPRE sincronizar Supabase ↔ Local:**
   - Após criar no Supabase → salvar localmente
   - Após editar no Supabase → atualizar arquivo local
   - Deletar funções não usadas do Supabase E dos arquivos locais

5. **Padrão de documentação no arquivo:**
   ```sql
   -- =============================================
   -- Função: nome_da_funcao
   -- Descrição: O que ela faz
   -- Criado: Data ISO
   -- Atualizado: Mudanças importantes
   -- =============================================
   ```

6. **Atualizar documentação:** `/AGENTE_LIFTLIO/5_Documentacao/INDICE_COMPLETO.md`

