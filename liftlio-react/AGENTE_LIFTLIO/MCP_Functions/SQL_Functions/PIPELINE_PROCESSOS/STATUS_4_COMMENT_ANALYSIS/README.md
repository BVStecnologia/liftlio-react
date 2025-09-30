# 🎯 STATUS 4 → 5: ANÁLISE DE COMENTÁRIOS (LEAD SCORING)

**Transição**: STATUS 4 → STATUS 5
**Função Principal**: `start_comment_analysis_processing()`
**Tempo Médio**: 120-300 minutos
**Intervalo**: 15 segundos entre batches
**Objetivo**: Analisar comentários usando metodologia PICS para identificar leads qualificados

---

## 📋 VISÃO GERAL

Nesta etapa, cada comentário é analisado pelo **Claude AI** usando a **metodologia PICS**:

- **P**roblema: O comentarista tem um problema real?
- **I**ntenção: Demonstra intenção de resolver o problema?
- **C**ontexto: Fornece contexto suficiente sobre sua situação?
- **S**inais: Mostra sinais de decisão de compra/ação?

Cada comentário recebe um **score de 0 a 10** e é classificado como lead ou não-lead.

---

## 🎯 FUNÇÕES NESTE MÓDULO

### 1. `start_comment_analysis_processing(project_id integer, batch_size integer)`
**Tipo**: Main Function
**Retorno**: void
**Responsabilidade**: Orquestrar processamento em batches

### 2. `process_comment_analysis_batch(project_id integer, batch_size integer)`
**Tipo**: Main Function (recursiva)
**Retorno**: void
**Responsabilidade**: Processar batch e agendar próximo

### 3. `atualizar_comentarios_analisados(comment_ids bigint[], analysis_results jsonb[])`
**Tipo**: Helper Function
**Retorno**: void
**Responsabilidade**: Atualizar campos de análise em massa

### 4. `analisar_comentarios_com_claude(comments jsonb)` ⚡ Edge Function
**Tipo**: Edge Function (Deno)
**API**: Claude API (Anthropic)
**Responsabilidade**: Análise PICS em batch

### 5. `claude_complete()`
**Tipo**: API Wrapper
**Responsabilidade**: Chamar Claude API

---

## 🔄 FLUXO DETALHADO

```
┌──────────────────────────────────────────────────────────────────┐
│                       STATUS 4 → 5                               │
│                                                                   │
│  start_comment_analysis_processing() é chamado                   │
│            │                                                      │
│            ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Verifica comentários pendentes                            │ │
│  │  WHERE comentario_analizado = false OR NULL                │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Agenda job pg_cron (15s):                                 │ │
│  │  "SELECT process_comment_analysis_batch({project_id}, 10)" │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  process_comment_analysis_batch()                          │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Adquire Advisory Lock                             │ │ │
│  │  │    pg_try_advisory_lock(54321 + project_id)          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 2. Circuit Breaker Check                             │ │ │
│  │  │    • Max 100 execuções/hora                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 3. Busca até 10 comentários não analisados           │ │ │
│  │  │    SELECT id, text_original, video_id, author_name   │ │ │
│  │  │    WHERE comentario_analizado = false OR NULL        │ │ │
│  │  │    LIMIT 10                                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 4. Monta array JSON com os comentários               │ │ │
│  │  │    [{                                                │ │ │
│  │  │      "id": 123,                                      │ │ │
│  │  │      "text": "Tenho esse problema...",              │ │ │
│  │  │      "author": "João Silva"                          │ │ │
│  │  │    }, ...]                                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 5. Chama analisar_comentarios_com_claude()           │ │ │
│  │  │    • Envia batch de 10 comentários                   │ │ │
│  │  │    • Claude aplica metodologia PICS                  │ │ │
│  │  │    • Retorna array de análises                       │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 6. Atualiza comentários em massa                     │ │ │
│  │  │    atualizar_comentarios_analisados(                 │ │ │
│  │  │      comment_ids[],                                  │ │ │
│  │  │      analysis_results[]                              │ │ │
│  │  │    )                                                 │ │ │
│  │  │    • UPDATE score_problema                           │ │ │
│  │  │    • UPDATE score_intencao                           │ │ │
│  │  │    • UPDATE score_contexto                           │ │ │
│  │  │    • UPDATE score_sinais                             │ │ │
│  │  │    • UPDATE score_pics_total                         │ │ │
│  │  │    • UPDATE is_lead (se score >= 7)                  │ │ │
│  │  │    • UPDATE comentario_analizado = true              │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 7. Verifica se há mais comentários pendentes         │ │ │
│  │  │    IF SIM:                                           │ │ │
│  │  │      • Agenda próxima execução (15s)                 │ │ │
│  │  │    IF NÃO:                                           │ │ │
│  │  │      • Remove job do pg_cron                         │ │ │
│  │  │      • UPDATE status = '5'                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 8. Libera Advisory Lock                              │ │ │
│  │  │    pg_advisory_unlock(54321 + project_id)            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                                                    │
│            ▼                                                    │
│  ✅ Todos os comentários analisados e leads identificados      │
│  ▶  Transição: STATUS 5 (Engagement Messages)                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Comentarios_Principais`
**Operação**: SELECT + UPDATE
**Campos Lidos**:
- `id`, `text_original`, `author_name`, `video_id`, `comentario_analizado`

**Campos Atualizados** (após análise PICS):
- `score_problema` (integer 0-10)
- `score_intencao` (integer 0-10)
- `score_contexto` (integer 0-10)
- `score_sinais` (integer 0-10)
- `score_pics_total` (integer 0-40)
- `is_lead` (boolean)
- `lead_reason` (text)
- `comentario_analizado` (boolean)
- `analysis_timestamp` (timestamp)

---

## 🎯 METODOLOGIA PICS

### P - Problema (0-10)
**Avalia**: O comentário menciona um problema/dor real?

**Exemplos**:
- Score 9-10: "Estou quebrando a cabeça com isso há semanas"
- Score 5-7: "Tenho dúvidas sobre como fazer"
- Score 0-3: "Muito legal o vídeo!"

### I - Intenção (0-10)
**Avalia**: Demonstra vontade de resolver o problema?

**Exemplos**:
- Score 9-10: "Preciso resolver isso urgentemente para meu projeto"
- Score 5-7: "Gostaria de aprender mais sobre"
- Score 0-3: "Só passando para dar like"

### C - Contexto (0-10)
**Avalia**: Fornece informações sobre sua situação?

**Exemplos**:
- Score 9-10: "Trabalho com X há 2 anos e enfrento Y diariamente"
- Score 5-7: "Estou começando na área de X"
- Score 0-3: Sem contexto pessoal

### S - Sinais (0-10)
**Avalia**: Mostra sinais de decisão/ação?

**Exemplos**:
- Score 9-10: "Onde posso contratar esse serviço?"
- Score 5-7: "Vou testar essa solução"
- Score 0-3: Sem indicação de ação

### Score Total
- **0-20**: Não é lead
- **21-28**: Lead fraco (interessado)
- **29-34**: Lead médio (qualificado)
- **35-40**: Lead forte (pronto para ação)

**Threshold**: `is_lead = true` quando `score_pics_total >= 28`

---

## 🤖 ESTRUTURA DA ANÁLISE CLAUDE

### Input para Claude (Batch de 10)
```json
[
  {
    "id": 123,
    "text": "Estou com esse problema há meses...",
    "author": "João Silva",
    "video_title": "Como resolver X"
  },
  {
    "id": 124,
    "text": "Muito bom o vídeo!",
    "author": "Maria Santos",
    "video_title": "Tutorial de Y"
  }
  // ... até 10 comentários
]
```

### Output do Claude
```json
[
  {
    "comment_id": 123,
    "score_problema": 9,
    "score_intencao": 8,
    "score_contexto": 7,
    "score_sinais": 9,
    "score_pics_total": 33,
    "is_lead": true,
    "lead_reason": "Comentário demonstra problema claro, intenção forte de resolver, contexto detalhado e sinais de decisão."
  },
  {
    "comment_id": 124,
    "score_problema": 0,
    "score_intencao": 2,
    "score_contexto": 0,
    "score_sinais": 1,
    "score_pics_total": 3,
    "is_lead": false,
    "lead_reason": "Comentário genérico sem problema específico ou sinais de interesse qualificado."
  }
]
```

---

## 🧠 LÓGICA PRINCIPAL

### Função: `atualizar_comentarios_analisados()`

```sql
CREATE OR REPLACE FUNCTION atualizar_comentarios_analisados(
    comment_ids bigint[],
    analysis_results jsonb[]
)
RETURNS void AS $$
DECLARE
    i INTEGER;
    result JSONB;
BEGIN
    -- Itera sobre os resultados
    FOR i IN 1 .. array_length(comment_ids, 1)
    LOOP
        result := analysis_results[i];

        -- Atualiza o comentário
        UPDATE "Comentarios_Principais"
        SET
            score_problema = (result->>'score_problema')::integer,
            score_intencao = (result->>'score_intencao')::integer,
            score_contexto = (result->>'score_contexto')::integer,
            score_sinais = (result->>'score_sinais')::integer,
            score_pics_total = (result->>'score_pics_total')::integer,
            is_lead = (result->>'is_lead')::boolean,
            lead_reason = result->>'lead_reason',
            comentario_analizado = true,
            analysis_timestamp = CURRENT_TIMESTAMP
        WHERE id = comment_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Advisory Locks
```sql
pg_try_advisory_lock(54321 + project_id)
```

### 2. Circuit Breaker
Máximo 100 execuções por hora

### 3. Batch Processing
- 10 comentários por batch
- Intervalo de 15 segundos
- Processamento em massa (mais eficiente)

### 4. Validação de Scores
```sql
-- Garante que scores estão no range 0-10
CONSTRAINT check_score_range CHECK (
    score_problema BETWEEN 0 AND 10 AND
    score_intencao BETWEEN 0 AND 10 AND
    score_contexto BETWEEN 0 AND 10 AND
    score_sinais BETWEEN 0 AND 10
)
```

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo por Comentário | 1-2 segundos |
| Batch Size | 10 comentários |
| Intervalo | 15 segundos |
| Tempo Total | 2-5 horas |
| Taxa de Leads | 5-15% dos comentários |
| Taxa de Sucesso | > 95% |

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline travado em STATUS 4
**Diagnóstico**:
```sql
-- Ver comentários pendentes
SELECT COUNT(*)
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = false);

-- Ver últimos comentários analisados
SELECT id, text_original, score_pics_total, is_lead
FROM "Comentarios_Principais"
WHERE comentario_analizado = true
ORDER BY analysis_timestamp DESC
LIMIT 10;
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver progresso da análise
```sql
SELECT
    COUNT(*) FILTER (WHERE comentario_analizado = true) as analisados,
    COUNT(*) FILTER (WHERE comentario_analizado = false OR comentario_analizado IS NULL) as pendentes,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE comentario_analizado = true) / COUNT(*), 2) as percentual
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id};
```

### Ver leads identificados
```sql
SELECT
    COUNT(*) FILTER (WHERE is_lead = true) as total_leads,
    COUNT(*) FILTER (WHERE score_pics_total >= 35) as leads_fortes,
    COUNT(*) FILTER (WHERE score_pics_total BETWEEN 29 AND 34) as leads_medios,
    COUNT(*) FILTER (WHERE score_pics_total BETWEEN 21 AND 28) as leads_fracos
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id};
```

### Ver top leads
```sql
SELECT
    cp.text_original,
    cp.author_name,
    cp.score_pics_total,
    v.titulo as video_titulo
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND cp.is_lead = true
ORDER BY cp.score_pics_total DESC
LIMIT 20;
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────────┐
                    │   STATUS 4              │
                    │   (Comment Analysis)    │
                    └──────────┬──────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ process_comment_analysis_      │
              │        batch()                 │
              │ (a cada 15s)                   │
              └────────────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │Comment 1 │         │Comment 2 │        │Comment 3 │
    │Comment 4 │         │Comment 5 │        │Comment 6 │
    │Comment 7 │         │Comment 8 │        │Comment 9 │
    │Comment 10│         │          │        │          │
    └────┬─────┘         └────┬─────┘        └────┬─────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ analisar_comentarios_com_     │
              │        claude()                │
              │ (Edge Function - Batch)        │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Claude API                    │
              │ Metodologia PICS:             │
              │ • P: Problema (0-10)          │
              │ • I: Intenção (0-10)          │
              │ • C: Contexto (0-10)          │
              │ • S: Sinais (0-10)            │
              │ Total: 0-40                   │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ atualizar_comentarios_        │
              │     analisados()               │
              │ (Bulk UPDATE)                  │
              └───────────────┬───────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │ Lead     │        │ Lead     │       │ Não Lead │
    │ Score 35 │        │ Score 29 │       │ Score 12 │
    │ is_lead  │        │ is_lead  │       │ is_lead  │
    │ = true   │        │ = true   │       │ = false  │
    └────┬─────┘        └────┬─────┘       └──────────┘
         │                   │
         └───────────────────┼───────────────┐
                             │               │
                             ▼               ▼
                    ┌─────────────────────────┐
                    │ Todos analisados?       │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┴────────────────┐
              │ SIM                             │ NÃO
              ▼                                 ▼
    ┌─────────────────┐                 ┌─────────────┐
    │ UPDATE          │                 │ Agenda      │
    │ status = '5'    │                 │ próximo     │
    │                 │                 │ batch (15s) │
    └────────┬────────┘                 └─────────────┘
             │
             ▼
    ┌─────────────────┐
    │  STATUS 5       │
    │  (Engagement    │
    │   Messages)     │
    └─────────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

### SQL Functions
- `start_comment_analysis_processing.sql`
- `process_comment_analysis_batch.sql`
- `atualizar_comentarios_analisados.sql`
- `contar_comentarios_analisados.sql` (helper)

### Edge Functions
- `analisar-comentarios-com-claude.ts`
- `claude-complete.ts`

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 4→5 bem-sucedido:

- [ ] Todos os comentários têm `comentario_analizado = true`
- [ ] Scores PICS preenchidos (P, I, C, S, Total)
- [ ] Campo `is_lead` determinado corretamente
- [ ] `lead_reason` preenchido para todos
- [ ] Status mudou para '5'
- [ ] Job removido do pg_cron
- [ ] Leads identificados prontos para engajamento

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0