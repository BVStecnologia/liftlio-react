# 🤖 STATUS 3 → 4: ANÁLISE DE VÍDEOS COM CLAUDE AI

**Transição**: STATUS 3 → STATUS 4
**Função Principal**: `start_video_analysis_processing()`
**Tempo Médio**: 60-180 minutos
**Intervalo**: 30 segundos entre batches
**Objetivo**: Analisar relevância, tópicos e potencial de cada vídeo usando Claude AI

---

## 📋 VISÃO GERAL

Nesta etapa, cada vídeo é analisado pelo **Claude AI** para determinar:
- **Relevância** para o projeto/nicho
- **Categoria de Conteúdo**
- **Tópicos Principais**
- **Análise de Sentimento**
- **Potencial de Engajamento**
- **Potencial de Lead**
- **Ações Recomendadas**

---

## 🎯 FUNÇÕES NESTE MÓDULO (ORDEM DE EXECUÇÃO)

| # | Função | Tipo | Descrição |
|---|--------|------|-----------|
| 01 | `start_video_analysis_processing()` | Main | Orquestrar processamento em batches |
| 02 | `process_video_analysis_batch()` | Main (recursiva) | Processar batch e agendar próximo |
| 03 | `update_video_analysis()` | Helper | Atualizar campos de análise do vídeo |
| 04 | `analyze_video_with_claude()` | AI Analyzer | Análise AI completa do vídeo com Claude |
| 05 | `get_video_data_for_analysis()` | Data Fetcher | Busca dados do vídeo + comentários para análise |

---

## 🔄 FLUXO DETALHADO

```
┌──────────────────────────────────────────────────────────────────┐
│                       STATUS 3 → 4                               │
│                                                                   │
│  start_video_analysis_processing() é chamado                     │
│            │                                                      │
│            ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Verifica vídeos pendentes                                 │ │
│  │  WHERE is_relevant IS NULL                                 │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Agenda job pg_cron (30s):                                 │ │
│  │  "SELECT process_video_analysis_batch({project_id}, 5)"    │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  process_video_analysis_batch()                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Adquire Advisory Lock                             │ │ │
│  │  │    pg_try_advisory_lock(12345 + project_id)          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 2. Circuit Breaker Check                             │ │ │
│  │  │    • Max 100 execuções/hora                          │ │ │
│  │  │    • Se exceder → retorna                            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 3. Busca até 5 vídeos não analisados                 │ │ │
│  │  │    WHERE is_relevant IS NULL                         │ │ │
│  │  │    ORDER BY published_at DESC                        │ │ │
│  │  │    LIMIT 5                                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 4. Para cada vídeo:                                  │ │ │
│  │  │    • update_video_analysis(video_id)                 │ │ │
│  │  │       ├─ Busca dados: título, descrição, stats       │ │ │
│  │  │       ├─ Chama analyze_video_with_claude()           │ │ │
│  │  │       │   ├─ Envia prompt para Claude API            │ │ │
│  │  │       │   ├─ Claude analisa o vídeo                  │ │ │
│  │  │       │   └─ Retorna JSON com análise                │ │ │
│  │  │       └─ UPDATE campos na tabela Videos              │ │ │
│  │  │          (is_relevant, relevance_score, etc.)        │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 5. Verifica se há mais vídeos pendentes              │ │ │
│  │  │    IF SIM:                                           │ │ │
│  │  │      • Agenda próxima execução (30s)                 │ │ │
│  │  │    IF NÃO:                                           │ │ │
│  │  │      • Remove job do pg_cron                         │ │ │
│  │  │      • UPDATE status = '4'                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 6. Libera Advisory Lock                              │ │ │
│  │  │    pg_advisory_unlock(12345 + project_id)            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                                                    │
│            ▼                                                    │
│  ✅ Todos os vídeos analisados                                 │
│  ▶  Transição: STATUS 4 (Comment Analysis)                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Videos`
**Operação**: SELECT + UPDATE
**Campos Lidos**:
- `id`, `"VIDEO"`, `titulo`, `descricao`, `view_count`, `like_count`, `comment_count`

**Campos Atualizados** (após análise Claude):
- `is_relevant` (boolean)
- `relevance_reason` (text)
- `relevance_score` (double precision)
- `content_category` (text)
- `sentiment_analysis` (jsonb)
- `key_topics` (text[])
- `engagement_potential` (text)
- `target_audience` (text)
- `lead_potential` (text)
- `recommended_actions` (text[])
- `ai_analysis_summary` (text)
- `ai_analysis_timestamp` (timestamp)
- `trending_score` (double precision)
- `evergreen_potential` (boolean)

---

## 🤖 ESTRUTURA DA ANÁLISE CLAUDE

### Input para Claude
```json
{
  "video_id": "abc123",
  "titulo": "Como fazer X com Y",
  "descricao": "Neste vídeo...",
  "view_count": 15000,
  "like_count": 850,
  "comment_count": 120,
  "published_at": "2025-01-20T10:00:00Z",
  "project_keywords": ["keyword1", "keyword2"]
}
```

### Output do Claude
```json
{
  "is_relevant": true,
  "relevance_reason": "Vídeo aborda exatamente o tema X...",
  "relevance_score": 8.5,
  "content_category": "Tutorial",
  "sentiment_analysis": {
    "overall": "positive",
    "confidence": 0.92
  },
  "key_topics": ["Topic A", "Topic B", "Topic C"],
  "engagement_potential": "high",
  "target_audience": "Desenvolvedores júnior e intermediários",
  "lead_potential": "high",
  "recommended_actions": [
    "Comentar com dica adicional",
    "Oferecer recurso gratuito"
  ],
  "ai_analysis_summary": "Este vídeo tem alto potencial...",
  "trending_score": 7.8,
  "evergreen_potential": true
}
```

---

## 🧠 LÓGICA PRINCIPAL

### Função: `process_video_analysis_batch()`

```sql
CREATE OR REPLACE FUNCTION process_video_analysis_batch(
    project_id integer,
    batch_size integer
)
RETURNS void AS $$
DECLARE
    v_video_id BIGINT;
    lock_acquired BOOLEAN;
    execution_count INTEGER;
BEGIN
    -- 1. Adquire lock
    SELECT pg_try_advisory_lock(12345 + project_id) INTO lock_acquired;
    IF NOT lock_acquired THEN
        RETURN;
    END IF;

    -- 2. Circuit Breaker
    SELECT COUNT(*)
    INTO execution_count
    FROM video_analysis_execution_log
    WHERE executed_at >= NOW() - INTERVAL '1 hour';

    IF execution_count >= 100 THEN
        PERFORM pg_advisory_unlock(12345 + project_id);
        RETURN;
    END IF;

    -- 3. Log da execução
    INSERT INTO video_analysis_execution_log (executed_at) VALUES (NOW());

    -- 4. Processa batch
    FOR v_video_id IN (
        SELECT v.id
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND v.is_relevant IS NULL
        ORDER BY v.published_at DESC
        LIMIT batch_size
    )
    LOOP
        PERFORM update_video_analysis(v_video_id);
    END LOOP;

    -- 5. Verifica se há mais vídeos
    IF NOT EXISTS (
        SELECT 1 FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND v.is_relevant IS NULL
    ) THEN
        -- Remove job
        PERFORM cron.unschedule('analyze_videos_' || project_id);

        -- Avança para próximo status
        UPDATE "Projeto" SET status = '4' WHERE id = project_id;
    ELSE
        -- Agenda próxima execução
        PERFORM cron.schedule(
            'analyze_videos_' || project_id,
            '30 seconds',
            format('SELECT process_video_analysis_batch(%s, %s)', project_id, batch_size)
        );
    END IF;

    -- 6. Libera lock
    PERFORM pg_advisory_unlock(12345 + project_id);
END;
$$ LANGUAGE plpgsql;
```

### Função: `update_video_analysis()`

```sql
CREATE OR REPLACE FUNCTION update_video_analysis(video_id bigint)
RETURNS void AS $$
DECLARE
    video_youtube_id text;
    analysis_result jsonb;
BEGIN
    -- Obter ID do YouTube
    SELECT "VIDEO" INTO video_youtube_id
    FROM "Videos"
    WHERE id = video_id;

    -- Chamar Edge Function com Claude
    SELECT analyze_video_with_claude(video_youtube_id) INTO analysis_result;

    -- Atualizar campos
    UPDATE "Videos"
    SET
        is_relevant = (analysis_result->>'is_relevant')::boolean,
        relevance_reason = analysis_result->>'relevance_reason',
        relevance_score = (analysis_result->>'relevance_score')::double precision,
        content_category = analysis_result->>'content_category',
        sentiment_analysis = analysis_result->'sentiment_analysis',
        key_topics = (SELECT array_agg(value::text) FROM jsonb_array_elements_text(analysis_result->'key_topics')),
        engagement_potential = analysis_result->>'engagement_potential',
        target_audience = analysis_result->>'target_audience',
        lead_potential = analysis_result->>'lead_potential',
        recommended_actions = (SELECT array_agg(value::text) FROM jsonb_array_elements_text(analysis_result->'recommended_actions')),
        ai_analysis_summary = analysis_result->>'ai_analysis_summary',
        ai_analysis_timestamp = CURRENT_TIMESTAMP,
        trending_score = (analysis_result->>'trending_score')::double precision,
        evergreen_potential = (analysis_result->>'evergreen_potential')::boolean
    WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Advisory Locks
```sql
pg_try_advisory_lock(12345 + project_id)
```
Previne processamento simultâneo do mesmo projeto.

### 2. Circuit Breaker
```sql
IF execution_count >= 100 THEN
    RETURN;
END IF;
```
Máximo 100 execuções por hora.

### 3. Batch Processing
- 5 vídeos por batch
- Intervalo de 30 segundos
- Prioriza vídeos mais recentes

### 4. Tratamento de Erros
```sql
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating video analysis for ID %: % %', video_id, SQLERRM, SQLSTATE;
END;
```

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo por Vídeo | 5-10 segundos |
| Batch Size | 5 vídeos |
| Intervalo | 30 segundos |
| Tempo Total | 1-3 horas |
| Taxa de Sucesso | > 98% |
| Claude Tokens/Vídeo | 500-1500 tokens |

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline travado em STATUS 3
**Sintomas**:
- Status permanece em '3'
- Alguns vídeos ainda têm `is_relevant IS NULL`

**Diagnóstico**:
```sql
-- Ver vídeos pendentes
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND v.is_relevant IS NULL;

-- Ver último vídeo analisado
SELECT id, titulo, ai_analysis_timestamp
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND v.is_relevant IS NOT NULL
ORDER BY ai_analysis_timestamp DESC
LIMIT 5;

-- Verificar locks
SELECT * FROM pg_locks
WHERE locktype = 'advisory'
AND objid = 12345 + {project_id};
```

**Soluções**:
1. **Lock não liberado**:
```sql
SELECT pg_advisory_unlock(12345 + {project_id});
```

2. **Claude API com erro**:
```sql
-- Ver logs da Edge Function
-- Pode ser rate limit, timeout, etc.

-- Marcar vídeo como analisado manualmente
UPDATE "Videos"
SET is_relevant = false,
    relevance_reason = 'Análise manual: não relevante'
WHERE id = {video_id};
```

3. **Circuit breaker ativo**:
```sql
DELETE FROM video_analysis_execution_log
WHERE executed_at < NOW() - INTERVAL '1 hour';
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver progresso da análise
```sql
SELECT
    COUNT(*) FILTER (WHERE is_relevant IS NOT NULL) as analisados,
    COUNT(*) FILTER (WHERE is_relevant IS NULL) as pendentes,
    COUNT(*) as total,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE is_relevant IS NOT NULL) / COUNT(*),
        2
    ) as percentual_completo
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id};
```

### Ver vídeos mais relevantes
```sql
SELECT
    titulo,
    relevance_score,
    engagement_potential,
    lead_potential,
    view_count
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND is_relevant = true
ORDER BY relevance_score DESC
LIMIT 10;
```

### Ver categorias de conteúdo
```sql
SELECT
    content_category,
    COUNT(*) as quantidade,
    AVG(relevance_score) as media_score
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND is_relevant IS NOT NULL
GROUP BY content_category
ORDER BY quantidade DESC;
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────────┐
                    │   STATUS 3              │
                    │   (Video Analysis)      │
                    └──────────┬──────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ start_video_analysis_          │
              │     processing()               │
              └────────────────┬───────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ process_video_analysis_batch() │
              │ (a cada 30s)                   │
              └────────────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Vídeo 1 │          │ Vídeo 2 │          │ Vídeo 3 │
    └────┬────┘          └────┬────┘          └────┬────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ update_video_analysis()       │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ analyze_video_with_claude()   │
              │ (Edge Function)               │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Claude API                    │
              │ • Analisa título/descrição    │
              │ • Calcula relevance_score     │
              │ • Identifica tópicos          │
              │ • Avalia potencial            │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ UPDATE Videos                 │
              │ • is_relevant                 │
              │ • relevance_score             │
              │ • key_topics                  │
              │ • lead_potential              │
              │ • + 10 campos                 │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │ Todos vídeos analisados?│
                    └──────────┬──────────────┘
                               │
              ┌────────────────┴────────────────┐
              │ SIM                             │ NÃO
              ▼                                 ▼
    ┌─────────────────┐                 ┌─────────────┐
    │ UPDATE          │                 │ Agenda      │
    │ status = '4'    │                 │ próximo     │
    │                 │                 │ batch (30s) │
    └────────┬────────┘                 └─────────────┘
             │
             ▼
    ┌─────────────────┐
    │  STATUS 4       │
    │  (Comment       │
    │   Analysis)     │
    └─────────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

### SQL Functions (Numeradas por Ordem de Execução)
- `01_start_video_analysis_processing.sql` - Função MÃE (inicia processo)
- `02_process_video_analysis_batch.sql` - Batch processor recursivo
- `03_update_video_analysis.sql` - Atualiza campos do vídeo
- `04_analyze_video_with_claude.sql` - Análise AI com Claude
- `05_get_video_data_for_analysis.sql` - Busca dados para análise

### Funções Auxiliares Globais (ver STATUS_4)
- `claude_complete()` - API wrapper para Claude (arquivo em STATUS_4/06)
- `get_secret()` - Helper para buscar secrets (arquivo em STATUS_4/07)

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 3→4 bem-sucedido:

- [ ] Todos os vídeos têm `is_relevant` preenchido (true/false)
- [ ] Campos de análise AI preenchidos corretamente
- [ ] `ai_analysis_timestamp` atualizado
- [ ] Status mudou para '4'
- [ ] Job removido do pg_cron
- [ ] Nenhum lock órfão
- [ ] Nenhum erro nos logs do Claude

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0