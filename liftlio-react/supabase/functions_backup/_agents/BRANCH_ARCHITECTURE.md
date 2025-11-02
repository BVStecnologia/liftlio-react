# 🏗️ ARQUITETURA DE BRANCHES - Setup Ideal

## 📊 SETUP RECOMENDADO

```
┌─────────────────────────────────────────────────────────┐
│                    GIT (GitHub)                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  main (branch) ←─────────────────→ Supabase LIVE        │
│     ↑                              (suqjifkhmekcdflwowiw)│
│     │                                                    │
│     │ merge                        Prod: liftlio.com    │
│     │                                                    │
│  dev-local (branch) ←────────────→ Supabase LOCAL       │
│     ↑                              (Docker: 54322)       │
│     │                                                    │
│  Você trabalha AQUI                Dev: localhost:3000   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW CORRETO

### Para trabalhar no FRONTEND + BACKEND:

```bash
# 1. Sempre trabalhar na branch dev-local
git checkout dev-local

# 2. Frontend (React)
# Edita componentes, páginas, etc
# Arquivo .env.development aponta para Supabase LOCAL

# 3. Backend (Supabase Functions)
# Cria/edita funções SQL em functions_backup/
# Testa no Docker local

# 4. Commit tudo junto
git add .
git commit -m "feat: novo componente + função SQL"
git push origin dev-local

# 5. Quando TUDO estiver pronto e testado:
git checkout main
git merge dev-local
git push origin main

# 6. Deploy MANUAL via MCP (não automático!)
Task → supabase-mcp-expert → "deploy funções pendentes"
```

---

## 🎯 POR QUE ESTE SETUP?

### Branch `main` + Supabase LIVE:
✅ **Para emergências** - Se precisar fix urgente direto em prod
✅ **Para verificar** - Ver como está em produção
✅ **Estável** - Só código testado e aprovado

### Branch `dev-local` + Supabase LOCAL:
✅ **Desenvolvimento diário** - 99% do seu tempo aqui
✅ **Sem riscos** - Quebrou? Reset o Docker!
✅ **Testes completos** - Frontend + Backend juntos
✅ **Commits frequentes** - Salva progresso sem afetar prod

---

## 📝 CONFIGURAÇÃO DE AMBIENTE

### `.env.development` (branch dev-local):
```env
# Aponta para Supabase LOCAL
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_LOCAL...
```

### `.env.production` (branch main):
```env
# Aponta para Supabase LIVE
REACT_APP_SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

---

## 🚀 COMANDOS ESSENCIAIS

### Trocar de ambiente rapidamente:
```bash
# Para desenvolvimento
git checkout dev-local
npm start  # Usa Supabase LOCAL automaticamente

# Para verificar produção
git checkout main
npm start  # Usa Supabase LIVE automaticamente
```

### Ver diferenças antes de merge:
```bash
# Ver o que mudou entre dev e main
git diff main..dev-local

# Ver só arquivos SQL modificados
git diff main..dev-local -- '*.sql'
```

### Deploy seguro:
```bash
# 1. Verificar mudanças pendentes
cd functions_backup/_agents/deploy-control
cat DEPLOY_LOG.md

# 2. Deploy via MCP (não automático!)
# Task → supabase-mcp-expert
```

---

## ⚠️ CUIDADOS IMPORTANTES

### NUNCA fazer:
❌ Deploy automático no push para main
❌ Trabalhar direto na main (exceto emergências)
❌ Misturar ambientes (.env errado)
❌ Deploy sem testar local primeiro

### SEMPRE fazer:
✅ Desenvolver em dev-local
✅ Testar TUDO local antes de merge
✅ Deploy manual e controlado via MCP
✅ Manter DEPLOY_LOG atualizado

---

## 🎬 EXEMPLO PRÁTICO

**Segunda (dev-local):**
```bash
# Cria novo componente
vim src/components/NewFeature.tsx

# Cria função SQL para o componente
vim functions_backup/SQL_Functions/get_feature_data.sql

# Testa tudo LOCAL
npm start  # Frontend em localhost:3000
docker exec...  # Função SQL no Docker

# Commit
git add .
git commit -m "feat: NewFeature component + SQL function"
```

**Terça (ainda dev-local):**
```bash
# Mais ajustes, testes, etc
git commit -m "fix: ajustes na NewFeature"
```

**Quarta (merge para main):**
```bash
# Tudo testado e aprovado
git checkout main
git merge dev-local
git push

# Deploy MANUAL (você controla!)
Task → supabase-mcp-expert → "deploy get_feature_data"
```

---

## 🏆 VANTAGENS DESTE SETUP

1. **Segurança** - Nunca quebra produção acidentalmente
2. **Flexibilidade** - Trabalha frontend e backend juntos
3. **Controle** - Deploy manual, não automático
4. **Rastreabilidade** - Git versiona, DEPLOY_LOG controla
5. **Emergências** - Pode fixar direto na main se precisar

---

## 💡 RESUMO

```
dev-local = Desenvolvimento diário (99% do tempo)
    ↓
   merge
    ↓
main = Produção estável
    ↓
  MCP deploy manual
    ↓
LIVE = liftlio.com
```

**Simples, seguro e sob seu controle total!**