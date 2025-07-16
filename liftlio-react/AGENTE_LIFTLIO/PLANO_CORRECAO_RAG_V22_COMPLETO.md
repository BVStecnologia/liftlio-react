# Plano Completo de Correção RAG v22 - Backend Robusto

## 🎯 Objetivo
Criar uma solução definitiva onde o agente Liftlio consegue acessar TODOS os dados do projeto com precisão, movendo a lógica de busca RAG para o backend Supabase.

## 🔍 Problemas Identificados

### 1. Mensagens Agendadas em Settings_messages_posts
- Projeto 58 tem mensagens agendadas nesta tabela
- O agente não está conseguindo ver/acessar
- Possível problema: RAG não está indexando corretamente esta tabela

### 2. Arquitetura Atual (Problema)
- Busca RAG feita na Edge Function (cliente)
- Múltiplas queries e lógica complexa no frontend
- Dificulta manutenção e otimização

## 🏗️ Solução Proposta: RAG Backend via RPC

### Arquitetura Nova
```
Frontend (FloatingAgent)
    ↓
Edge Function (agente-liftlio v22)
    ↓
RPC Function (search_rag_enhanced)
    ↓
PostgreSQL (busca otimizada com índices)
```

### Vantagens
1. **Performance**: Busca nativa no PostgreSQL
2. **Manutenção**: Lógica centralizada
3. **Flexibilidade**: Fácil adicionar novos filtros
4. **Confiabilidade**: Menos pontos de falha

## 📋 Plano de Implementação

### Fase 1: Análise do Estado Atual
- [ ] Verificar embeddings do projeto 58
- [ ] Analisar conteúdo de Settings_messages_posts
- [ ] Mapear todas as queries necessárias

### Fase 2: Criar RPC Backend
```sql
CREATE OR REPLACE FUNCTION search_rag_enhanced(
  p_query_embedding vector(1536),
  p_project_id integer,
  p_search_text text DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  content text,
  source_table text,
  similarity float,
  metadata jsonb,
  relevance_score float
) AS $$
BEGIN
  -- Implementar busca híbrida:
  -- 1. Similaridade vetorial
  -- 2. Busca por keywords
  -- 3. Filtros temporais
  -- 4. Boost por categoria
END;
$$ LANGUAGE plpgsql;
```

### Fase 3: Edge Function v22 Simplificada
- Apenas gera embedding
- Chama RPC com parâmetros
- Formata resposta

### Fase 4: Suite de Testes Completa

## 🧪 Plano de Testes Robustos

### Testes Básicos - Projeto 58
1. **Métricas Gerais**
   - "quantas menções tem o projeto HW?"
   - "quantos canais estão monitorando?"
   - "quantos vídeos foram analisados?"

2. **Mensagens Agendadas**
   - "quantas mensagens estão agendadas?"
   - "mostre as mensagens agendadas"
   - "o que está programado para postar?"

3. **Conteúdo Específico**
   - "mostre menções sobre earnings"
   - "o que foi postado hoje?"
   - "quais canais mencionaram Humanlike Writer?"

4. **Temporal**
   - "o que aconteceu ontem?"
   - "mostre postagens da semana"
   - "mensagens postadas às 14:11"

5. **Status e Estados**
   - "mensagens com status posted"
   - "comentários pendentes de resposta"
   - "vídeos mais recentes"

### Testes Avançados
1. **Multi-tabela**
   - "mostre tudo sobre o canal X"
   - "análise completa do vídeo Y"
   
2. **Agregações**
   - "top 5 canais com mais menções"
   - "tendência de menções esta semana"

3. **Busca Complexa**
   - "menções negativas sobre affiliate"
   - "comentários sem resposta há mais de 24h"

## 🛠️ Ferramentas de Debug

### 1. Script de Análise de Embeddings
```bash
#!/bin/bash
# analyze_embeddings.sh
# Verifica quantos embeddings existem por tabela para projeto 58
```

### 2. Monitor de Performance RAG
```sql
-- Função para monitorar performance das buscas
CREATE OR REPLACE FUNCTION monitor_rag_performance()
```

### 3. Dashboard de Cobertura
- Quantas tabelas têm embeddings
- Percentual de registros processados
- Últimas atualizações

## 📊 Critérios de Sucesso

1. **Cobertura**: 100% das tabelas com dados retornando resultados
2. **Precisão**: Respostas corretas em 95%+ dos testes
3. **Performance**: Respostas em < 2 segundos
4. **Confiabilidade**: Zero falsos negativos

## 🚀 Cronograma

1. **Hora 1**: Análise e diagnóstico completo
2. **Hora 2**: Implementar RPC backend
3. **Hora 3**: Criar v22 e testar
4. **Hora 4**: Suite completa de testes
5. **Hora 5**: Ajustes finais e documentação

## 🔧 Configurações Necessárias

### Índices Otimizados
```sql
-- Índice composto para performance
CREATE INDEX idx_rag_project_similarity 
ON rag_embeddings(project_id, similarity DESC);

-- Índice para busca textual
CREATE INDEX idx_rag_content_gin 
ON rag_embeddings USING gin(to_tsvector('portuguese', content));
```

### Manutenção Automática
- CRON para processar novos registros
- Limpeza de embeddings obsoletos
- Atualização incremental

## ✅ Checklist Final

- [ ] Todos os testes passando
- [ ] Performance < 2s
- [ ] Documentação completa
- [ ] Backup das funções
- [ ] Deploy em produção
- [ ] Monitoramento ativo

## 🎯 Resultado Esperado

Agente Liftlio v22 com:
- Acesso completo a TODOS os dados
- Respostas precisas e contextuais
- Performance otimizada
- Manutenção simplificada
- Confiabilidade total