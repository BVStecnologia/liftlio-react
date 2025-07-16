# 📚 ÍNDICE COMPLETO - FUNÇÕES MCP SUPABASE
**Atualizado em**: 13/07/2025 23:45

## 🚀 Edge Functions

### 1. **agente-liftlio** (v19)
- **Arquivo**: `Edge Functions/agente-liftlio_v19_rag_melhorado.ts.bak`
- **Descrição**: Assistente AI com Claude Sonnet + RAG otimizado
- **Features**: 
  - Busca híbrida (embeddings + keywords)
  - Cache de embeddings (15min TTL)
  - Multi-threshold progressivo
  - Debug metadata completo
- **Deploy**: Version 26+ (ativa)

### 2. **agente-liftlio** (v18 - debug)
- **Arquivo**: `Edge Functions/agente-liftlio_v18_debug_completo.ts.bak`
- **Descrição**: Versão com 32 pontos de debug
- **Uso**: Apenas para troubleshooting

### 3. **agente-liftlio** (v17)
- **Arquivo**: `Edge Functions/agente-liftlio_v17_rag_otimizado.ts.bak`
- **Descrição**: Primeira versão com RAG multi-threshold
- **Status**: Substituída pela v19

### 4. **generate-embedding**
- **Arquivo**: `Edge Functions/generate-embedding_openai.ts.bak`
- **Descrição**: Gera embeddings com OpenAI text-embedding-3-small
- **Parâmetro**: `{ text: "conteúdo" }`

## 🗄️ SQL Functions

### Sistema RAG

#### 1. **search_project_rag**
- **Arquivo**: `SQL Functions/search_project_rag_isolamento_projeto.sql`
- **Descrição**: Busca vetorial com isolamento por projeto
- **Parâmetros**:
  - `query_embedding`: vector(1536)
  - `project_filter`: int
  - `similarity_threshold`: float (0.1-1.0)
  - `match_count`: int
- **Índice**: HNSW em embedding

#### 2. **process_rag_embeddings**
- **Arquivo**: `SQL Functions/process_rag_embeddings_generic.sql`
- **Descrição**: Processa embeddings de qualquer tabela
- **Features**: 
  - Genérico para 14 tabelas
  - Marca rag_processed = true
  - Extrai metadata automaticamente

#### 3. **monitor_rag_coverage**
- **Arquivo**: `SQL Functions/monitor_rag_coverage_function.sql`
- **Descrição**: Monitora cobertura de embeddings
- **Retorna**: Estatísticas por tabela e projeto

### Sistema de Conversas

#### 4. **get_agent_conversation_history**
- **Arquivo**: `SQL Functions/get_agent_conversation_history.sql`
- **Descrição**: Busca histórico de conversas do agente
- **Isolamento**: Por user_id e project_id

### Monitoramento

#### 5. **check_tables_rag_status**
- **Arquivo**: `SQL Functions/check_tables_rag_status.sql`
- **Descrição**: Verifica status RAG de todas as tabelas
- **Retorna**: Total processado/não processado por tabela

## 📊 Tabelas com RAG Habilitado

Total: **14 tabelas** com campo `rag_processed`:

1. **Mensagens** - Menções do YouTube
2. **Comentarios_Principais** - Comentários em vídeos
3. **Respostas_Comentarios** - Respostas a comentários
4. **Videos** - Informações de vídeos
5. **Video_Analysis** - Análises de vídeos
6. **Video_Mentions** - Menções em vídeos
7. **Canais** - Informações de canais
8. **Channel_Analysis** - Análises de canais
9. **Projects** - Dados de projetos
10. **Keywords** - Palavras-chave
11. **Settings_messages_posts** - Configurações de posts
12. **Video_Queue** - Fila de vídeos
13. **schedules** - Agendamentos
14. **logs** - Logs do sistema

## 🔧 Scripts de Sistema

### 1. **00_script_completo_sistema_rag.sql**
- **Arquivo**: `SQL Functions/00_script_completo_sistema_rag.sql`
- **Descrição**: Script completo para setup do sistema RAG
- **Inclui**:
  - Criação de tabelas
  - Índices HNSW
  - Funções RPC
  - Triggers
  - Políticas RLS

## 📈 Estatísticas (13/07/2025)

- **Total Edge Functions**: 4 (3 versões agente + 1 embedding)
- **Total SQL Functions**: 6
- **Scripts de Sistema**: 1
- **Tabelas com RAG**: 14
- **Total de Embeddings** (projeto 58): 868+

## 🏷️ Tags e Categorias

- `#rag` - Funções relacionadas ao sistema RAG
- `#agent` - Funções do agente AI
- `#monitoring` - Funções de monitoramento
- `#system` - Scripts de sistema
- `#production` - Em produção
- `#debug` - Versões de debug

## 📝 Notas Importantes

1. **SEMPRE** usar SDK Supabase para chamar Edge Functions
2. **NUNCA** fazer chamadas HTTP diretas
3. Parâmetro correto para generate-embedding: `{ text: "..." }`
4. Multi-threshold recomendado: 0.7 → 0.6 → 0.5 → 0.4
5. Cache de embeddings reduz latência em ~70%

---

*Índice mantido por: Sistema de Organização MCP*  
*Última Edge Function: agente-liftlio v19 (13/07/2025)*