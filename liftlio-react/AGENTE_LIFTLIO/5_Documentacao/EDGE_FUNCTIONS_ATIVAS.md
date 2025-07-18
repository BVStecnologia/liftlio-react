# Edge Functions ATIVAS no Supabase

## ✅ Funções em Produção (NÃO APAGAR):

### 1. **agente-liftlio**
- **Descrição**: Assistente AI principal com Claude
- **Versão**: v16 (Métricas Sincronizadas com Dashboard)
- **Função**: Responde perguntas sobre projetos com dados reais
- **Última atualização**: 13/01/2025
- **Melhorias**: 
  - Métricas perfeitamente sincronizadas com dashboard
  - Usa channels_count direto (não calcula canais ativos)
  - Nova métrica: Scheduled (mensagens agendadas)
  - Métricas contextualizadas por página
  - Métricas de monitoring (views, likes, engagement)
  - Headers CORS, memória persistente, integração RAG

### 2. **generate-embedding**
- **Descrição**: Gera embeddings via OpenAI
- **Função**: Core do sistema RAG - converte texto em vetores

### 3. **process-rag-batch**
- **Descrição**: Processa RAG em lotes
- **Função**: Chamada pelo CRON a cada 5 minutos
- **Processa**: 50 registros por vez durante 2 minutos

### 4. **search-rag**
- **Descrição**: Busca semântica
- **Função**: Busca por similaridade nos embeddings

### 5. **process-rag-embeddings** (se existir)
- **Descrição**: Processamento alternativo de RAG
- **Função**: Backup/alternativa ao process-rag-batch

## ❌ Funções DELETADAS (11/01/2025):

1. **test-rag-simple** - Era apenas teste
2. **generate-project-stats** - Tinha erro, não funcionava

## 📊 Status do Sistema:
- **CRON ATIVO**: Job ID 136761
- **Execução**: A cada 5 minutos
- **Função chamada**: process-rag-batch