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
5. **Delegação MCP**: SEMPRE delegar ferramentas Supabase MCP para agente especializado
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

## Histórico de Sessões Relevantes
- **14/01/2025**: MCP Supabase totalmente funcional
- **26/07/2025**: Gmail MCP configurado via Docker
- **11/08/2025**: Análise e otimização do CLAUDE.md
- **12/08/2025**: Correções em Analytics - Unificação de tráfego orgânico como Liftlio, cores roxas aplicadas, proteção contra erros de extensões no localhost
- **13/08/2025**: Analytics Server - Configuração Cloudflare SSL Flexible, correção função track_event duplicada, documentação sobre servidor remoto, correção de tipos implícitos no GlobeVisualizationPro
- **06/10/2025**: Sistema LinkedIn unificado - TUDO consolidado em `/LINKEDIN_CONTENT/`, estratégia de 12 semanas com Curiosity Gap, dois modos (Technical + Marketing), credentials gitignored
- **07/10/2025**: Overview UX - Tooltips implementados em cards e gráficos com react-tooltip, correção SquarePaymentForm ("Pay" → "Add Card"), análise PDF feedback, cards Trello criados (UX/AI improvements + Supabase Branch backup)
- **11/10/2025**: Melhorias CLAUDE.md - Adicionado modo ultrathink permanente, filosofia de trabalho, padrões de código, guidelines de debugging/performance, documentação sobre release notes e features novas do Claude Code v2.0.14