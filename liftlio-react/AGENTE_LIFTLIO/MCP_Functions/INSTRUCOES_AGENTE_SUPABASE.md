# 🔴 INSTRUÇÕES CRÍTICAS PARA AGENTE SUPABASE MCP

## ⚠️ REGRAS OBRIGATÓRIAS

### 1. AO CRIAR/MODIFICAR FUNÇÕES SQL

**SEMPRE fazer nesta ordem:**

```sql
-- 1. SEMPRE começar com DROP
DROP FUNCTION IF EXISTS nome_funcao(parametros_antigos);

-- 2. Depois CREATE OR REPLACE
CREATE OR REPLACE FUNCTION nome_funcao(novos_parametros)
...
```

### 2. SINCRONIZAÇÃO OBRIGATÓRIA

**IMEDIATAMENTE após criar/editar no Supabase:**

1. Salvar cópia local em:
   - SQL: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/nome_funcao.sql`
   - Edge: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions/nome-funcao.ts`

2. Usar este padrão de cabeçalho:
```sql
-- =============================================
-- Função: nome_da_funcao
-- Descrição: O que ela faz
-- Criado: YYYY-MM-DDTHH:MM:SS.000Z
-- Atualizado: Descrição da mudança
-- =============================================
```

### 3. LIMPEZA DO BANCO

**NUNCA deixar funções duplicadas:**
- Se criar versão com email → remover versão com UUID
- Se criar versão melhorada → remover versão antiga
- Manter APENAS UMA versão de cada função

### 4. NOMENCLATURA

**Usar nomes descritivos:**
- ✅ `check_user_youtube_integrations_by_email`
- ✅ `reuse_youtube_integration_by_email`
- ❌ `check_user_youtube_integrations` (ambíguo)
- ❌ `reuse_integration` (muito genérico)

### 5. CHECKLIST APÓS CADA OPERAÇÃO

- [ ] Função criada/atualizada no Supabase?
- [ ] DROP IF EXISTS usado antes de CREATE?
- [ ] Arquivo local salvo em MCP_Functions?
- [ ] Funções antigas removidas do banco?
- [ ] Arquivos antigos removidos localmente?
- [ ] Documentação atualizada?

## 📁 ESTRUTURA DE PASTAS

```
/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/
├── SQL_Functions/
│   ├── check_user_youtube_integrations_by_email.sql
│   ├── reuse_youtube_integration_by_email.sql
│   └── update_youtube_account_info.sql
└── Edge_Functions/
    └── [edge functions aqui]
```

## 🚫 FUNÇÕES QUE NÃO DEVEM EXISTIR

Estas funções antigas devem ser removidas se encontradas:
- `check_user_youtube_integrations()` - sem parâmetros
- `reuse_youtube_integration()` - sem email
- `get_user_youtube_integrations(UUID)` - usa UUID ao invés de email

## ✅ FUNÇÕES CORRETAS ATUAIS

### Para Reutilização YouTube:
1. `check_user_youtube_integrations_by_email(email TEXT)`
2. `reuse_youtube_integration_by_email(email TEXT, project_id BIGINT, integration_id BIGINT)`
3. `update_youtube_account_info(id BIGINT, email TEXT, channel_id TEXT, channel_name TEXT)`

## 💡 DICA IMPORTANTE

**Estrutura do banco Liftlio:**
- Tabela `Projeto` usa campo `user` com EMAIL (não UUID)
- Sempre passar email como parâmetro quando precisar identificar usuário
- Não confiar em `auth.uid()` - pode retornar null

## 🔄 WORKFLOW CORRETO

1. **Criar/Editar função** → usar `mcp__supabase__apply_migration`
2. **Salvar localmente** → usar `Write` tool
3. **Remover antigas** → usar DROP FUNCTION
4. **Deletar arquivos antigos** → usar `rm` ou `Bash` tool
5. **Testar** → usar `mcp__supabase__execute_sql`
6. **Documentar** → atualizar este arquivo se necessário