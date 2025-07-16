# Arquitetura do Sistema RAG - Liftlio

## 🏗️ Como o Sistema Funciona (ATUALIZADO 12/01/2025)

### Nova Arquitetura: SQL Orquestra Tudo (~40% mais rápido)

O sistema agora usa **SQL como orquestrador principal**:

```
┌─────────────────┐
│   CRON (SQL)    │ ──── A cada 5 minutos
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ process_rag_batch_sql()  │ ──── SQL Function (Orquestra)
│ (Processa 50 registros)  │
└────────┬─────────────────┘
         │
         ├──► prepare_rag_content_* (SQL Functions)
         │    └── Prepara conteúdo de cada tabela
         │
         ├──► generate-embedding (Edge Function via HTTP)
         │    └── Apenas para chamar OpenAI API
         │
         └──► INSERT rag_embeddings (SQL)
              └── Salva embeddings no banco
```

### Mudança Principal:
- **Antes**: CRON → Edge → SQL (2 invocações)
- **Agora**: CRON → SQL → Edge (1 invocação, só para embeddings)

## 📝 Divisão de Responsabilidades

### Edge Functions (JavaScript/Deno):
1. ~~**process-rag-batch**~~ - Substituída por SQL (mantida para backup)
2. **generate-embedding** - Integração com OpenAI API
3. **agente-liftlio** - Interface com Claude API
4. **search-rag** - Busca semântica

### SQL Functions (PostgreSQL):
1. **process_rag_batch_sql** ⭐ - NOVA! Orquestra todo o processamento
2. **prepare_rag_content_mensagens** - Prepara conteúdo de Mensagens
3. **prepare_rag_content_videos** - Prepara conteúdo de Videos
4. **prepare_rag_content_comentarios_principais** - Prepara conteúdo de Comentários
5. **prepare_rag_content_respostas_comentarios** - Prepara conteúdo de Respostas
6. **prepare_rag_content_canais** - Prepara conteúdo de Canais
7. **prepare_rag_content_estatisticas_videos** - Prepara estatísticas
8. **prepare_rag_content_videos_transcricao** - Prepara transcrições
9. **prepare_rag_content_usuarios** - Prepara dados de usuários
10. **prepare_rag_content_palavras_chave** - Prepara palavras-chave
11. **prepare_rag_content_analise_sentimentos** - Prepara análises

## 🔄 Fluxo de Processamento (NOVO!)

1. **CRON dispara** → executa `SELECT process_rag_batch_sql()`
2. **process_rag_batch_sql** (SQL Function):
   - Busca 50 registros não processados
   - Para cada registro:
     - Chama prepare_rag_content_* (SQL)
     - Chama generate-embedding via HTTP (Edge)
     - Salva embedding no banco
     - Marca como processado
3. **Executa uma vez** e retorna estatísticas

## 💡 Por que Edge + SQL?

- **Edge Functions**: Melhor para APIs externas (OpenAI, Claude)
- **SQL Functions**: Melhor para manipulação de dados
- **Juntas**: Aproveitam o melhor de cada tecnologia

## 🚀 Performance (MELHORADA!)

- **Antes (Edge→SQL)**: ~65 registros/minuto
- **Agora (SQL→Edge)**: ~100 registros/minuto
- **Melhoria**: ~40% mais rápido
- **Teste real**: 50 registros em < 1 segundo

## 📊 Monitoramento

```sql
-- Ver progresso
SELECT * FROM get_rag_processing_status();

-- Ver estatísticas
SELECT * FROM get_rag_embeddings_stats();

-- Ver logs do CRON
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-rag-embeddings' 
ORDER BY start_time DESC 
LIMIT 10;
```