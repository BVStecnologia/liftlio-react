# 🏠 Supabase Local Development Setup

## 📋 Overview

Este guia configura um ambiente Supabase **100% local** no seu MacBook M2, com:
- ✅ PostgreSQL 17 rodando no Docker
- ✅ **Todas as 287 funções SQL customizadas do LIVE**
- ✅ Supabase Studio (interface visual)
- ✅ Edge Functions runtime (Deno)
- ✅ Otimizado para 8GB RAM

**⚠️ IMPORTANTE:** O processo apenas **LEITURA** do LIVE - nenhuma modificação é feita na produção.

---

## 🚀 Quick Start (Automated)

### Opção 1: Script Automático (Recomendado)

```bash
cd liftlio-react/supabase
./setup-local.sh
```

Este script faz:
1. Login no Supabase (abre navegador)
2. Link com LIVE (read-only)
3. Pull do schema completo (287 funções)
4. Atualiza .gitignore
5. Inicia ambiente local

**Tempo estimado:** 3-5 minutos (primeira vez pode levar mais)

---

## 🛠️ Manual Setup (Step by Step)

### Pré-requisitos

- ✅ Docker Desktop instalado e rodando
- ✅ Supabase CLI v2.48+ (`npm install -g supabase`)
- ✅ MacBook com 8GB+ RAM
- ✅ Conta Supabase com acesso ao projeto

### Step 1: Login

```bash
cd liftlio-react/supabase
supabase login
```

Abre o navegador para autenticação. Copie o token gerado.

### Step 2: Link to LIVE (Read-Only)

```bash
supabase link --project-ref suqjifkhmekcdflwowiw
```

**Nota:** Isso NÃO modifica LIVE! Apenas permite pull do schema.

### Step 3: Pull Schema

```bash
supabase db pull
```

Isso cria um arquivo de migration em:
```
supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql
```

Contém todas as 287 funções SQL + tabelas + tipos + extensões.

### Step 4: Start Local Environment

```bash
supabase start
```

Primeira execução pode levar 2-3 minutos (download de Docker images).

---

## 🔧 Configuration

### Memory Optimization (M2 8GB)

O `config.toml` já está otimizado:

```toml
[db.pooler]
enabled = false  # Economiza ~200MB

[inbucket]
enabled = false  # Email testing disabled (~100MB)

[analytics]
enabled = false  # Analytics disabled (~150MB)

[studio]
enabled = true   # Interface visual (necessário)
```

**Economia total:** ~450MB de RAM

### Services Running

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **Studio** | 54323 | http://localhost:54323 | ✅ Enabled |
| **PostgreSQL** | 54322 | postgresql://... | ✅ Enabled |
| **API (PostgREST)** | 54321 | http://localhost:54321 | ✅ Enabled |
| **Edge Runtime** | - | - | ✅ Enabled |
| Inbucket | 54324 | - | ❌ Disabled |
| Analytics | 54327 | - | ❌ Disabled |
| Pooler | 54329 | - | ❌ Disabled |

---

## 📊 Useful Commands

### Status & Info

```bash
# Ver status de todos os serviços
supabase status

# Ver connection strings
supabase status --output json | jq '.DB_URL'

# Logs em tempo real
supabase logs
```

### Database Operations

```bash
# Conectar ao PostgreSQL via psql
supabase db shell

# Executar query SQL
supabase db query "SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace"

# Criar nova migration
supabase migration new nome_da_migration

# Aplicar migrations
supabase db push
```

### Docker Management

```bash
# Ver uso de memória dos containers
docker stats --no-stream

# Limpar volumes (CUIDADO: perde dados locais)
supabase stop
docker system prune -a --volumes

# Restart completo
supabase stop && supabase start
```

---

## 🧪 Testing Functions Locally

### Exemplo: Testar função SQL

```sql
-- No Supabase Studio ou via psql
SELECT * FROM agendar_postagens_diarias(58);
```

### Exemplo: Testar Edge Function

```bash
# Criar nova edge function
supabase functions new test-function

# Serve localmente
supabase functions serve

# Invocar
curl http://localhost:54321/functions/v1/test-function \
  -H "Authorization: Bearer ANON_KEY"
```

### Exemplo: Verificar todas as funções

```sql
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'vector%'
  AND p.proname NOT LIKE 'hstore%'
ORDER BY p.proname;
```

Deve retornar **287 funções customizadas**.

---

## 🔍 Troubleshooting

### Docker não inicia

```bash
# Verificar se Docker está rodando
docker ps

# Se não estiver, abrir Docker Desktop
open -a Docker

# Aguardar 30 segundos e tentar novamente
supabase start
```

### Port conflict (porta já em uso)

```bash
# Ver o que está usando as portas
lsof -i :54323  # Studio
lsof -i :54321  # API
lsof -i :54322  # PostgreSQL

# Matar processo específico
kill -9 <PID>

# Ou mudar as portas no config.toml
```

### Migration failed

```bash
# Reset completo do banco local
supabase db reset

# Reaplica todas as migrations do zero
```

### Out of memory

```bash
# Ver uso atual
docker stats --no-stream

# Parar serviços não essenciais
# Editar config.toml e desabilitar:
# - realtime.enabled = false
# - storage.enabled = false

# Restart
supabase stop && supabase start
```

### Funções não foram importadas

```bash
# Verificar se migration existe
ls -lh supabase/migrations/

# Forçar pull novamente
supabase db pull --schema public

# Aplicar migration
supabase db reset
```

---

## 📁 File Structure

```
liftlio-react/supabase/
├── setup-local.sh              # Script automático
├── LOCAL_DEV_SETUP.md          # Este arquivo
├── supabase/
│   ├── config.toml             # Configuração otimizada para M2 8GB
│   ├── .temp/                  # Cache local (gitignored)
│   │   └── project-ref         # Project ID linkado
│   ├── migrations/             # Migrations versionadas
│   │   └── YYYYMMDD_remote_schema.sql  # Schema do LIVE
│   ├── functions/              # Edge Functions locais
│   └── .gitignore              # Ignora arquivos temporários
└── ...
```

---

## 🎯 Next Steps

Depois de configurar o ambiente local:

1. **Explore no Studio:** http://localhost:54323
   - Ver tabelas
   - Testar funções SQL
   - Verificar RLS policies

2. **Teste queries complexas:**
   ```sql
   SELECT * FROM get_project_dashboard_stats(58);
   ```

3. **Desenvolva Edge Functions:**
   ```bash
   supabase functions new minha-funcao
   supabase functions serve
   ```

4. **Compare LIVE vs LOCAL:**
   - LIVE: Apenas leitura, dados reais
   - LOCAL: Desenvolvimento seguro, reset fácil

5. **Deploy para DEV:**
   ```bash
   # Quando pronto, mude o link
   supabase link --project-ref cdnzajygbcujwcaoswpi
   supabase db push
   ```

---

## ⚠️ Important Notes

### LIVE Environment Safety

- ❌ **NUNCA** execute `supabase db push` quando linkado ao LIVE
- ✅ **SEMPRE** use `supabase db pull` (leitura)
- ✅ Para modificações, linke ao DEV antes

### Local vs Remote

| Aspecto | Local | LIVE | DEV |
|---------|-------|------|-----|
| **Dados** | Vazio (seed.sql) | Produção real | Staging |
| **Modificações** | ✅ Livre | ❌ Proibido | ✅ Permitido |
| **Reset** | ✅ Instantâneo | ❌ Impossível | ⚠️ Cuidado |
| **Velocidade** | ⚡ Local | 🌍 Latência | 🌍 Latência |

### Git Tracking

**Commitado:**
- ✅ `config.toml`
- ✅ `migrations/*.sql`
- ✅ `functions/**/*.ts`

**Gitignored:**
- ❌ `.temp/`
- ❌ `.branches/`
- ❌ Volumes do Docker

---

## 📚 Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [PostgreSQL 17 Docs](https://www.postgresql.org/docs/17/)
- [Deno Edge Runtime](https://deno.land/manual@v1.37.0)

---

## 🤝 Support

Se encontrar problemas:

1. Verificar logs: `supabase logs`
2. Checar Docker: `docker stats`
3. Reset environment: `supabase stop && supabase db reset && supabase start`
4. Consultar troubleshooting acima

---

**Última atualização:** 2025-01-11
**Versão Supabase CLI:** 2.48.3+
**PostgreSQL:** 17
**Otimizado para:** MacBook M2 8GB RAM
