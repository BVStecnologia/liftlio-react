# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 REGRAS CRÍTICAS DE SEGURANÇA
- **NUNCA** coloque senhas ou credenciais em arquivos
- **SEMPRE** use variáveis de ambiente (.env)
- **SEMPRE** verifique antes de fazer commit
- Referencie credenciais como: `$SSH_PASSWORD`, `$API_KEY`

## Projeto Liftlio
**Stack**: React 19, TypeScript 4.9, Supabase, Fly.io  
**Tipo**: Plataforma de monitoramento de vídeos e análise de sentimentos com AI  
**Última atualização**: 13/08/2025

## 🖥️ Servidores e Ambientes

### Frontend Principal
- **Local**: `/liftlio-react/` (desenvolvimento)
- **Produção**: Fly.io (app: liftlio, região: sjc)
- **URL**: https://liftlio.com

### Analytics Server (SERVIDOR REMOTO!)
- **Código-fonte**: `/Servidor/analytics/` (apenas código, NÃO roda local)
- **Servidor Remoto**: 173.249.22.2 (VPS Linux)
- **Container**: Docker `liftlio-analytics-prod`
- **URL Pública**: https://track.liftlio.com (via Cloudflare)
- **⚠️ IMPORTANTE**: Alterações em `/Servidor/analytics/` precisam ser deployadas via SSH no servidor remoto!

### WordPress/Blog
- **URL**: https://blog.liftlio.com
- **Server**: Cloudways (wordpress-1319296-5689133.cloudwaysapps.com)
- **Acesso**: Via MCP WordPress tools

## Comandos Essenciais

```bash
# Desenvolvimento
cd liftlio-react
npm install --legacy-peer-deps  # Necessário devido a conflitos de peer deps
npm start                        # Inicia em localhost:3000
npm run build                    # Build de produção
npm test                         # Executa testes

# Deploy
fly deploy                       # Deploy para Fly.io (região: sjc)

# Git (sempre verificar senhas antes)
git add .
git commit -m "descrição"
git push
```

## Arquitetura

### Frontend (React + TypeScript)
```
liftlio-react/
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── FloatingAgent.tsx  # Assistente AI flutuante
│   │   └── ui/                # Componentes UI base
│   ├── pages/              # Rotas principais (lazy loaded)
│   ├── context/            # Context providers
│   │   ├── AuthContext.tsx    # OAuth Google
│   │   ├── ThemeContext.tsx   # Tema claro/escuro
│   │   ├── LanguageContext.tsx # PT/EN
│   │   └── ProjectContext.tsx  # Gestão de projetos
│   ├── styles/
│   │   └── GlobalThemeSystem.ts # Sistema unificado de temas
│   └── lib/
│       ├── supabaseClient.ts  # Cliente Supabase
│       └── posthog.tsx         # Analytics
```

### Backend (Supabase)
- **Project ID**: `suqjifkhmekcdflwowiw`
- **PostgreSQL** com RLS habilitado
- **Edge Functions** em Deno
- **pgvector** para embeddings
- **Realtime** para atualizações
- **Storage** para arquivos

### Deployment
- **Fly.io**: App `liftlio`, região `sjc`
- **Docker**: Multi-stage build com Node 20 + Nginx
- **Build**: `npm run build` com `--legacy-peer-deps`

## 🔥 MCP (Model Context Protocol) - USE SEMPRE!

### Supabase MCP - Capacidades
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

### Organização de Funções MCP
**Após criar/modificar qualquer função, SEMPRE:**
1. Salvar cópia em `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/`
   - Edge Functions: `Edge_Functions/nome-funcao.ts`
   - SQL Functions: `SQL_Functions/nome_funcao.sql`
2. Atualizar documentação em `/AGENTE_LIFTLIO/5_Documentacao/INDICE_COMPLETO.md`

## Sistema de Agente AI (v68)
**Localização**: `/liftlio-react/AGENTE_LIFTLIO/`
- **Edge Function**: `agente-liftlio` (linguagem natural, sem gatilhos)
- **Sistema RAG**: Embeddings OpenAI em 14 tabelas
- **Modelo Claude**: Sempre usar `claude-sonnet-4-20250514`
- **SDK Supabase**: SEMPRE usar `supabase.functions.invoke()`

## Integração Trello MCP

### Configuração
- **Board Principal**: Liftlio (ID: `686b43ced8d30f8eb12b9d12`)
- **Listas do Valdair**:
  - Pendentes: `686b4422d297ee28b3d92163`
  - Em andamento: `686b4ad61da133ac3b998284`
  - Completadas: `686b442bd7c4de1dbcb52ba8`

### 📸 REGRA: Imagens são OBRIGATÓRIAS
```typescript
// SEMPRE faça isso ao criar card:
const card = await mcp__trello__add_card_to_list({...});
await mcp__trello__attach_image_to_card({
  cardId: card.id,
  imageUrl: "url_da_imagem"
});
```

## Integração WordPress MCP
- **URL**: `https://wordpress-1319296-5689133.cloudwaysapps.com/`
- **Usuário**: MCP claude
- **Blog**: `blog.liftlio.com`
- Use ferramentas `mcp__wordpress__*` para todas operações

## Variáveis de Ambiente Necessárias
```bash
# .env (nunca commitar!)
REACT_APP_GOOGLE_CLIENT_ID=xxx
REACT_APP_GOOGLE_CLIENT_SECRET=xxx
REACT_APP_SUPABASE_URL=xxx
REACT_APP_SUPABASE_ANON_KEY=xxx
```

## Dependências Principais
- React 19.0.0
- TypeScript 4.9.5
- @supabase/supabase-js 2.49.1
- styled-components 6.1.15
- framer-motion 12.16.0
- react-router-dom 7.2.0
- recharts 2.15.1
- posthog-js 1.258.5

## Testes e Qualidade
```bash
npm test                    # Jest + React Testing Library
# Não há linter/formatter configurado atualmente
# ESLint config existe mas sem scripts npm
```

## Documentação Adicional
- `/liftlio-react/project-docs/` - Documentação do projeto
- `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/` - Docs do agente AI
- `/liftlio-react/README.md` - Setup inicial

## Notas Importantes
- Use `--legacy-peer-deps` ao instalar dependências
- Autenticação via OAuth Google apenas
- Claude API key como `CLAUDE_API_KEY` no Vault
- OpenAI API key como `OPENAI_API_KEY` no Vault
- Fly.io configurado com auto-stop/start para economia

## 📊 Sistema de Analytics (track.liftlio.com)

### Arquitetura
- **Servidor**: VPS Linux em 173.249.22.2 (NÃO local!)
- **Proxy**: Cloudflare com SSL Flexible (Configuration Rule específica)
- **Container**: Docker rodando `liftlio-analytics-prod`
- **Banco**: Tabela `analytics` no Supabase
- **RPC**: Função `track_event` para inserir eventos

### Como Usar
```html
<!-- Tag de tracking para sites -->
<script async src="https://track.liftlio.com/t.js" data-id="58"></script>
```

### Troubleshooting Analytics
- **Erro 521**: Verificar Configuration Rule no Cloudflare (SSL = Flexible)
- **Eventos não salvam**: Verificar função RPC `track_event` (pode ter duplicatas)
- **Bot detected**: Servidor tem proteção anti-bot agressiva

### Deploy de Mudanças
```bash
# NO SERVIDOR REMOTO (não local!)
ssh root@173.249.22.2
cd /opt/liftlio-analytics
git pull
docker-compose down && docker-compose up -d --build
```

## Histórico de Sessões Relevantes
- **14/01/2025**: MCP Supabase totalmente funcional
- **26/07/2025**: Gmail MCP configurado via Docker
- **11/08/2025**: Análise e otimização do CLAUDE.md
- **12/08/2025**: Correções em Analytics - Unificação de tráfego orgânico como Liftlio, cores roxas aplicadas, proteção contra erros de extensões no localhost
- **13/08/2025**: Analytics Server - Configuração Cloudflare SSL Flexible, correção função track_event duplicada, documentação sobre servidor remoto, correção de tipos implícitos no GlobeVisualizationPro