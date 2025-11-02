# 🗺️ MAPA VISUAL: Local → Git → LIVE

## 📊 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│                      🏠 DESENVOLVIMENTO LOCAL                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [VSCode]  →  [Docker Local]  →  [functions_backup/]           │
│     ↓              ↓                    ↓                       │
│  Escreve       Testa            Salva arquivo                   │
│  função        local            .sql + .test.sql                │
│                                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                        📝 CONTROLE LOCAL                        │
│                    (_agents/deploy-control/)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [DEPLOY_LOG.md]     →    Rastreia o que precisa deploy        │
│  ✅ Testado local         🟡 Pending → 🟢 Deployed             │
│  ⏳ Aguardando                                                  │
│                                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                          🔀 GIT (GitHub)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  git add .           →    Versiona TUDO                         │
│  git commit          →    História completa                     │
│  git push            →    Backup remoto                         │
│                                                                  │
│  ⚠️ Git NÃO faz deploy automático no Supabase!                 │
│  ⚠️ Git é só versionamento, não é CI/CD!                       │
│                                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      🚀 DEPLOY MANUAL                           │
│                    (supabase-mcp-expert)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DEPLOY_LOG.md  →  Lista funções pending                        │
│       ↓                                                          │
│  Para cada função:                                              │
│  Task → supabase-mcp-expert → "deploy função X"                │
│       ↓                                                          │
│  Atualiza DEPLOY_LOG → DEPLOYED ✅                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 POR QUE NÃO SÓ GIT?

### ❌ Problema com Git sozinho:
```
Você faz 10 commits locais...
- commit 1: "fix função A"
- commit 2: "update função B"
- commit 3: "test função C"
- commit 4: "revert função B"
- commit 5: "fix typo função A"
...

Pergunta: Quais funções deployar no LIVE? 🤔
Git não sabe! Ele só versiona arquivos.
```

### ✅ Solução: Git + DEPLOY_LOG
```
Git: Versiona TUDO (histórico completo)
DEPLOY_LOG: Rastreia o que está PRONTO para LIVE

Git commit != Deploy no Supabase
```

---

## 🔄 WORKFLOW SIMPLIFICADO

```
     LOCAL                 CONTROLE              GIT               LIVE
       ↓                      ↓                   ↓                 ↓

1. Edita função  →    2. Marca pending   →  3. Commit   →   4. Deploy manual
   test.sql              DEPLOY_LOG.md        GitHub         supabase-mcp
      ✅                     🟡                 📦               🚀
```

---

## 📂 Estrutura Final

```
functions_backup/
├── 📁 _agents/                    ← CONTROLES (não limpar!)
│   └── 📁 deploy-control/
│       ├── 📋 DEPLOY_LOG.md       ← O que deployar
│       ├── 🔍 check-deploy-status.sh  ← Verificador
│       └── 📚 DEPLOY_WORKFLOW.md  ← Como deployar
│
├── 📁 SQL_Functions/              ← SUAS FUNÇÕES
│   ├── funcao1.sql
│   └── funcao1.test.sql
│
└── 📁 Edge_Functions/             ← EDGE FUNCTIONS
    └── edge-func.ts
```

---

## 💡 RESUMO EXECUTIVO

### Git faz:
✅ Versionamento
✅ Backup
✅ Histórico
❌ NÃO faz deploy automático

### DEPLOY_LOG faz:
✅ Rastreia o que precisa deploy
✅ Status de testes
✅ Controle manual do que vai pro LIVE

### Juntos:
**Git** = Máquina do tempo (volta versões)
**DEPLOY_LOG** = Checklist de deploy (o que deployar)
**MCP** = Executor (faz o deploy)

---

## 🎬 NA PRÁTICA

**Segunda-feira:** Você edita 5 funções
```bash
git commit -m "wip: trabalhando em 5 funções"
# NÃO deploya nada ainda
```

**Terça-feira:** Testa 3 funções
```bash
# Atualiza DEPLOY_LOG.md
# 3 funções → 🟡 PENDING
git commit -m "test: 3 funções prontas para deploy"
```

**Quarta-feira:** Deploy controlado
```bash
# Olha DEPLOY_LOG.md
# Vê 3 funções pending
# Deploy uma por uma via MCP
# Move para DEPLOYED ✅
git commit -m "deploy: 3 funções no LIVE"
```

**Se der erro:** Git revert do arquivo, deploy de novo!

---

## 🏆 VANTAGEM

**SEM este sistema:**
"Quais funções eu mudei semana passada que ainda não foram pro LIVE?" 😰

**COM este sistema:**
"Olha no DEPLOY_LOG.md → 3 pending!" 😎