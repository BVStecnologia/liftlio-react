# 📑 Índice Completo - Funções MCP

## 📂 Estrutura da Pasta

```
AGENTE_LIFTLIO/MCP_Functions/
├── README.md                    # Este arquivo
├── MELHORES_PRATICAS_MCP.md    # Guia de boas práticas
├── INDICE_COMPLETO.md          # Índice de tudo (você está aqui)
├── Edge_Functions/             
│   ├── agente-liftlio_assistente_ai_claude.ts.bak
│   └── generate-embedding_gerar_embeddings_openai.ts.bak
└── SQL_Functions/
    ├── process_rag_embeddings_consolidada.sql
    ├── generate_openai_embedding_via_http.sql
    ├── search_rag_embeddings_busca_semantica_basica.sql
    └── [outras funções SQL mantidas]
```

## 🚀 Edge Functions Disponíveis

### 1. agente-liftlio
- **Arquivo**: `agente-liftlio_assistente_ai_claude.ts.bak`
- **Endpoint**: `/agente-liftlio`
- **Descrição**: Assistente AI com Claude
- **Status**: ✅ Deployado e funcionando

### 2. generate-embedding ⭐ NOVA
- **Arquivo**: `generate-embedding_gerar_embeddings_openai.ts.bak`
- **Endpoint**: `/generate-embedding`
- **Descrição**: Função minimalista para gerar embeddings
- **Status**: ✅ Deployado - Substitui todas as funções duplicadas
- **Nota**: Esta é a ÚNICA Edge Function necessária para embeddings

### ✅ Edge Functions Limpas (11/01/2025)
Removemos 11 Edge Functions duplicadas do RAG, mantendo apenas as 2 essenciais.

## 🗄️ SQL Functions Disponíveis

### 1. process_rag_embeddings ⭐ NOVA CONSOLIDADA
- **Arquivo**: `process_rag_embeddings_consolidada.sql`
- **Tipo**: Function
- **Parâmetros**: `(table_name TEXT, project_id BIGINT, limit INT, force_update BOOL)`
- **Descrição**: Função ÚNICA para processar embeddings de qualquer tabela
- **Status**: ✅ Substitui todas as funções de processamento

### 2. search_rag_unified ⭐ NOVA
- **Arquivo**: Incluída na migration
- **Tipo**: Function
- **Parâmetros**: `(query_embedding vector, project_id BIGINT, limit INT, threshold FLOAT)`
- **Descrição**: Busca unificada com isolamento por projeto

### 3. generate_openai_embedding
- **Arquivo**: `generate_openai_embedding_via_http.sql`
- **Tipo**: Function
- **Parâmetros**: `(text TEXT, api_key TEXT)`
- **Descrição**: Gera embeddings via HTTP direto do SQL

### 4. search_project_rag
- **Arquivo**: Já existe no banco
- **Tipo**: Function
- **Descrição**: Busca com isolamento por projeto (funcional)

### 5. idx_rag_embeddings_vector
- **Arquivo**: `idx_rag_embeddings_vector_indice_performance.sql`
- **Tipo**: Index
- **Tabela**: `rag_embeddings`
- **Descrição**: Índice HNSW para performance

## 📊 Tabelas com RAG Habilitado

| Tabela | Campos RAG | Total Registros |
|--------|------------|-----------------|
| Comentarios_Principais | rag_processed, rag_processed_at | 690 |
| Mensagens | rag_processed, rag_processed_at | 688 |
| Videos | rag_processed, rag_processed_at | 96 |
| Videos_trancricao | rag_processed, rag_processed_at | 211 |
| Respostas_Comentarios | rag_processed, rag_processed_at | 471 |
| Scanner de videos do youtube | rag_processed, rag_processed_at | 53 |
| Canais do youtube | rag_processed, rag_processed_at | 29 |
| Projeto | rag_processed, rag_processed_at | 6 |
| Integrações | rag_processed, rag_processed_at | 5 |
| cards | rag_processed, rag_processed_at | 4 |
| customers | rag_processed, rag_processed_at | 2 |
| payments | rag_processed, rag_processed_at | 2 |
| subscriptions | rag_processed, rag_processed_at | 2 |
| Notificacoes | rag_processed, rag_processed_at | 1 |

**Total**: 2.260 registros prontos para processamento

## 🔑 Variáveis de Ambiente Configuradas

- `OPENAI_API_KEY` - No Supabase Vault
- `ANTHROPIC_API_KEY` - No Supabase Vault
- `SUPABASE_URL` - Automático
- `SUPABASE_ANON_KEY` - Automático
- `SUPABASE_SERVICE_ROLE_KEY` - Automático

## 🔗 Links Úteis

- **Supabase Dashboard**: [https://suqjifkhmekcdflwowiw.supabase.co](https://suqjifkhmekcdflwowiw.supabase.co)
- **Edge Functions Base URL**: `https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/`
- **GitHub Repo**: [https://github.com/BVStecnologia/liftlio-react](https://github.com/BVStecnologia/liftlio-react)

## 📝 Como Usar

1. **Para Edge Functions**: Copie o conteúdo do arquivo `.ts.bak` quando precisar
2. **Para SQL Functions**: Execute o conteúdo do arquivo `.sql` no SQL Editor
3. **Para tudo RAG**: Use o script `00_script_completo_todas_funcoes_rag.sql`

## 🔄 Consolidação Realizada (11/01/2025)

### Antes (Múltiplas funções duplicadas):
- 5 Edge Functions para processar RAG
- 3 Edge Functions para buscar
- Funções SQL separadas por tabela

### Depois (Minimalista e eficiente):
- **1 Edge Function**: `generate-embedding` (apenas gera embeddings)
- **1 SQL Function**: `process_rag_embeddings` (processa qualquer tabela)
- **1 SQL Function**: `search_rag_unified` (busca unificada)

### Benefícios:
- 🚀 **Performance**: SQL é mais rápido que Edge Functions
- 💰 **Custo**: Menos funções = menos manutenção
- 🎯 **Simplicidade**: Uma função faz tudo
- 🔧 **Manutenibilidade**: Código centralizado

---

*Última atualização: 11/01/2025*