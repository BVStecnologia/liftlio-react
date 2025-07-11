# 📑 Índice Completo - Funções MCP

## 📂 Estrutura da Pasta

```
Funcoes criadas MCP/
├── README.md                    # Este arquivo
├── MELHORES_PRATICAS_MCP.md    # Guia de boas práticas
├── INDICE_COMPLETO.md          # Índice de tudo (você está aqui)
├── Edge Functions/             
│   ├── README.md               # Sobre Edge Functions
│   ├── agente-liftlio_assistente_ai_claude.ts.bak
│   ├── process-rag-embeddings_processar_embeddings_em_batch.ts.bak
│   └── search-rag_busca_semantica_embeddings.ts.bak
└── SQL Functions/
    ├── 00_script_completo_todas_funcoes_rag.sql
    ├── search_rag_embeddings_busca_semantica_basica.sql
    ├── search_rag_embeddings_filtered_busca_com_filtros.sql
    └── idx_rag_embeddings_vector_indice_performance.sql
```

## 🚀 Edge Functions Disponíveis

### 1. agente-liftlio
- **Arquivo**: `agente-liftlio_assistente_ai_claude.ts.bak`
- **Endpoint**: `/agente-liftlio`
- **Descrição**: Assistente AI com Claude
- **Status**: ✅ Deployado e funcionando

### 2. process-rag-embeddings
- **Arquivo**: `process-rag-embeddings_processar_embeddings_em_batch.ts.bak`
- **Endpoint**: `/process-rag-embeddings`
- **Descrição**: Processa embeddings em batch
- **Status**: ✅ Deployado e funcionando

### 3. search-rag
- **Arquivo**: `search-rag_busca_semantica_embeddings.ts.bak`
- **Endpoint**: `/search-rag`
- **Descrição**: Busca semântica nos embeddings
- **Status**: ✅ Deployado (usando busca por keywords temporária)

## 🗄️ SQL Functions Disponíveis

### 1. search_rag_embeddings
- **Arquivo**: `search_rag_embeddings_busca_semantica_basica.sql`
- **Tipo**: Function
- **Parâmetros**: `(vector(1536), float, int)`
- **Descrição**: Busca semântica básica

### 2. search_rag_embeddings_filtered
- **Arquivo**: `search_rag_embeddings_filtered_busca_com_filtros.sql`
- **Tipo**: Function
- **Parâmetros**: `(vector(1536), float, int, text[])`
- **Descrição**: Busca com filtro de tabelas

### 3. idx_rag_embeddings_vector
- **Arquivo**: `idx_rag_embeddings_vector_indice_performance.sql`
- **Tipo**: Index
- **Tabela**: `rag_embeddings`
- **Descrição**: Índice HNSW para performance

### 4. Script Completo
- **Arquivo**: `00_script_completo_todas_funcoes_rag.sql`
- **Descrição**: Executa todas as funções SQL de uma vez

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

---

*Última atualização: 10/01/2025*