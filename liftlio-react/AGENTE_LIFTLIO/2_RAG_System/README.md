# 🔍 Camada 2: RAG System

## Status: 🔄 Em Desenvolvimento

### Visão Geral
Sistema de Retrieval-Augmented Generation que permite ao agente acessar dados específicos do projeto através de busca semântica.

## 🎯 Objetivos

### O que vai fazer:
- 🔄 Buscar em documentação específica
- 🔄 Acessar dados do projeto em tempo real
- 🔄 Consultar histórico de conversas
- 🔄 Responder com contexto preciso
- 🔄 Aprender com interações

### Benefícios:
- Respostas mais precisas e contextualizadas
- Redução de alucinações da IA
- Acesso a dados atualizados
- Personalização por usuário

## 📊 Status do Processamento

### Tabelas Configuradas: 14

| Tabela | Registros | Status | Prioridade |
|--------|-----------|--------|------------|
| Videos_trancricao | 211 | ⏳ Pendente | Alta |
| Comentarios_Principais | 690 | ⏳ Pendente | Alta |
| Mensagens | 688 | ⏳ Pendente | Alta |
| Videos | 96 | ⏳ Pendente | Média |
| Respostas_Comentarios | 471 | ⏳ Pendente | Média |
| Scanner de videos | 53 | ⏳ Pendente | Média |
| Canais do youtube | 29 | ⏳ Pendente | Média |
| Projeto | 6 | ⏳ Pendente | Alta |
| Integrações | 5 | ⏳ Pendente | Baixa |
| Notificacoes | 1 | ⏳ Pendente | Baixa |
| cards | 4 | ⏳ Pendente | Baixa |
| customers | 2 | ⏳ Pendente | Baixa |
| payments | 2 | ⏳ Pendente | Baixa |
| subscriptions | 2 | ⏳ Pendente | Baixa |

**Total: 2.260 registros para processar**

## 🔧 Arquitetura Técnica

### Componentes:
1. **Tabela rag_embeddings**
   - Armazena vetores de 1536 dimensões
   - Índice HNSW para busca rápida
   - Metadata em JSONB

2. **Edge Functions**
   - `process-rag-embeddings`: Processa novos dados
   - `search-rag`: Realiza busca semântica

3. **Modelo de Embeddings**
   - OpenAI text-embedding-3-small
   - 1536 dimensões
   - $0.00002 por 1k tokens

### Fluxo de Dados:
```
Novo Conteúdo → Trigger → Fila → Edge Function → OpenAI API → rag_embeddings
                                                                     ↓
Usuário → Query → Embedding → Busca Vetorial ← ← ← ← ← ← ← ← ← ← ← ↓
```

## 💰 Custos Estimados

### Processamento Inicial:
- 2.260 registros × ~500 tokens = 1.130.000 tokens
- Custo total: ~$22.60

### Manutenção Mensal:
- ~500 novos registros × 500 tokens = 250.000 tokens
- Custo: ~$5.00/mês

## 🚀 Implementação

### Fase 1: Processamento Inicial ⏳
```bash
# Processar todas as tabelas
POST /process-rag-embeddings
{
  "limit": 50
}
```

### Fase 2: Integração com Agente ⏳
- Modificar agente-liftlio para consultar RAG
- Implementar fallback inteligente
- Mesclar contexto com resposta

### Fase 3: Automação ⏳
- Triggers em todas as tabelas
- Processamento em tempo real
- Limpeza de embeddings antigos

## 📈 Métricas de Sucesso

1. **Cobertura**: 100% dos dados processados
2. **Relevância**: >0.8 similaridade média
3. **Latência**: <500ms para busca
4. **Custo**: <$0.001 por query

## 🧪 Como Testar

### Busca Manual:
```sql
-- Buscar conteúdo similar
SELECT * FROM search_rag_embeddings(
  (SELECT embedding FROM rag_embeddings LIMIT 1),
  0.7,  -- threshold
  5     -- limite
);
```

### Via API:
```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/search-rag \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "query": "Como configurar integração YouTube?",
    "limit": 5
  }'
```

---

*Para detalhes técnicos, ver: [sql_functions/](./sql_functions/)*