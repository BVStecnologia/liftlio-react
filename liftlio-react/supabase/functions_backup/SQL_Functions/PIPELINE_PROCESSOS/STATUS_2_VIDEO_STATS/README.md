# 📊 STATUS 2 → 3: ESTATÍSTICAS E COMENTÁRIOS DOS VÍDEOS

**Transição**: STATUS 2 → STATUS 3
**Funções Principais**: `update_video_stats()` + `start_video_processing()`
**Tempo Médio**: 30-120 minutos
**Intervalo**: 7s (stats) + 5s (comentários)
**Objetivo**: Coletar estatísticas completas e todos os comentários dos vídeos

---

---

## 📋 VISÃO GERAL

Esta é a etapa mais complexa do pipeline. Ela é dividida em **duas fases paralelas**:

1. **Fase Stats**: Buscar visualizações, likes, comentários totais
2. **Fase Comments**: Buscar todos os comentários e respostas

Ambas as fases usam **batch processing** com **circuit breaker** para respeitar limites da API YouTube.

---

## 🎯 FUNÇÕES NESTE MÓDULO (ORDEM DE EXECUÇÃO)

### FASE 1: VIDEO STATS
| # | Função | Tipo | Descrição |
|---|--------|------|-----------|
| 01 | `update_video_stats()` | Main | Atualiza estatísticas em batches |
| 02 | `call_youtube_edge_function()` | Helper | Wrapper para Edge Function "bright-function" |

### FASE 2: VIDEO COMMENTS
| # | Função | Tipo | Descrição |
|---|--------|------|-----------|
| 03 | `start_video_processing()` | Main | Inicia processamento de comentários |
| 04 | `process_pending_videos()` | Helper | Itera sobre vídeos pendentes |
| 05 | `process_videos_batch()` | Main | Processa vídeos em batches |
| 06 | `fetch_and_store_comments_for_video()` | Core | Busca e salva comentários |
| 07 | `get_youtube_video_comments()` | API Caller | Busca comentários da API YouTube via HTTP |
| 08 | `bright-function` ⚡ Edge Function | Edge Fn | Busca estatísticas de vídeos do YouTube via API |

### 📦 ARQUIVADAS (_Archived/)
| Arquivo | Motivo |
|---------|--------|
| `get_youtube_video_stats.sql` | Não usada no fluxo atual |
| `update_video_stats_safe.sql` | Duplicata de `01_update_video_stats.sql` |

---

## 🧪 TESTE MANUAL PASSO A PASSO

**Quando usar**: Debugging, validação de funções, ambiente sem CRON ativo

**Pré-requisitos**:
- Trigger desativado (não deletará comentários automaticamente)
- Projeto criado com scanners ativos

### ETAPA 1: STATUS 0 → 1 (Inicialização)
```sql
-- Função: atualizar_scanner_rodada
-- Objetivo: Definir rodada=1 nos scanners e mudar status para '1'

SELECT atualizar_scanner_rodada(116);
```

**Resultado esperado**:
```
Definido campo rodada = 1 para 2 scanners ativos do projeto 116
Cache de scanners não atualizado - função ausente
Status do projeto 116 atualizado para 1 - Pronto para processar
```

**Validação**:
```sql
-- Verificar scanners
SELECT id, "Keyword", rodada, "Ativa?"
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = 116;
-- Resultado: rodada = 1, Ativa? = true

-- Verificar status do projeto
SELECT id, status FROM "Projeto" WHERE id = 116;
-- Resultado: status = '1'
```

---

### ETAPA 2: STATUS 1 → 2 (Buscar vídeos do YouTube)
```sql
-- Função: process_next_project_scanner
-- Objetivo: Processar scanners UM POR VEZ (rodada IS NOT NULL)
-- IMPORTANTE: Roda N VEZES (N = quantidade de scanners ativos do projeto)

-- Primeira execução
SELECT process_next_project_scanner(116);
```

**Resultado esperado (1ª execução)**:
```
Scanner 580 processado com sucesso na tentativa 1. Restam 1 scanners pendentes no projeto 116
```

```sql
-- Segunda execução (último scanner, pois projeto 116 tem 2 scanners)
SELECT process_next_project_scanner(116);
```

**Resultado esperado (2ª execução - ÚLTIMA)**:
```
Scanner 581 processado com sucesso na tentativa 1. Projeto 116 completamente processado. Status atualizado para 2.
```

**IMPORTANTE**: Se o projeto tivesse 5 scanners, seria necessário rodar 5 vezes.

**Validação**:
```sql
-- Verificar scanners processados
SELECT id, "Keyword", rodada
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = 116;
-- Resultado: rodada = NULL (foi limpo após processamento)

-- Verificar vídeos inseridos
SELECT id, "VIDEO", video_title, scanner_id
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116
ORDER BY id;
-- Resultado: 4 vídeos inseridos (IDs: 28548, 28549, 28550, 28551)

-- Verificar status do projeto
SELECT id, status FROM "Projeto" WHERE id = 116;
-- Resultado: status = '2'
```

**Observação importante**:
- Esta função processa **1 scanner por vez**
- Precisa rodar **N vezes** (onde N = quantidade de scanners ativos do projeto)
- Com CRON ativo, roda automaticamente a cada X segundos até `remaining_count = 0`

---

### ETAPA 3: STATUS 2 → 3 (Estatísticas e Comentários)
```sql
-- Função: update_video_stats
-- Objetivo: Buscar estatísticas e comentários dos vídeos
-- IMPORTANTE: Processa TODOS os scanners/vídeos de UMA VEZ

SELECT update_video_stats(116);
```

**Resultado esperado**:
```
Iniciando update_video_stats para o projeto 116 em 2025-10-16 15:16:04.929733+00
Processando scanner ID: 580
Processando 3 IDs
Vídeo inserido: YOzXnEv5Nmo (ID: 28548)
Vídeo inserido: OQIBf2mIs58 (ID: 28549)
Vídeo inserido: ZT4LqD2_GwM (ID: 28550)
Scanner 580 atualizado: IDs verificados e cache limpo
Processando scanner ID: 581
Processando 1 IDs
Vídeo inserido: Y7trnay3nHQ (ID: 28551)
Scanner 581 atualizado: IDs verificados e cache limpo
Status do projeto atualizado para 3
Iniciando processamento de comentários
```

**Validação**:
```sql
-- Verificar vídeos com estatísticas
SELECT id, "VIDEO", view_count, like_count, comment_count, stats_atualizadas
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116;
-- Resultado: stats_atualizadas = true, campos de stats preenchidos

-- Verificar comentários coletados
SELECT COUNT(*) as total_comentarios
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116;
-- Resultado: Comentários inseridos

-- Verificar status do projeto
SELECT id, status FROM "Projeto" WHERE id = 116;
-- Resultado: status = '3'
```

**Observação importante**:
- Esta função processa **TODOS os vídeos de uma vez**
- **NÃO precisa rodar múltiplas vezes** (diferente de process_next_project_scanner)
- Já muda o status para '3' automaticamente
- Já inicia o processamento de comentários automaticamente

---

### 📊 COMPARAÇÃO: Processamento 1 por vez vs Todos de uma vez

| Função | Processa | Precisa Rodar Múltiplas Vezes? | Status ao Fim |
|--------|----------|--------------------------------|---------------|
| `atualizar_scanner_rodada()` | Todos os scanners | ❌ Não (1x apenas) | '1' |
| `process_next_project_scanner()` | 1 scanner por vez | ✅ Sim (N vezes = N scanners) | '2' |
| `update_video_stats()` | Todos os vídeos | ❌ Não (1x apenas) | '3' |

---

### ✅ CHECKLIST DE TESTE MANUAL

**STATUS 0→1**:
- [x] 2 scanners com `rodada = 1`
- [x] Status do projeto = '1'

**STATUS 1→2**:
- [x] Scanner 580 processado (3 vídeos)
- [x] Scanner 581 processado (1 vídeo)
- [x] Total: 4 vídeos na tabela Videos
- [x] Scanners com `rodada = NULL`
- [x] Status do projeto = '2'

**STATUS 2→3**:
- [x] 4 vídeos com estatísticas (views, likes, comments)
- [x] Comentários coletados e salvos
- [x] Status do projeto = '3'

**Próximos passos**: STATUS 3→4 (Análise de sentimentos), STATUS 4→5 (Análise PICS de comentários)

---

## 🔄 FLUXO DETALHADO

```
┌────────────────────────────────────────────────────────────────────────┐
│                           STATUS 2 → 3                                 │
│                                                                         │
│  ┌─────────────────────── FASE 1: STATS ────────────────────────────┐ │
│  │                                                                    │ │
│  │  pg_cron a cada 7s:                                               │ │
│  │  "SELECT update_video_stats({project_id}, 10)"                    │ │
│  │            │                                                       │ │
│  │            ▼                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────┐    │ │
│  │  │  update_video_stats()                                    │    │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │    │ │
│  │  │  │ 1. Circuit Breaker Check                           │ │    │ │
│  │  │  │    • Max 100 execuções/hora                        │ │    │ │
│  │  │  │    • Se exceder → para e agenda para próxima hora  │ │    │ │
│  │  │  └────────────────────────────────────────────────────┘ │    │ │
│  │  │            │                                              │    │ │
│  │  │            ▼                                              │    │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │    │ │
│  │  │  │ 2. Busca 10 vídeos sem estatísticas               │ │    │ │
│  │  │  │    WHERE stats_atualizadas = false                 │ │    │ │
│  │  │  └────────────────────────────────────────────────────┘ │    │ │
│  │  │            │                                              │    │ │
│  │  │            ▼                                              │    │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │    │ │
│  │  │  │ 3. Para cada vídeo:                                │ │    │ │
│  │  │  │    • Chama get_youtube_video_stats()               │ │    │ │
│  │  │  │    • Recebe: views, likes, comments_count          │ │    │ │
│  │  │  │    • UPDATE stats na tabela Videos                 │ │    │ │
│  │  │  │    • Marca stats_atualizadas = true                │ │    │ │
│  │  │  └────────────────────────────────────────────────────┘ │    │ │
│  │  │            │                                              │    │ │
│  │  │            ▼                                              │    │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │    │ │
│  │  │  │ 4. Se não há mais vídeos:                          │ │    │ │
│  │  │  │    • Chama start_video_processing()                │ │    │ │
│  │  │  │    • Remove job do pg_cron                         │ │    │ │
│  │  │  │    • UPDATE status = '3'                           │ │    │ │
│  │  │  └────────────────────────────────────────────────────┘ │    │ │
│  │  └──────────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│            │                                                            │
│            ▼                                                            │
│  ┌─────────────────────── FASE 2: COMMENTS ────────────────────────┐  │
│  │                                                                   │  │
│  │  start_video_processing() dispara:                               │  │
│  │  process_videos_batch({project_id}, 10)                          │  │
│  │            │                                                      │  │
│  │            ▼                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  process_videos_batch()                                  │   │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │   │  │
│  │  │  │ 1. Conta vídeos pendentes                          │ │   │  │
│  │  │  │    WHERE comentarios_atualizados = false           │ │   │  │
│  │  │  └────────────────────────────────────────────────────┘ │   │  │
│  │  │            │                                              │   │  │
│  │  │            ▼                                              │   │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │   │  │
│  │  │  │ 2. Chama process_pending_videos()                  │ │   │  │
│  │  │  │    • Processa até 10 vídeos por batch              │ │   │  │
│  │  │  └────────────────────────────────────────────────────┘ │   │  │
│  │  │            │                                              │   │  │
│  │  │            ▼                                              │   │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │   │  │
│  │  │  │ 3. Para cada vídeo:                                │ │   │  │
│  │  │  │    • fetch_and_store_comments_for_video()          │ │   │  │
│  │  │  │    • Busca TODOS os comentários (paginado)         │ │   │  │
│  │  │  │    • Salva em Comentarios_Principais               │ │   │  │
│  │  │  │    • Salva respostas em Respostas_Comentarios      │ │   │  │
│  │  │  │    • Marca comentarios_atualizados = true          │ │   │  │
│  │  │  └────────────────────────────────────────────────────┘ │   │  │
│  │  │            │                                              │   │  │
│  │  │            ▼                                              │   │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │   │  │
│  │  │  │ 4. Verifica se ainda há vídeos pendentes           │ │   │  │
│  │  │  │    IF SIM:                                         │ │   │  │
│  │  │  │      • Agenda próxima execução (5s)                │ │   │  │
│  │  │  │    IF NÃO:                                         │ │   │  │
│  │  │  │      • Remove job do pg_cron                       │ │   │  │
│  │  │  │      • SET status = '3'                            │ │   │  │
│  │  │  └────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│            │                                                              │
│            ▼                                                              │
│  ✅ Estatísticas e comentários completos                                 │
│  ▶  Transição para STATUS 3 (Video Analysis)                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Videos`
**Operação**: SELECT + UPDATE
**Campos Lidos**:
- `id`, `"VIDEO"`, `scanner_id`, `stats_atualizadas`, `comentarios_atualizados`

**Campos Alterados (Fase Stats)**:
- `view_count`
- `like_count`
- `comment_count`
- `stats_atualizadas` = true

**Campos Alterados (Fase Comments)**:
- `comentarios_atualizados` = true
- `comentarios_desativados` = true (se aplicável)

### Tabela: `Comentarios_Principais`
**Operação**: INSERT
**Campos Preenchidos**:
- `video_id`
- `comment_id` (ID do YouTube)
- `author_name`
- `author_channel_id`
- `like_count`
- `published_at`
- `text_display`
- `text_original`
- `total_reply_count`

### Tabela: `Respostas_Comentarios`
**Operação**: INSERT
**Campos Preenchidos**:
- `video_id`
- `parent_comment_id`
- `comment_id`
- `author_name`
- `like_count`
- `text_display`
- Outros metadados

---

## 🧠 LÓGICA PRINCIPAL

### Função: `update_video_stats()`

```sql
CREATE OR REPLACE FUNCTION update_video_stats(project_id integer, batch_size integer)
RETURNS void AS $$
DECLARE
    execution_count INTEGER;
    video_record RECORD;
BEGIN
    -- 1. Circuit Breaker Check
    SELECT COUNT(*)
    INTO execution_count
    FROM stats_execution_log
    WHERE executed_at >= NOW() - INTERVAL '1 hour';

    IF execution_count >= 100 THEN
        RAISE NOTICE 'Circuit breaker ativado: % execuções na última hora', execution_count;
        RETURN;
    END IF;

    -- 2. Log da execução
    INSERT INTO stats_execution_log (executed_at) VALUES (NOW());

    -- 3. Processa batch de vídeos
    FOR video_record IN (
        SELECT v.id, v."VIDEO"
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND v.stats_atualizadas = false
        LIMIT batch_size
    )
    LOOP
        -- Chama Edge Function para buscar stats
        PERFORM call_youtube_edge_function(video_record."VIDEO", project_id);
    END LOOP;

    -- 4. Verifica se há mais vídeos
    IF NOT EXISTS (
        SELECT 1 FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND v.stats_atualizadas = false
    ) THEN
        -- Inicia fase de comentários
        PERFORM start_video_processing(project_id, batch_size);

        -- Remove job de stats
        PERFORM cron.unschedule('update_stats_' || project_id);

        -- Avança para status 3
        UPDATE "Projeto" SET status = '3' WHERE id = project_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Função: `fetch_and_store_comments_for_video()`

```sql
CREATE OR REPLACE FUNCTION fetch_and_store_comments_for_video(
    p_video_id text,
    project_id bigint
)
RETURNS text AS $$
DECLARE
    api_response JSONB;
    next_page_token TEXT := NULL;
BEGIN
    LOOP
        -- Busca comentários da API (paginado)
        SELECT get_youtube_video_comments(
            project_id := project_id,
            video_id := p_video_id,
            max_results := 100,
            page_token := next_page_token
        ) INTO api_response;

        -- Processa e insere comentários
        FOR comment_thread IN SELECT jsonb_array_elements(api_response->'items')
        LOOP
            -- INSERT em Comentarios_Principais
            INSERT INTO "Comentarios_Principais" (...) VALUES (...);

            -- INSERT respostas em Respostas_Comentarios
            FOR reply IN SELECT jsonb_array_elements(comment_thread->'replies')
            LOOP
                INSERT INTO "Respostas_Comentarios" (...) VALUES (...);
            END LOOP;
        END LOOP;

        -- Próxima página
        next_page_token := api_response->>'nextPageToken';
        EXIT WHEN next_page_token IS NULL;
    END LOOP;

    RETURN 'Processo concluído com sucesso';
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Circuit Breaker (Status Updates)
```sql
-- Tabela de log
CREATE TABLE stats_execution_log (
    id SERIAL PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Verificação
IF execution_count >= 100 THEN
    RETURN; -- Para temporariamente
END IF;
```

### 2. Batch Processing
- **Stats**: 10 vídeos por batch, intervalo 7s
- **Comments**: 10 vídeos por batch, intervalo 5s

### 3. Paginação Automática
```sql
LOOP
    -- Busca 100 comentários
    -- Verifica nextPageToken
    EXIT WHEN next_page_token IS NULL;
END LOOP;
```

### 4. Tratamento de Comentários Desativados
```sql
IF api_response->>'error' = 'commentsDisabled' THEN
    UPDATE "Videos"
    SET comentarios_desativados = true,
        comentarios_atualizados = true
    WHERE id = video_id;
END IF;
```

---

## ⚠️ BUG CRÍTICO: process_videos_batch linha 58

### Problema
Quando todos os comentários são processados, a função `process_videos_batch()` **reverte** o status de '3' para '2', criando um loop infinito.

### Código Atual (ERRADO)
```sql
-- Linha 56-59 de process_videos_batch.sql
-- Atualiza o status do projeto para 2 quando todos os comentários foram processados
UPDATE public."Projeto"
SET status = '2'  -- ❌ ERRADO!
WHERE id = project_id;
```

### Correção Necessária
```sql
-- Linha 56-59 de process_videos_batch.sql (CORRIGIDO)
-- Atualiza o status do projeto para 3 quando todos os comentários foram processados
UPDATE public."Projeto"
SET status = '3'  -- ✅ CORRETO!
WHERE id = project_id;
```

### Impacto do Bug
1. `update_video_stats()` termina e chama `start_video_processing()`
2. `start_video_processing()` muda status para '3' corretamente
3. Mas depois chama `process_videos_batch()`
4. `process_videos_batch()` termina e **reverte** para status '2'
5. Trigger detecta mudança para '2' e recomeça o ciclo
6. **Loop infinito entre STATUS 2 ↔ 3**

Ver detalhes completos em `../BUG_FIXES.md`

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo Fase Stats | 10-30 min |
| Tempo Fase Comments | 20-90 min |
| Vídeos Processados | 50-500 vídeos |
| Comentários Coletados | 1000-50000 |
| Taxa de Sucesso (Stats) | > 98% |
| Taxa de Sucesso (Comments) | > 95% |
| API Quota Used | 5000-20000 units |

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline travado em STATUS 2 por horas
**Sintomas**:
- Status permanece em '2'
- Alguns vídeos ainda têm `stats_atualizadas = false`

**Diagnóstico**:
```sql
-- Ver vídeos pendentes (stats)
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND v.stats_atualizadas = false;

-- Ver vídeos pendentes (comments)
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND v.comentarios_atualizados = false
AND v.comentarios_desativados = false;

-- Verificar circuit breaker
SELECT COUNT(*)
FROM stats_execution_log
WHERE executed_at >= NOW() - INTERVAL '1 hour';
```

**Soluções**:
1. **Circuit breaker ativo** (>100 exec/hora):
```sql
-- Limpar log
DELETE FROM stats_execution_log
WHERE executed_at < NOW() - INTERVAL '1 hour';

-- Esperar 1 hora ou forçar
SELECT update_video_stats({project_id}, 10);
```

2. **API YouTube com erro**:
```sql
-- Ver logs da Edge Function
-- Pode ser quota excedida, vídeo privado, etc.

-- Marcar vídeo como processado manualmente
UPDATE "Videos"
SET stats_atualizadas = true
WHERE id = {video_id};
```

3. **Loop STATUS 2 ↔ 3** (BUG identificado):
```sql
-- Aplicar correção em process_videos_batch.sql linha 58
-- Mudar: SET status = '2' → SET status = '3'
```

### Problema: Comentários não sendo salvos
**Sintomas**:
- Video marcado como `comentarios_atualizados = true`
- Mas tabela `Comentarios_Principais` vazia

**Diagnóstico**:
```sql
-- Ver se comentários existem
SELECT COUNT(*)
FROM "Comentarios_Principais"
WHERE video_id = {video_id};

-- Ver se comentários estão desativados
SELECT comentarios_desativados
FROM "Videos"
WHERE id = {video_id};
```

**Possíveis Causas**:
1. Comentários desativados no YouTube
2. Vídeo é privado ou deletado
3. API retornou erro 403

---

## 🎯 MAPA MENTAL

```
        ┌────────────────────────────────────────┐
        │         STATUS 2 (Entry Point)         │
        └──────────────────┬─────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
    ┌──────────────┐              ┌──────────────┐
    │  FASE 1:     │              │  FASE 2:     │
    │  VIDEO STATS │ ───(ao fim)─→│  COMMENTS    │
    └──────┬───────┘              └──────┬───────┘
           │                              │
           ▼                              ▼
    update_video_stats()          process_videos_batch()
           │                              │
           ├─ 10 vídeos/batch             ├─ 10 vídeos/batch
           ├─ Intervalo 7s                ├─ Intervalo 5s
           ├─ Circuit breaker             ├─ Paginação automática
           └─ API: get_video_stats()      └─ API: get_comments()
           │                              │
           ▼                              ▼
    UPDATE Videos.stats            INSERT Comentarios_Principais
    (views, likes, comments)       INSERT Respostas_Comentarios
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │ Todos vídeos processados?    │
           └──────────────┬───────────────┘
                          │
           ┌──────────────┴──────────────┐
           │ SIM                         │ NÃO
           ▼                             ▼
    ┌──────────────┐              ┌──────────────┐
    │ ⚠️ BUG:      │              │ Continua     │
    │ status='2'   │              │ processando  │
    │ (cria loop)  │              └──────────────┘
    └──────────────┘
           │
           │ (DEVERIA SER status='3')
           ▼
    ┌──────────────┐
    │  STATUS 3    │
    │ (Analysis)   │
    └──────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

### SQL Functions (Numeradas por Ordem de Execução)
- `01_update_video_stats.sql` - Função MÃE (Fase Stats)
- `02_call_youtube_edge_function.sql` - Helper para Edge Function
- `03_start_video_processing.sql` - Função MÃE (Fase Comments)
- `04_process_pending_videos.sql` - Iterator de vídeos pendentes
- `05_process_videos_batch.sql` - Batch processor ⚠️ **BUG linha 58**
- `06_fetch_and_store_comments_for_video.sql` - Core function
- `07_get_youtube_video_comments.sql` - API caller

### Edge Functions
- `08_Edge_Function_bright-function.ts` - Busca stats do YouTube via API

### Arquivadas (_Archived/)
- `get_youtube_video_stats.sql` - Não usada
- `update_video_stats_safe.sql` - Duplicata

### Documentação
- `README.md` - Este arquivo
- `../BUG_FIXES.md` - Detalhes completos do bug

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 2→3 bem-sucedido:

- [ ] Todos os vídeos têm `stats_atualizadas = true`
- [ ] Todos os vídeos têm `comentarios_atualizados = true`
- [ ] Comentários principais salvos em `Comentarios_Principais`
- [ ] Respostas salvas em `Respostas_Comentarios`
- [ ] Vídeos com comentários desativados marcados corretamente
- [ ] ⚠️ Status mudou para '3' (não '2')
- [ ] Jobs de stats e comments removidos do pg_cron
- [ ] Nenhum loop detectado nos logs

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0