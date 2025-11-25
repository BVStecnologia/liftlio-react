# Pipeline 2 - Sistema de Processamento de Videos

**Ultima Atualizacao:** 2025-11-25
**Status:** EM PRODUCAO

---

## Visao Geral

Pipeline 2 e o sistema de processamento automatico de videos do YouTube para o Liftlio.
Processa videos em 6 steps (0-5), com rotacao circular de scanners e historico completo.

---

## ORDEM DE EXECUCAO (00 → 19)

```
CRON (30 segundos)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  01_process_all_projects_pipeline2()  ← CHAMADO PELO CRON   │
│      Loop: todos projetos com status 0-5                     │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  02_pipeline2_process_project(project_id)              │ │
│  │      ORQUESTRADOR PRINCIPAL                            │ │
│  │                                                        │ │
│  │  ┌─ STATUS 0:                                          │ │
│  │  │   Marca scanners rodada=1, muda status→1            │ │
│  │  │                                                     │ │
│  │  ├─ RODADA=1:                                          │ │
│  │  │   → update_video_id_cache() [EXTERNA]               │ │
│  │  │   Busca IDs do YouTube                              │ │
│  │  │                                                     │ │
│  │  ├─ PARTE 1: Inicializar                               │ │
│  │  │   → 04_initialize_scanner_processing()              │ │
│  │  │   Cria linhas + move IDs para Verificado            │ │
│  │  │                                                     │ │
│  │  └─ PARTE 2: Processar                                 │ │
│  │      → 05_process_scanner_videos()                     │ │
│  │              │                                         │ │
│  │              ▼                                         │ │
│  │      ┌─────────────────────────────────────────────┐   │ │
│  │      │  06_process_pipeline_step_for_video()       │   │ │
│  │      │      Executa step correto para cada video   │   │ │
│  │      │                                             │   │ │
│  │      │  Step 0 → 07_process_step_1_criar_video     │   │ │
│  │      │  Step 1 → 08_process_step_2_buscar_coment   │   │ │
│  │      │  Step 2 → 09_process_step_3_curar_video     │   │ │
│  │      │  Step 3 → 10_process_step_4_analisar_coment │   │ │
│  │      │  Step 4 → 11_process_step_5_criar_mensagens │   │ │
│  │      │  Step 5 → Marca pipeline_completo = TRUE    │   │ │
│  │      └─────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  → 12_update_project_status_from_pipeline()            │ │
│  │    Sincroniza status do projeto                        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## TRIGGER DE INICIO IMEDIATO

```
Usuario muda status para 0
       │
       ▼
03_trigger_pipeline2_status_0()
       │
       ▼
Cria job de 2 segundos → chama 02_pipeline2_process_project()
       │
       ▼
Job se auto-remove apos executar
```

---

## Tabela de Funcoes (00-19)

### FLUXO PRINCIPAL (00-12)

| # | Arquivo | Funcao | Quando Executa |
|---|---------|--------|----------------|
| 00 | `00_ALTER_TABLE_add_video_fields.sql` | - | Schema DDL |
| 01 | `01_process_all_projects_pipeline2.sql` | `process_all_projects_pipeline2()` | **CRON 30s** |
| 02 | `02_pipeline2_process_project.sql` | `pipeline2_process_project(project_id)` | **ORQUESTRADOR** |
| 03 | `03_trigger_pipeline2_status_0.sql` | `trigger_pipeline2_status_0()` | Inicio imediato |
| 04 | `04_initialize_scanner_processing.sql` | `initialize_scanner_processing(scanner_id)` | Cache → Pipeline |
| 05 | `05_process_scanner_videos.sql` | `process_scanner_videos(scanner_id)` | Por scanner |
| 06 | `06_process_pipeline_step_for_video.sql` | `process_pipeline_step_for_video(video_id)` | Router de steps |
| 07 | `07_process_step_1_criar_video.sql` | `process_step_1_criar_video(video_id)` | Step 0→1 |
| 08 | `08_process_step_2_buscar_comentarios.sql` | `process_step_2_buscar_comentarios(video_id)` | Step 1→2 |
| 09 | `09_process_step_3_curar_video.sql` | `process_step_3_curar_video(video_id)` | Step 2→3 |
| 10 | `10_process_step_4_analisar_comentarios.sql` | `process_step_4_analisar_comentarios(video_id)` | Step 3→4 |
| 11 | `11_process_step_5_criar_mensagens.sql` | `process_step_5_criar_mensagens(video_id)` | Step 4→5 |
| 12 | `12_update_project_status_from_pipeline.sql` | `update_project_status_from_pipeline(project_id)` | Sync status |

### AUXILIARES (13-19)

| # | Arquivo | Funcao | Uso |
|---|---------|--------|-----|
| 13 | `13_setup_cron_job.sql` | `setup/stop/list_pipeline_cron_jobs()` | Gerenciar crons |
| 14 | `14_setup_fast_cron.sql` | `toggle_pipeline2_cron_speed()` | Alternar 30s/5min |
| 15 | `15_get_next_scanner_to_process.sql` | `get_next_scanner_to_process()` | Rotacao circular |
| 16 | `16_process_step_0_buscar_ids.sql` | `process_step_0_buscar_ids()` | Busca IDs (alternativa) |
| 17 | `17_process_next_project_scanner.sql` | `process_next_project_scanner()` | Orquestrador alternativo |
| 18 | `18_reset_scanner_processing.sql` | `reset_scanner_processing()` | Reset manual |
| 19 | `19_process_project_pipeline2_complete.sql` | `process_project_pipeline2_complete()` | **DEPRECADO** |

---

## Cron Ativo

```sql
-- Cron principal (roda a cada 30 segundos)
SELECT cron.schedule(
    'pipeline2_fast',
    '30 seconds',
    'SELECT process_all_projects_pipeline2()'
);

-- Verificar crons ativos
SELECT * FROM cron.job WHERE jobname LIKE 'pipeline2%';

-- Alternar velocidade (30s / 5min)
SELECT toggle_pipeline2_cron_speed(TRUE);  -- 30 segundos
SELECT toggle_pipeline2_cron_speed(FALSE); -- 5 minutos
```

---

## Tabela: pipeline_processing

```sql
-- Campos principais
id                          BIGSERIAL PRIMARY KEY
project_id                  BIGINT NOT NULL
scanner_id                  BIGINT NOT NULL
video_youtube_id            TEXT NOT NULL
video_db_id                 BIGINT
current_step                INTEGER DEFAULT 0
pipeline_completo           BOOLEAN DEFAULT FALSE

-- Tracking por step
video_criado                BOOLEAN DEFAULT FALSE
comentarios_buscados        BOOLEAN DEFAULT FALSE
video_curado                BOOLEAN DEFAULT FALSE
comentarios_analisados      BOOLEAN DEFAULT FALSE
mensagens_criadas           BOOLEAN DEFAULT FALSE

-- Timestamps
created_at                  TIMESTAMPTZ DEFAULT NOW()
pipeline_completo_at        TIMESTAMPTZ

-- Constraint
UNIQUE (scanner_id, video_youtube_id)
```

---

## Monitoramento

```sql
-- Ver progresso de um projeto
SELECT
    scanner_id,
    COUNT(*) as total,
    SUM(CASE WHEN pipeline_completo THEN 1 ELSE 0 END) as completos,
    AVG(current_step) as media_step
FROM pipeline_processing
WHERE project_id = 117
GROUP BY scanner_id;

-- Ver erros
SELECT video_youtube_id, video_error, comentarios_error
FROM pipeline_processing
WHERE video_error IS NOT NULL;

-- Ver logs do cron
SELECT * FROM cron.job_run_details
WHERE jobname = 'pipeline2_fast'
ORDER BY start_time DESC
LIMIT 10;
```

---

## Bugs Corrigidos (25/11/2025)

1. **IDs nao moviam para Verificado** - Corrigido em `initialize_scanner_processing()`
2. **Trigger inicio imediato faltando** - Criado `trigger_pipeline2_status_0()`
3. **Novos IDs nao inicializavam** - Corrigido verificacao do primeiro ID do cache
4. **Videos paravam apos init** - Adicionada PARTE 2 em `pipeline2_process_project()`
5. **Historico apagado** - Removido DELETE de `initialize_scanner_processing()`

---

## Funcoes Relacionadas (Nao Pipeline 2)

Estas funcoes existem no Supabase mas NAO fazem parte do Pipeline 2:

| Funcao | Sistema | Descricao |
|--------|---------|-----------|
| `atualizar_scanner_rodada` | Pipeline 1 | Marca scanners para processar (antigo) |
| `process_project` | Pipeline 1 | Orquestrador antigo |
| `process_project_step_1/2/3/4` | Pipeline 1 | Steps antigos |
| `process_youtube_scanner` | Pipeline 1 | Processador antigo |
| `schedule_process_project` | Pipeline 1 | Trigger antigo |
| `update_video_id_cache` | Cache | Busca IDs do YouTube |
| `update_scanner_cache_with_timeout` | Cache | Atualiza cache com timeout |
| `update_scanners_batch` | Cache | Batch update de scanners |
| `get_scanners_by_project` | Queries | Lista scanners |
| `get_youtube_scanner_stats` | Queries | Estatisticas |
| `create_scanner` | CRUD | Cria scanner |
| `create_youtube_scanners_for_project` | CRUD | Cria scanners do projeto |

---

## Verificacao de Integridade

```sql
-- Verificar se todas funcoes do Pipeline 2 existem
SELECT proname FROM pg_proc
JOIN pg_namespace ON pronamespace = pg_namespace.oid
WHERE nspname = 'public'
AND proname IN (
    'initialize_scanner_processing',
    'reset_scanner_processing',
    'get_next_scanner_to_process',
    'process_step_0_buscar_ids',
    'process_step_1_criar_video',
    'process_step_2_buscar_comentarios',
    'process_step_3_curar_video',
    'process_step_4_analisar_comentarios',
    'process_step_5_criar_mensagens',
    'process_pipeline_step_for_video',
    'process_scanner_videos',
    'process_next_project_scanner',
    'setup_pipeline_cron_job',
    'stop_pipeline_cron_job',
    'list_pipeline_cron_jobs',
    'update_project_status_from_pipeline',
    'toggle_pipeline2_cron_speed',
    'pipeline2_process_project',
    'process_all_projects_pipeline2',
    'trigger_pipeline2_status_0',
    'process_project_pipeline2_complete'
);
-- Esperado: 21 funcoes
```

---

## Documentacao Detalhada

Ver `PLANO.md` para arquitetura completa e mapas visuais.
