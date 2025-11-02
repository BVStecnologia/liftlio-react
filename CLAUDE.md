# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🧠 MODO DE PENSAMENTO
**SEMPRE** usar ultrathink para:
- Análises de arquitetura e design patterns
- Debugging de problemas complexos
- Decisões técnicas importantes (libs, ferramentas, refactoring)
- Otimizações de performance
- Mudanças que afetam múltiplos arquivos/sistemas

**Thinking normal** para:
- Features simples e bem definidas
- Fixes rápidos
- Mudanças pontuais

## 🎯 FILOSOFIA DE TRABALHO
1. **Menos é Mais**: SEMPRE preferir editar arquivos existentes a criar novos
2. **Contexto Primeiro**: Ler arquivos relevantes ANTES de fazer mudanças
3. **Incremental**: Fazer mudanças pequenas e testáveis
4. **TodoWrite**: Usar SEMPRE para tarefas com 3+ etapas
5. **Delegação de Agentes Supabase**:
   - **LOCAL**: Usar `supabase-local-expert` para desenvolvimento local (Docker, VSCode, testes)
   - **LIVE**: Usar `supabase-mcp-expert` APENAS para produção/deploy remoto
6. **Validação**: Após mudanças críticas, explicar O QUÊ mudou e POR QUÊ

## 📋 PADRÕES DE CÓDIGO
- **TypeScript**: Tipos explícitos (evitar `any`, preferir `unknown`)
- **React**: Functional components com hooks
- **Styled Components**: Usar `GlobalThemeSystem.ts` para cores/estilos
- **Imports**: Organizar (React → libs → local → types)
- **Comentários**: Só quando lógica não é óbvia
- **Naming**: camelCase (JS/TS), kebab-case (arquivos), UPPER_SNAKE (env vars)

## 🚨 REGRAS CRÍTICAS DE SEGURANÇA
- **NUNCA** coloque senhas ou credenciais em arquivos
- **SEMPRE** use variáveis de ambiente (.env)
- **SEMPRE** verifique antes de fazer commit
- Referencie credenciais como: `$SSH_PASSWORD`, `$API_KEY`

## Projeto Liftlio
**Stack**: React 19, TypeScript 4.9, Supabase, Fly.io
**Tipo**: Plataforma de monitoramento de vídeos e análise de sentimentos com AI
**Última atualização**: 11/10/2025

---

# 📚 Documentação Modular (carregada automaticamente)

@.claude/docs/CODE_STANDARDS.md
@.claude/docs/MCP_GUIDE.md
@.claude/docs/DEPLOY_GUIDE.md
@.claude/docs/TRELLO_WORKFLOW.md

---

## 🖥️ Resumo de Ambientes

### Frontend
- **Local**: `liftlio-react/` → `npm start` (localhost:3000)
- **Produção**: Fly.io → https://liftlio.com

### Backend
- **Supabase**: Project ID `suqjifkhmekcdflwowiw`
- **Analytics**: VPS 173.249.22.2 → https://track.liftlio.com

### Outros
- **Blog**: https://blog.liftlio.com (Cloudways)
- **LinkedIn**: `/LINKEDIN_CONTENT/` (system + strategy)

## 🤖 Agentes Especializados Supabase (Atualizado 26/01/2025)

### supabase-local-expert (DESENVOLVIMENTO LOCAL)
**Quando usar:** SEMPRE que estiver desenvolvendo localmente
- ✅ Criar/testar funções SQL no Docker local (porta 54322)
- ✅ Executar queries direto via `docker exec`
- ✅ Criar arquivos .sql e .test.sql
- ✅ Debugging com VSCode PostgreSQL Extension
- ✅ BEGIN/ROLLBACK para testes seguros
- ✅ Usa ultrathink para análises complexas
- ✅ Acesso total: Docker, Bash, Read, Write, Edit

**Comando:** `Task → supabase-local-expert → "cria função X localmente"`

### supabase-mcp-expert (PRODUÇÃO/LIVE)
**Quando usar:** APENAS para operações remotas em produção
- ✅ Deploy no Supabase LIVE (project_id: suqjifkhmekcdflwowiw)
- ✅ Verificar logs de produção
- ✅ Operações que PRECISAM ser remotas via MCP
- ❌ NUNCA para desenvolvimento local
- ❌ NUNCA quando trabalhando com Docker local

**Comando:** `Task → supabase-mcp-expert → "deploy função X no LIVE"`

### Workflow Recomendado:
1. **Desenvolver LOCAL** com `supabase-local-expert`
2. **Testar LOCAL** com Docker + VSCode
3. **Commit no Git** quando aprovado
4. **Deploy LIVE** com `supabase-mcp-expert`

## 🌿 Supabase Branching Workflow (Atualizado 01/11/2025)

### Estrutura de Branches com Sincronização Automática
- **main** (`suqjifkhmekcdflwowiw`): Produção, apenas updates manuais, 100% estável
- **dev** (`cdnzajygbcujwcaoswpi`): Staging persistente, auto-deploy via migrations, ambiente de teste real
- **dev-supabase-local** (Git branch): Desenvolvimento 100% local, Supabase rodando via Docker (localhost)

### 🔄 Sistema de Sincronização Git ↔ Supabase
**Script Automático**: `./switch-branch.sh [dev|main|status]`
- Troca Git branch + Supabase branch automaticamente
- Atualiza symlink `.env.development` → `.env.development.{dev|main}`
- Indicador visual no console e UI (badge colorido)
- Elimina confusão sobre qual ambiente está ativo

### Workflow de Desenvolvimento

**1. Nova Função SQL ou Modificação:**
```
a) Criar migration em /Supabase/supabase/migrations/YYYYMMDDHHMMSS_nome.sql
b) Delegar para agente MCP testar na DEV (project_id: cdnzajygbcujwcaoswpi)
c) Git commit + push para branch dev do Git
d) Verificar sucesso no Dashboard > Branches > dev
e) Merge manual para main (live) quando aprovado
```

**2. Nova Edge Function:**
```
a) Criar em /Supabase/supabase/functions/nome/index.ts
b) Deploy via MCP na DEV primeiro
c) Testar invocação
d) Deploy manual no LIVE quando aprovado
```

### 💻 Ambiente Local (Branch: dev-supabase-local)

**Setup Completo:**
- **Supabase Local**: Docker rodando 9 containers (973MB RAM - otimizado M2 8GB)
- **300 Funções SQL**: Importadas do LIVE via `supabase db dump`
- **React App**: Conecta em http://127.0.0.1:54321 (variáveis em `.env.local`)
- **Edge Functions**: Secrets configurados em `supabase/.env`
- **Studio**: http://127.0.0.1:54323

**🛡️ Sistema de Proteção de Ambientes:**
- **`.env.local`**: Arquivo EXCLUSIVO para desenvolvimento local (prioridade máxima no React)
- **Isolamento Total**: Quando existe `.env.local`, React ignora outros `.env` files
- **Docker Local**: Todas URLs apontam para localhost (impossível afetar produção)
- **Gitignored**: `.env.local` nunca vai para o GitHub
- **Failsafe**: Mesmo com erro de configuração, sempre usa localhost

**Como Usar:**
```bash
# 1. Trocar para branch local
git checkout dev-supabase-local

# 2. Iniciar Supabase (se não estiver rodando)
cd supabase && supabase start

# 3. Iniciar React
cd .. && npm start  # Usa .env.local AUTOMATICAMENTE!

# App abre em: http://localhost:3000
# Conectado em: http://127.0.0.1:54321 (local)
```

**Documentação Completa:** `/liftlio-react/supabase/SETUP_COMPLETO.md`

**Vantagens:**
- ✅ Zero risco ao ambiente LIVE
- ✅ Testes de schema/funções isolados
- ✅ Desenvolvimento offline
- ✅ Dados de teste sem afetar produção

### Versionamento e Controle

**Estrutura Oficial:**
```
/Supabase/                          ← Fonte de verdade oficial
├── supabase/
│   ├── migrations/                 ← Schema + SQL functions (versionado)
│   ├── functions/                  ← Edge Functions novas (versionado)
│   └── config.toml
├── functions_backup/               ← Histórico (315 SQL + 15 Edge já deployadas)
│   ├── SQL_Functions/              ← Referência apenas
│   └── Edge_Functions/             ← Referência apenas
└── README.md
```

**IMPORTANTE:**
- ✅ `/Supabase/` é source of truth (Git tracking completo)
- ✅ `functions_backup/` são backups históricos (NÃO aplicar como migrations)
- ✅ Agente MCP SEMPRE usa DEV primeiro (cdnzajygbcujwcaoswpi)
- ✅ LIVE só recebe mudanças após aprovação manual

### Benefícios do Sistema
- ✅ Git tracking completo (histórico, blame, revert)
- ✅ Code review antes de produção
- ✅ Rollback trivial (git revert)
- ✅ Zero risco de quebrar produção
- ✅ Ambiente de teste real (dados, crons, configs)
- ✅ Auto-deploy em dev (agilidade)

---

## Histórico de Sessões Relevantes
- **14/01/2025**: MCP Supabase totalmente funcional
- **26/07/2025**: Gmail MCP configurado via Docker
- **11/08/2025**: Análise e otimização do CLAUDE.md
- **12/08/2025**: Correções em Analytics - Unificação de tráfego orgânico como Liftlio, cores roxas aplicadas, proteção contra erros de extensões no localhost
- **13/08/2025**: Analytics Server - Configuração Cloudflare SSL Flexible, correção função track_event duplicada, documentação sobre servidor remoto, correção de tipos implícitos no GlobeVisualizationPro
- **06/10/2025**: Sistema LinkedIn unificado - TUDO consolidado em `/LINKEDIN_CONTENT/`, estratégia de 12 semanas com Curiosity Gap, dois modos (Technical + Marketing), credentials gitignored
- **07/10/2025**: Overview UX - Tooltips implementados em cards e gráficos com react-tooltip, correção SquarePaymentForm ("Pay" → "Add Card"), análise PDF feedback, cards Trello criados (UX/AI improvements + Supabase Branch backup)
- **11/10/2025**: Melhorias CLAUDE.md - Adicionado modo ultrathink permanente, filosofia de trabalho, padrões de código, guidelines de debugging/performance, documentação sobre release notes e features novas do Claude Code v2.0.14
- **12/10/2025**: Supabase Branching Workflow - Setup completo dev/main workflow, MCP configurado para branches, migração estrutural AGENTE_LIFTLIO → /Supabase/functions_backup/, Security Advisor issues fixed (RLS + search_path em 14 funções)
- **13/10/2025**: Monorepo & Branch Sync - Reorganização para estrutura monorepo (Supabase dentro de liftlio-react), script switch-branch.sh para sincronização automática Git↔Supabase, indicadores visuais de ambiente, arquivos .env.development.{dev|main} separados
- **26/01/2025**: Agentes Supabase Especializados - Criação de `supabase-local-expert` para desenvolvimento local com Docker, separação clara de `supabase-mcp-expert` para produção, sistema de DEPLOY_LOG para controle de deployments, documentação de proteção de ambientes com `.env.local`, workflow completo Local→Git→LIVE