# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md - Memória do Projeto Liftlio

## Informações do Projeto
- **Nome**: Liftlio
- **Tipo**: Plataforma de monitoramento de vídeos e análise de sentimentos
- **Stack**: React, TypeScript, Supabase
- **Data de criação deste arquivo**: 05/06/2025
- **Última atualização**: 14/01/2025

## Comandos de Desenvolvimento

### Setup Inicial
```bash
# Instalar dependências
cd liftlio-react
npm install

# Criar arquivo .env com as variáveis necessárias:
# REACT_APP_GOOGLE_CLIENT_ID=seu-client-id-do-google
# REACT_APP_GOOGLE_CLIENT_SECRET=seu-client-secret-do-google
```

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento (porta 3000)
npm start

# Build para produção
npm run build

# Executar testes
npm test

# Deploy para Fly.io
npm run deploy
```

### Git Workflow
```bash
# Atualizar repositório local
git fetch --all
git reset --hard origin/main

# Commit e push
git add .
git commit -m "Descrição das alterações"
git push
```

## Arquitetura do Projeto

### Frontend (React + TypeScript)
```
liftlio-react/src/
├── components/         # Componentes reutilizáveis
│   ├── FloatingAgent.tsx  # Assistente AI flutuante
│   └── ui/               # Componentes de UI básicos
├── pages/              # Páginas/rotas principais
├── context/            # Context providers
│   ├── AuthContext.tsx   # Autenticação
│   ├── ThemeContext.tsx  # Tema claro/escuro
│   ├── LanguageContext.tsx # Multi-idioma
│   └── ProjectContext.tsx  # Projetos do usuário
├── hooks/              # Custom React hooks
├── styles/             # Sistema de estilos
│   └── GlobalThemeSystem.ts # Sistema unificado de temas
├── lib/               
│   └── supabaseClient.ts # Cliente Supabase configurado
└── utils/              # Funções utilitárias
```

### Backend (Supabase)
- **PostgreSQL**: Banco de dados principal com RLS
- **Edge Functions**: Lógica serverless em Deno
- **pgvector**: Busca vetorial para embeddings
- **Realtime**: Atualizações em tempo real
- **Storage**: Armazenamento de arquivos

### Sistema de Agente AI
**Localização**: `/liftlio-react/AGENTE_LIFTLIO/`
- Edge Function `agente-liftlio` (v22 em produção)
- Sistema RAG com embeddings OpenAI
- Busca semântica em 14 tabelas
- Memória persistente de conversas

## 🔥 REGRA #1: USE MCP PARA TUDO NO SUPABASE!
**MCP Supabase está TOTALMENTE FUNCIONAL e pode fazer QUASE TUDO:**
- ✅ Deploy de Edge Functions
- ✅ Criar/modificar funções SQL
- ✅ Executar queries
- ✅ Debug e logs
- ❌ Apenas não pode: criar tabelas, modificar RLS

**SEMPRE TENTE MCP PRIMEIRO!**

## Configurações MCP
- **SQLite configurado**: Sim
- **Caminho do banco**: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-memory.db`
- **Status**: Funcionando corretamente
- **Supabase MCP**: Configurado e funcionando
- **Project ID Liftlio**: `suqjifkhmekcdflwowiw`

## 🚀 CAPACIDADES MCP SUPABASE - O QUE POSSO FAZER

### ✅ O que POSSO fazer via MCP:

#### 1. **Gerenciamento de Projetos e Organizações** (feature group: `account`)
- `list_projects`: Listar todos os projetos Supabase
- `get_project`: Obter detalhes de um projeto
- `create_project`: Criar novo projeto Supabase
- `pause_project`: Pausar um projeto
- `restore_project`: Restaurar um projeto pausado
- `list_organizations`: Listar organizações do usuário
- `get_organization`: Obter detalhes de uma organização

#### 2. **Banco de Dados** (feature group: `database`)
- `list_tables`: Listar tabelas em schemas específicos
- `list_extensions`: Listar extensões do banco
- `list_migrations`: Listar migrações aplicadas
- `apply_migration`: Aplicar migração SQL (DDL)
- `execute_sql`: Executar SQL (queries, DML)

#### 3. **Edge Functions** (feature group: `functions`)
- `list_edge_functions`: Listar Edge Functions do projeto
- `deploy_edge_function`: **Deploy de Edge Functions** ✨

#### 4. **Branching** (feature group: `branching`)
- `create_branch`: Criar branch de desenvolvimento
- `list_branches`: Listar branches
- `delete_branch`: Deletar branch
- `merge_branch`: Merge de branch para produção
- `reset_branch`: Resetar branch para versão anterior
- `rebase_branch`: Rebase em produção

#### 5. **Storage** (feature group: `storage` - desabilitado por padrão)
- `list_storage_buckets`: Listar buckets
- `get_storage_config`: Obter configuração storage
- `update_storage_config`: Atualizar config (plano pago)

#### 6. **Debug e Logs** (feature group: `debug`)
- `get_logs`: Obter logs por tipo de serviço
  - API, Postgres, Edge Functions, Auth, Storage, Realtime

#### 7. **Desenvolvimento** (feature group: `development`)
- `get_project_url`: Obter URL da API
- `get_anon_key`: Obter chave anônima
- `generate_typescript_types`: Gerar tipos TypeScript

#### 8. **Documentação** (feature group: `docs`)
- `search_docs`: Buscar na documentação Supabase

#### 9. **Custos** (sempre disponível)
- `get_cost`: Obter custo de projeto/branch
- `confirm_cost`: Confirmar entendimento de custos

### 🔒 Modos de Segurança:

1. **Read-Only Mode** (`--read-only`)
   - Previne operações de escrita no banco
   - Afeta apenas `execute_sql` e `apply_migration`
   - Recomendado por padrão

2. **Project Scoping** (`--project-ref=<id>`)
   - Limita acesso a um único projeto
   - Remove ferramentas de nível de conta
   - Maior segurança e isolamento

3. **Feature Groups** (`--features=database,docs`)
   - Habilita apenas grupos específicos
   - Reduz superfície de ataque
   - Grupos: `account`, `database`, `debug`, `development`, `docs`, `functions`, `storage`, `branching`

### ❌ O que NÃO POSSO fazer via MCP:
1. **Modificar tabelas existentes** (ALTER TABLE) - use Dashboard
2. **Criar/deletar tabelas** (CREATE/DROP TABLE) - use Dashboard
3. **Modificar RLS policies** - use Dashboard
4. **Acessar Vault/Secrets diretamente** - use Dashboard
5. **Modificar configurações do projeto** - use Dashboard
6. **Ver logs antigos** (apenas último minuto disponível)

### 📝 IMPORTANTE:
- **SEMPRE uso MCP** para criar/modificar funções SQL e Edge Functions
- **Para tabelas/RLS**: Preciso que você faça no Supabase Dashboard
- **Deploy de Edge Functions**: Agora possível via `deploy_edge_function`!
- **Segurança**: Sempre use `--read-only` e `--project-ref` em produção
- **Documentação completa**: `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/MCP_CAPACIDADES_COMPLETAS.md`

### 🚨 ATENÇÃO - MCP É EXTREMAMENTE PODEROSO!
**HOJE (14/01/2025) FIZEMOS TUDO VIA MCP:**
- ✅ Corrigimos função SQL complexa (search_rag_enhanced)
- ✅ Deploy de Edge Function v23 com sucesso
- ✅ Executamos queries de debug e teste
- ✅ Identificamos o projeto correto
- ✅ TUDO sem precisar do Dashboard!

**PROJETO LIFTLIO ID CORRETO**: `suqjifkhmekcdflwowiw`

### 🎯 EXEMPLOS DE USO MCP:

```typescript
// Listar projetos
await mcp__supabase__list_projects();

// Criar função SQL
await mcp__supabase__apply_migration({
  project_id: "tndyxqsgjcbqvxkuuooc",
  name: "add_new_function",
  query: "CREATE OR REPLACE FUNCTION..."
});

// Executar query (modo read-only recomendado)
await mcp__supabase__execute_sql({
  project_id: "tndyxqsgjcbqvxkuuooc", 
  query: "SELECT * FROM tabela WHERE id = 1"
});

// Deploy de Edge Function
await mcp__supabase__deploy_edge_function({
  project_id: "tndyxqsgjcbqvxkuuooc",
  name: "minha-funcao",
  files: [{
    name: "index.ts",
    content: "// código da função"
  }]
});

// Buscar logs
await mcp__supabase__get_logs({
  project_id: "tndyxqsgjcbqvxkuuooc",
  service: "edge-function"
});

// Gerar tipos TypeScript
await mcp__supabase__generate_typescript_types({
  project_id: "tndyxqsgjcbqvxkuuooc"
});
```

## 🗂️ PADRÃO DE ORGANIZAÇÃO DE FUNÇÕES MCP (OBRIGATÓRIO)

### REGRAS ABSOLUTAS - SEMPRE SEGUIR:

1. **ANTES de criar qualquer função via MCP**:
   - Consultar `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/MELHORES_PRATICAS_MCP.md`
   - Consultar `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/MCP_CAPACIDADES_COMPLETAS.md`
   - Verificar se já existe função similar
   - Usar DROP IF EXISTS ou CREATE OR REPLACE

2. **DURANTE a criação**:
   - Seguir as melhores práticas documentadas
   - Adicionar comentários e documentação no código
   - Para Edge Functions: usar `mcp__supabase__deploy_edge_function`
   - Testar antes de confirmar como finalizado

3. **DEPOIS de criar/modificar/deletar**:
   - Salvar IMEDIATAMENTE cópia na pasta correspondente:
     ```
     /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/
     ├── Edge_Functions/
     │   └── nome-funcao_descricao_curta.ts
     └── SQL_Functions/
         └── nome_funcao_descricao_curta.sql
     ```
   - Atualizar `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/INDICE_COMPLETO.md`
   - Se for um sistema novo, criar `00_script_completo_sistema.sql`

### Nomenclatura Obrigatória:
- **Edge Functions**: `nome-da-funcao_descricao_em_portugues.ts.bak`
- **SQL Functions**: `nome_da_funcao_descricao_em_portugues.sql`
- **Scripts Completos**: `00_script_completo_nome_sistema.sql`

### Fluxo de Trabalho MCP:
1. Usuário pede para criar/modificar algo no Supabase
2. Claude consulta melhores práticas
3. Claude cria/modifica via MCP
4. Claude salva cópia na pasta organizada
5. Claude atualiza índice e documentação
6. Claude confirma sucesso ao usuário

### Espelhamento:
- A pasta MCP deve ser um ESPELHO EXATO do que está no Supabase
- Se deletar no Supabase → remover arquivo da pasta
- Se modificar no Supabase → atualizar arquivo na pasta
- Se criar no Supabase → criar arquivo na pasta

## Sistema RAG - Embeddings
- **Status**: Implementado e funcionando
- **Edge Functions**:
  - `agente-liftlio`: Assistente AI com Claude (v5 - usa SDK Supabase)
  - `generate-embedding`: Gera embeddings com OpenAI
- **SQL Functions**:
  - `search_project_rag`: Busca com isolamento por projeto
  - `process_rag_embeddings`: Processa embeddings de qualquer tabela
  - Índice HNSW para performance
- **Tabelas com RAG**: 14 tabelas configuradas com campos `rag_processed`

## 🚨 REGRA OBRIGATÓRIA - SDK SUPABASE
**SEMPRE** usar o SDK do Supabase (`supabase.functions.invoke()`) para chamar Edge Functions:
- No frontend: `await supabase.functions.invoke('nome-funcao', { body: { params } })`
- Nas Edge Functions: `await supabase.functions.invoke('outra-funcao', { body: { params } })`
- **NUNCA** usar HTTP direto ou fetch manual - SDK é a melhor prática!

## Notas Importantes
- O projeto usa Supabase como backend
- Autenticação via OAuth (Google)
- Deploy configurado via Fly.io
- OpenAI API key configurada no Supabase Vault como `OPENAI_API_KEY`
- Claude API key configurada como `CLAUDE_API_KEY` (NÃO usar ANTHROPIC_API_KEY)

## Arquivos Importantes do Projeto
- `/liftlio-react/AGENTE_LIFTLIO/`: **📌 TUDO relacionado ao agente AI fica SEMPRE aqui**
  - Documentação, código, planos, testes
  - Edge Functions do agente
  - Funções SQL do agente
  - Status e resumos de implementação
  - **MCP_Functions/**: TODAS as funções criadas via MCP ficam aqui
- `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/`: Documentação essencial
  - `MELHORES_PRATICAS_MCP.md`: Guia de boas práticas
  - `MCP_CAPACIDADES_COMPLETAS.md`: TUDO que o MCP pode fazer
  - `INDICE_COMPLETO.md`: Índice de todas as funções
  - `LIMITACOES_MCP_SUPABASE.md`: O que MCP pode/não pode fazer

## Histórico de Sessões
- **05/06/2025 15:10**: Teste de persistência após reinicialização - MCP funcionando
- **09/01/2025**: Implementação do agente AI com Claude
- **10/01/2025**: Sistema RAG completo com embeddings e busca semântica
- **11/01/2025**: Migração para SDK Supabase, integração RAG no agente, reorganização MCP

## Última Sessão
- **Data**: 16/01/2025
- **Contexto**: Remoção das informações sobre MCP WordPress do CLAUDE.md
- **Status**: ✅ Informações removidas com sucesso

## Integração Trello - Gestão de Tarefas via MCP

### 🚨 REGRA CRÍTICA SOBRE TRELLO.md 🚨
**TRELLO.md é DOCUMENTAÇÃO de como usar o MCP do Trello**
- **NUNCA editar TRELLO.md para atualizar status** - é apenas manual
- **SEMPRE usar MCP Trello** - nunca APIs diretas ou curl
- **TRELLO.md = manual de instruções do MCP**
- **Board Principal**: Liftlio (ID: `686b43ced8d30f8eb12b9d12`)

### Como Funciona
1. **MCP Trello está SEMPRE disponível** com ferramentas `mcp__trello__*`
2. **Consultar TRELLO.md** para ver lista completa de ferramentas e exemplos
3. **Usar ferramentas MCP** para todas as operações em tempo real

### Listas de Tarefas do Valdair
- **"Valdair"** (ID: `686b4422d297ee28b3d92163`): Tarefas pendentes
- **"Valdair Is Working On it"** (ID: `686b4ad61da133ac3b998284`): Em andamento
- **"Completed"** (ID: `686b442bd7c4de1dbcb52ba8`): Completadas

### Comandos Rápidos
- **"listar tarefas pendentes"** → `mcp__trello__get_cards_by_list_id` na lista Valdair
- **"o que estou fazendo"** → `mcp__trello__get_cards_by_list_id` na lista Working On
- **"criar tarefa X"** → `mcp__trello__add_card_to_list` com nome em inglês
- **"trabalhando em X"** → `mcp__trello__move_card` para Working On
- **"completei X"** → `mcp__trello__move_card` para Completed

### Regras
- **Cards sempre em inglês** (título, descrição, comentários)
- **Comunicação em português** no VS Code
- **Sempre usar MCP** - está configurado e funcionando

## Integração WordPress - Site Liftlio

### 🎯 MCP WordPress Configurado
- **Status**: ✅ Funcionando com InstaWP MCP Server
- **URL**: `https://wordpress-1319296-5689133.cloudwaysapps.com/`
- **Usuário**: MCP claude
- **Uso**: Construir e gerenciar a página inicial do Liftlio

### Como Usar
- **Criar/editar páginas**: `mcp__wordpress__create_page`, `mcp__wordpress__update_page`
- **Gerenciar posts**: `mcp__wordpress__list_posts`, `mcp__wordpress__create_post`
- **Mídia**: `mcp__wordpress__create_media`, `mcp__wordpress__list_media`
- **Plugins**: `mcp__wordpress__search_plugin_repository`, `mcp__wordpress__create_plugin`

### Página Inicial Liftlio
- **Construída via MCP WordPress**
- **Sempre usar ferramentas MCP** para edições
- **Não editar diretamente** no dashboard WordPress