# 🚀 WORKFLOW DE DEPLOY SEGURO - Local → LIVE

## 📋 Visão Geral

Este workflow garante que APENAS funções testadas e aprovadas sejam deployadas no LIVE.

```mermaid
graph LR
    A[Desenvolvimento Local] --> B[Teste Local]
    B --> C[Registro no DEPLOY_LOG]
    C --> D[Validação Pre-Deploy]
    D --> E[Deploy no LIVE]
    E --> F[Verificação Pós-Deploy]
    F --> G[Git Commit]
```

---

## 🔄 WORKFLOW PASSO A PASSO

### PASSO 1️⃣: Desenvolvimento Local

```bash
# Trabalhar na função localmente
vim /liftlio-react/supabase/functions_backup/SQL_Functions/minha_funcao.sql

# Sempre incluir DROP IF EXISTS
DROP FUNCTION IF EXISTS public.minha_funcao(params);
CREATE OR REPLACE FUNCTION public.minha_funcao(...)
```

---

### PASSO 2️⃣: Teste Local Completo

```bash
# 1. Executar a função no banco local
docker exec -i supabase_db_Supabase psql -U postgres -d postgres < minha_funcao.sql

# 2. Executar suite de testes
docker exec -i supabase_db_Supabase psql -U postgres -d postgres < minha_funcao.test.sql

# 3. Verificar logs
docker logs supabase_db_Supabase --tail 50 | grep ERROR
```

**✅ Checklist de Testes:**
- [ ] Função criada sem erros
- [ ] Testes passando
- [ ] BEGIN/ROLLBACK funcionando
- [ ] Sem erros nos logs
- [ ] Performance aceitável

---

### PASSO 3️⃣: Registrar no DEPLOY_LOG

**Editar:** `/liftlio-react/supabase/functions_backup/DEPLOY_LOG.md`

```markdown
## 🟡 PENDING DEPLOY

| Data | Função | Tipo | Testado | Arquivo | Notas |
|------|--------|------|---------|---------|-------|
| 2025-01-26 | minha_funcao | SQL | ✅ | SQL_Functions/minha_funcao.sql | Adiciona validação de email |
```

---

### PASSO 4️⃣: Validação Pre-Deploy

```bash
# Executar script de verificação
cd /liftlio-react/supabase/functions_backup
./check-deploy-status.sh
```

**Verificar:**
- 🟡 Funções modificadas recentemente
- 🧪 Todas têm arquivo .test.sql
- 📝 DEPLOY_LOG atualizado
- ✅ Nenhum erro local

---

### PASSO 5️⃣: Deploy Batch Seguro

**Opção A: Deploy Individual (Mais Seguro)**

```bash
# Para CADA função no DEPLOY_LOG:
Task → supabase-mcp-expert → "
Deploy a função 'minha_funcao' no LIVE.
Arquivo: /liftlio-react/supabase/functions_backup/SQL_Functions/minha_funcao.sql
"
```

**Opção B: Deploy em Lote (Mais Rápido)**

```bash
# Criar arquivo com todas as funções
cat > deploy_batch.sql << 'EOF'
-- =============================================
-- DEPLOY BATCH: 2025-01-26
-- Funções: minha_funcao, outra_funcao
-- =============================================

-- Função 1
DROP FUNCTION IF EXISTS public.minha_funcao(params);
CREATE OR REPLACE FUNCTION public.minha_funcao(...)
...

-- Função 2
DROP FUNCTION IF EXISTS public.outra_funcao(params);
CREATE OR REPLACE FUNCTION public.outra_funcao(...)
...
EOF

# Deploy via MCP
Task → supabase-mcp-expert → "Deploy o arquivo deploy_batch.sql no LIVE"
```

---

### PASSO 6️⃣: Verificação Pós-Deploy

```bash
# Via agente MCP - verificar logs LIVE
Task → supabase-mcp-expert → "
Verificar logs do LIVE após deploy.
Buscar por erros nas últimas 5 minutos.
"

# Testar uma função deployada
Task → supabase-mcp-expert → "
Executar no LIVE: SELECT minha_funcao('teste');
"
```

---

### PASSO 7️⃣: Atualizar DEPLOY_LOG

**Mover de PENDING → DEPLOYED:**

```markdown
## 🟡 PENDING DEPLOY
| <!-- vazio após deploy --> |

## 🟢 DEPLOYED TO LIVE
| Data Deploy | Função | Tipo | Arquivo | Deploy Method | Verificado |
|-------------|--------|------|---------|---------------|------------|
| 2025-01-26 | minha_funcao | SQL | SQL_Functions/minha_funcao.sql | MCP | ✅ |
```

---

### PASSO 8️⃣: Git Commit

```bash
# Commitar tudo junto
git add .
git commit -m "feat: Deploy funções para LIVE

Deployed:
- minha_funcao: Adiciona validação de email
- outra_funcao: Otimização de performance

Todos os testes passaram localmente.
Deploy verificado no LIVE."

git push
```

---

## 🛡️ REGRAS DE SEGURANÇA

### ✅ SEMPRE FAZER:

1. **Testar TUDO localmente primeiro**
2. **Usar DROP IF EXISTS**
3. **Registrar no DEPLOY_LOG**
4. **Deploy uma função por vez (quando crítico)**
5. **Verificar logs após cada deploy**
6. **Git commit após sucesso**

### ❌ NUNCA FAZER:

1. **Deploy direto sem teste local**
2. **Deploy de múltiplas funções sem testar**
3. **Esquecer de atualizar DEPLOY_LOG**
4. **Deploy sem DROP IF EXISTS**
5. **Ignorar erros no log**

---

## 🔄 ROLLBACK DE EMERGÊNCIA

Se algo der errado no LIVE:

```bash
# 1. Identificar função problemática
Task → supabase-mcp-expert → "Verificar logs de erro no LIVE"

# 2. Reverter para versão anterior
Task → supabase-mcp-expert → "
DROP FUNCTION public.funcao_com_problema(params);
CREATE OR REPLACE FUNCTION public.funcao_com_problema(params)
-- [código da versão anterior do Git]
"

# 3. Registrar no DEPLOY_LOG
## ❌ ROLLBACK NEEDED
| Data | Função | Problema | Ação |
| 2025-01-26 | funcao_x | Timeout em produção | Revertido para v1 |
```

---

## 📊 Métricas de Deploy

**Manter registro de:**
- ✅ Taxa de sucesso de deploys
- ⏱️ Tempo médio de deploy
- 🐛 Bugs encontrados pós-deploy
- 🔄 Número de rollbacks

---

## 🎯 Comandos Úteis

```bash
# Ver todas as funções modificadas esta semana
find functions_backup -name "*.sql" -mtime -7 -type f

# Contar funções pendentes de deploy
grep "🟡 PENDING" DEPLOY_LOG.md -A 20 | grep "^|" | wc -l

# Backup antes de deploy massivo
tar -czf backup_$(date +%Y%m%d).tar.gz functions_backup/

# Comparar função local vs LIVE
# LOCAL:
docker exec -i supabase_db_Supabase psql -U postgres -d postgres -c "\df+ minha_funcao"
# LIVE (via MCP):
Task → supabase-mcp-expert → "Mostrar definição da função minha_funcao"
```

---

## 💡 Dicas Pro

1. **Deploy Sexta? NUNCA!**
   - Melhor dia: Terça ou Quarta
   - Melhor hora: 10h-15h

2. **Feature Flags**
   - Criar funções com flag de ativação
   - Deploy com flag OFF, testar, depois ON

3. **Canary Deploy**
   - Deploy em DEV branch primeiro
   - Monitorar 24h
   - Depois merge para LIVE

4. **Comunicação**
   - Avisar time antes de deploy grande
   - Documentar mudanças breaking

---

## 📞 Em Caso de Problemas

1. **Verificar logs imediatamente**
2. **Rollback se necessário**
3. **Documentar o problema**
4. **Ajustar testes locais**
5. **Re-deploy após correção**

---

**Lembre-se:** É melhor demorar 10 minutos testando do que 10 horas debugando em produção! 🚀