# 📋 Supabase Branching - Cheat Sheet

## 🎯 RESPOSTA RÁPIDA

**Pergunta:** Por que a DEV não tem todas as funções do MAIN?

**Resposta:** Preview branches aplicam APENAS migrations em `supabase/migrations/`. Funções criadas manualmente via Dashboard/MCP NÃO são copiadas automaticamente.

---

## 🔑 CONCEITOS FUNDAMENTAIS

### O que É Copiado na Branch Creation?

| Item | Copiado? | Como? |
|------|---------|-------|
| **Schema (tabelas, colunas)** | ✅ Sim | Via migrations |
| **Funções SQL** | ⚠️ Apenas em migrations | Via migrations |
| **Triggers** | ⚠️ Apenas em migrations | Via migrations |
| **RLS Policies** | ⚠️ Apenas em migrations | Via migrations |
| **Dados** | ❌ Não | (usar `--with-data` flag) |
| **Custom Roles** | ❌ Não | Não suportado |
| **Edge Functions** | ✅ Sim | Auto-deploy |
| **Configurações** | ✅ Sim | API, Auth, Storage |

### Source of Truth

```
Preview Branch = Git Migrations + Config
                ≠ Clone do Banco de Dados
```

---

## 📝 COMANDOS ESSENCIAIS

### Export Schema do Banco Remoto
```bash
# Conecta e cria migration com estado atual
supabase link --project-ref <project_id>
supabase db pull
```

**Resultado:** `supabase/migrations/YYYYMMDD_remote_schema.sql`

### Aplicar Migrations em Banco Remoto
```bash
supabase link --project-ref <project_id>
supabase db push
```

### Ver Diferenças (Local vs Remoto)
```bash
# Gera migration das diferenças
supabase db diff -f migration_name
```

### Dump Raw do Banco
```bash
# pg_dump com flags automáticos
supabase db dump > backup.sql

# Com dados
supabase db dump --data-only > data.sql

# Com roles
supabase db dump --role-only > roles.sql
```

### Listar Migrations (Local vs Remoto)
```bash
supabase migration list
```

### Reset Banco Local
```bash
# Recria do zero + aplica migrations
supabase db reset
```

---

## 🚀 WORKFLOW CORRETO

### 1️⃣ Criar Nova Função SQL

**Em DEV (via Dashboard ou MCP):**
```sql
CREATE OR REPLACE FUNCTION minha_funcao()
RETURNS void AS $$
BEGIN
    -- código
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2️⃣ Exportar como Migration

```bash
cd /path/to/supabase
supabase link --project-ref <dev_project_id>
supabase db diff -f add_minha_funcao
```

**Resultado:** `supabase/migrations/YYYYMMDD_add_minha_funcao.sql`

### 3️⃣ Git Commit

```bash
git add supabase/migrations/
git commit -m "feat: Add minha_funcao SQL function"
git push
```

### 4️⃣ Aplicar em MAIN

```bash
supabase link --project-ref <main_project_id>
supabase db push
```

---

## 🔧 SINCRONIZAR MAIN → DEV (Completo)

### Opção A: Script Automatizado (Recomendado)
```bash
cd /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/Supabase
./sync-main-to-dev.sh
```

### Opção B: Manual
```bash
# 1. Backup MAIN
supabase db dump --db-url "<main_db_url>" > backup_main.sql

# 2. Link MAIN + Pull
supabase link --project-ref suqjifkhmekcdflwowiw
supabase db pull

# 3. Link DEV + Push
supabase link --project-ref cdnzajygbcujwcaoswpi
supabase db push
```

---

## ⚠️ ARMADILHAS COMUNS

### ❌ NÃO FAZER:
- Criar funções no MAIN via Dashboard sem migration
- Confiar em `functions_backup/` como source of truth
- Deletar branches sem backup
- Modificar funções sem versionar

### ✅ FAZER:
- Sempre criar/testar na DEV primeiro
- Exportar mudanças como migrations
- Git commit antes de aplicar em MAIN
- Manter migrations organizadas cronologicamente

---

## 🔍 TROUBLESHOOTING

### "Funções estão faltando na DEV"
**Causa:** Funções não estão em migrations
**Solução:** `supabase db pull` no MAIN → `supabase db push` na DEV

### "Migration falhou ao aplicar"
**Causa:** Objeto já existe ou dependência faltando
**Solução:** Verificar ordem das migrations, adicionar `DROP IF EXISTS`

### "Branch ficou dessincronizada"
**Causa:** Mudanças manuais no Dashboard sem migration
**Solução:** `supabase db pull` → commit → `supabase db push`

### "Timestamps de migrations conflitam"
**Causa:** Git rebase alterou ordem
**Solução:** Renomear migrations manualmente (timestamps únicos)

---

## 📊 ESTRUTURA DE DIRETÓRIOS

```
/Supabase/
├── supabase/
│   ├── config.toml              ← Configurações do projeto
│   ├── seed.sql                 ← Dados iniciais (seed)
│   └── migrations/              ← SOURCE OF TRUTH (Git tracked)
│       ├── 20240101_initial.sql
│       ├── 20250101_add_feature.sql
│       └── ...
├── functions_backup/            ← Backups históricos (referência)
│   ├── SQL_Functions/
│   └── Edge_Functions/
└── sync-main-to-dev.sh          ← Script de sincronização
```

---

## 🔗 REFERÊNCIAS RÁPIDAS

| Docs | URL |
|------|-----|
| Branching Guide | https://supabase.com/docs/guides/deployment/branching |
| CLI Reference | https://supabase.com/docs/reference/cli/introduction |
| db pull | https://supabase.com/docs/reference/cli/supabase-db-pull |
| db push | https://supabase.com/docs/reference/cli/supabase-db-push |
| Migrations | https://supabase.com/docs/guides/deployment/database-migrations |

---

## 💡 DICA PRO

**Use o script de switch-branch automatizado:**
```bash
./switch-branch.sh dev   # Troca para DEV (Git + Supabase + .env)
./switch-branch.sh main  # Troca para MAIN
./switch-branch.sh status # Mostra branch atual
```

**Ele faz:**
- Git checkout
- Supabase link
- .env symlink
- Badge visual

---

**Última Atualização:** 14/10/2025
**Versão:** 1.0
