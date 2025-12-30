# ⚠️ ESTE DIRETÓRIO É HISTÓRICO/BACKUP

**Data de migração**: 12/10/2025
**Origem**: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/`

---

## 📊 Status Atual

Este diretório contém **~315 SQL functions** e **~15 Edge Functions** que foram criadas entre janeiro/2025 e 12/10/2025.

### ✅ TODAS ESSAS FUNÇÕES JÁ ESTÃO DEPLOYADAS EM PRODUÇÃO

**IMPORTANTE:** Estas funções JÁ ESTÃO NO LIVE (main) e DEV (branch) funcionando perfeitamente!

---

## 🚫 NOVA ESTRUTURA OFICIAL

A partir de 12/10/2025, todas as novas funções devem ser criadas em:

```
/Supabase/supabase/
├── migrations/        ← SQL Functions (versionadas por timestamp YYYYMMDDHHMMSS)
└── functions/         ← Edge Functions (deploy via Supabase MCP ou CLI)
```

---

## 💡 Por Que a Mudança?

### Antes (AGENTE_LIFTLIO):
- ❌ Sem versionamento Git real
- ❌ Aplicava direto no LIVE (risco alto)
- ❌ Sem possibilidade de rollback
- ❌ Sem code review
- ❌ Apenas backup visual local

### Agora (/Supabase com Migrations):
- ✅ **Versionamento Git completo** (histórico, blame, revert)
- ✅ **Branch dev persistente** (testes seguros antes de produção)
- ✅ **Migrations idempotentes** (pode reaplicar sem quebrar)
- ✅ **Zero risco** (dev branch isola produção)
- ✅ **Padrão Supabase oficial** (CLI + auto-deploy)
- ✅ **Code review possível** (via Git PRs/commits)

---

## 🔧 O Que Fazer Com Este Diretório?

### ✅ MANTER como backup histórico
- **NÃO deletar!** São 315+ funções valiosas
- Usar como **referência** se precisar consultar implementação antiga
- Manter para **auditoria** e **histórico do projeto**

### ❌ NÃO criar novas funções aqui
- Novas SQL functions → `/Supabase/supabase/migrations/`
- Novas Edge Functions → `/Supabase/supabase/functions/`

### ❌ NÃO modificar funções existentes aqui
- Se precisar modificar uma função antiga, criar nova migration em `/Supabase/supabase/migrations/`

---

## 🔄 Como Migrar Uma Função Antiga?

Se precisar modificar uma função deste diretório:

1. **Copiar código** de `/functions_backup/SQL_Functions/categoria/funcao.sql`
2. **Criar nova migration** em `/Supabase/supabase/migrations/YYYYMMDDHHMMSS_update_funcao.sql`
3. **Fazer mudanças necessárias** no novo arquivo
4. **Delegar para agente MCP** testar na branch dev (project_id: `cdnzajygbcujwcaoswpi`)
5. **Git commit + push** para branch dev
6. **Merge manual** para main quando aprovado

---

## 📂 Estrutura Deste Diretório (Preserved)

```
functions_backup/
├── SQL_Functions/              (~315 funções organizadas em 20 categorias)
│   ├── 00_Authentication/      (10 funções)
│   ├── 01_YouTube/             (30 funções - OAuth, API, monitoring)
│   ├── 03_Claude/              (10 funções - AI integration)
│   ├── 04_Mensagens/           (28 funções - message automation)
│   ├── 06_Projetos/            (34 funções - project management)
│   ├── 07_RAG_Embeddings/      (7 funções - vector search)
│   ├── 08_Analytics/           (8 funções - tracking, metrics)
│   ├── 09_Email/               (11 funções - email automation)
│   ├── 10_Payments/            (12 funções - Square integration)
│   ├── 11_Scanner_YouTube/     (6 funções - video scanning)
│   ├── 12_Keywords/            (4 funções - keyword analysis)
│   ├── 13_Utils_Sistema/       (16 funções - system utilities)
│   ├── A_Classificar/          (11 funções - uncategorized)
│   ├── BACKUP_DUPLICATAS_*/    (55 backups de duplicatas removidas)
│   ├── Contact_Form/           (contact form handlers)
│   ├── MIGRATIONS/             (2 migrations antigas)
│   └── PIPELINE_PROCESSOS/     (13 funções - pipeline automation)
│
└── Edge_Functions/             (~15 funções TypeScript/Deno)
    ├── agente-mcp-trello (v2-v6)       (Trello AI automation)
    ├── agente-liftlio_v32              (Main AI agent)
    ├── update-youtube-info             (Channel info updater)
    ├── email-automation-engine         (Email workflows)
    ├── youtube-oauth-handler           (OAuth flow management)
    ├── upload-trello-image             (Image upload utility)
    └── ... (mais 9 funções)
```

---

## 📈 Histórico de Valor

Este diretório representa **meses de desenvolvimento intenso** (jan-out/2025) e contém **lógica de negócio crítica** que está funcionando em produção.

**É um BACKUP ESSENCIAL do trabalho realizado!**

### Estatísticas:
- **~315 SQL Functions** organizadas em 20 categorias
- **~15 Edge Functions** com múltiplas versões versionadas
- **55 backups** de funções duplicadas removidas
- **Período**: Janeiro - Outubro 2025
- **Linhas de código**: Milhares (SQL + TypeScript)

---

## ⚠️ ATENÇÃO: NÃO APLICAR COMO MIGRATIONS

**IMPORTANTE:** Estas funções NÃO devem ser aplicadas como migrations porque:

1. ✅ **Já estão deployadas** no live e dev
2. ❌ **Causaria erro** "função já existe"
3. ❌ **Sem necessidade** - já funcionando perfeitamente
4. ✅ **Apenas referência** - consultar quando necessário

---

**Última atualização**: 12/10/2025
**Mantido por**: Valdair / BVS Tecnologia / Claude Code
**Status**: 🔒 **READONLY - Backup Histórico Apenas**

---

## 🤖 Browser Agent (Adicionado 30/12/2025)

Nova pasta adicionada com documentação do sistema de postagens humanizadas:

```
functions_backup/
└── SQL_Functions/
    └── 14_Browser/                    # Browser Agent (postagens humanizadas)
        ├── README_BROWSER_AGENT.md    # Documentação completa do sistema
        ├── browser_reply_to_comment.sql         # Função SQL (Sistema 1 - Respostas)
        ├── browser_youtube_reply_prompt_v2.sql  # Prompt de reply (3840 chars)
        └── browser_youtube_comment_prompt_v2.sql # Prompt de comment (4613 chars)
```

### O que é o Browser Agent?

Sistema que executa postagens no YouTube usando Claude + Playwright de forma humanizada:
- **Sistema 1 (Respostas)**: Responde a comentários existentes via `reply_prompt`
- **Sistema 2 (Comentários)**: Posta comentários iniciais via `comment_prompt`

### Tabelas no Supabase

- `browser_platforms` - Prompts globais por plataforma
- `browser_tasks` - Histórico de execuções

### Métricas 30/12/2025

- Sistema 2 (Comentários): 6/6 tasks = 100% sucesso
- Prompt `comment_prompt` atualizado de 676 para 4613 chars (comportamento humanizado)
