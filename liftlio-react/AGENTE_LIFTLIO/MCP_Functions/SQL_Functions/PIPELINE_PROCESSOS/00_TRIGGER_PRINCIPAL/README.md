# 🎬 TRIGGER PRINCIPAL - Orquestrador do Pipeline

**Status**: N/A (Trigger automático)
**Função Principal**: `schedule_process_project()`
**Tipo**: Database Trigger
**Disparo**: `AFTER UPDATE` na tabela `Projeto`

---

## 📋 VISÃO GERAL

O Trigger Principal é o **cérebro do pipeline**. Ele detecta mudanças no campo `status` da tabela `Projeto` e automaticamente cria jobs no `pg_cron` para processar a próxima etapa.

---

## 🎯 FUNÇÕES NESTE MÓDULO

### 1. `schedule_process_project()`
**Tipo**: Trigger Function
**Disparo**: Quando `Projeto.status` é atualizado
**Responsabilidade**: Criar jobs pg_cron baseado no novo status

---

## 🔄 FLUXO DETALHADO

```
┌────────────────────────────────────────────────────────────┐
│                    TRIGGER AUTOMÁTICO                       │
│                                                             │
│  UPDATE Projeto SET status = 'X'                           │
│            │                                                │
│            ▼                                                │
│  schedule_process_project() é executado                    │
│            │                                                │
│            ▼                                                │
│  Detecta o novo status                                     │
│            │                                                │
│            ├─ status = '0' → Cria job para STATUS_0        │
│            ├─ status = '1' → Cria job para STATUS_1        │
│            ├─ status = '2' → Cria job para STATUS_2        │
│            ├─ status = '3' → Cria job para STATUS_3        │
│            ├─ status = '4' → Cria job para STATUS_4        │
│            └─ status = '5' → Cria job para STATUS_5        │
│                       │                                     │
│                       ▼                                     │
│            pg_cron.schedule() é chamado                    │
│                       │                                     │
│                       ▼                                     │
│            Job agendado e executado                        │
└────────────────────────────────────────────────────────────┘
```

---

## 🧠 LÓGICA DE DECISÃO

### STATUS 0 → Inicia STATUS_0
```sql
SELECT cron.schedule(
  'process_project_' || NEW.id,
  '5 seconds',
  format('SELECT atualizar_scanner_rodada(%s)', NEW.id)
);
```

### STATUS 1 → Inicia STATUS_1
```sql
SELECT cron.schedule(
  'process_scanner_' || NEW.id,
  '30 seconds',
  format('SELECT process_next_project_scanner(%s)', NEW.id)
);
```

### STATUS 2 → Inicia STATUS_2 (Stats e Comments)
```sql
SELECT cron.schedule(
  'update_stats_' || NEW.id,
  '7 seconds',
  format('SELECT update_video_stats(%s, 10)', NEW.id)
);
```

### STATUS 3 → Inicia STATUS_3 (Video Analysis)
```sql
SELECT cron.schedule(
  'analyze_videos_' || NEW.id,
  '30 seconds',
  format('SELECT start_video_analysis_processing(%s, 5)', NEW.id)
);
```

### STATUS 4 → Inicia STATUS_4 (Comment Analysis)
```sql
SELECT cron.schedule(
  'analyze_comments_' || NEW.id,
  '15 seconds',
  format('SELECT start_comment_analysis_processing(%s, 10)', NEW.id)
);
```

### STATUS 5 → Inicia STATUS_5 (Engagement Messages)
```sql
SELECT cron.schedule(
  'create_messages_' || NEW.id,
  '30 seconds',
  format('SELECT start_engagement_messages_processing(%s, 5)', NEW.id)
);
```

---

## 📊 JOBS CRIADOS POR STATUS

| Status | Job Name | Intervalo | Função Chamada | Batch Size |
|--------|----------|-----------|----------------|------------|
| 0 | `process_project_{id}` | 5s | `atualizar_scanner_rodada()` | N/A |
| 1 | `process_scanner_{id}` | 30s | `process_next_project_scanner()` | 1 scanner |
| 2 | `update_stats_{id}` | 7s | `update_video_stats()` | 10 vídeos |
| 3 | `analyze_videos_{id}` | 30s | `start_video_analysis_processing()` | 5 vídeos |
| 4 | `analyze_comments_{id}` | 15s | `start_comment_analysis_processing()` | 10 comments |
| 5 | `create_messages_{id}` | 30s | `start_engagement_messages_processing()` | 5 comments |

---

## 🔧 COMO FUNCIONA INTERNAMENTE

### 1. Trigger é Disparado
```sql
CREATE TRIGGER trigger_schedule_process_project
AFTER UPDATE ON "Projeto"
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION schedule_process_project();
```

### 2. Função Verifica o Status
```sql
IF NEW.status = '0' THEN
  -- Cria job para STATUS_0
ELSIF NEW.status = '1' THEN
  -- Cria job para STATUS_1
-- ... etc
END IF;
```

### 3. Job é Agendado no pg_cron
```sql
SELECT cron.schedule(
  'nome_do_job',
  'intervalo',
  'SELECT funcao_a_executar()'
);
```

### 4. Job Executa Repetidamente
- O job roda no intervalo definido
- A função verifica se há trabalho pendente
- Se não há mais trabalho, o job se auto-remove
- Se há mais trabalho, continua executando

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Verificação de Status Anterior
```sql
-- Remove job anterior se existir
IF EXISTS (
  SELECT 1 FROM cron.job
  WHERE jobname = 'job_anterior_' || NEW.id
) THEN
  PERFORM cron.unschedule('job_anterior_' || NEW.id);
END IF;
```

### 2. Job Único por Projeto
```sql
-- Nome do job inclui ID do projeto
'process_project_' || NEW.id
```

### 3. Auto-limpeza
- Cada função de status verifica se há trabalho pendente
- Se não há, remove o job do pg_cron automaticamente
- Evita jobs órfãos no sistema

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline não inicia após mudar status
**Possível Causa**: Trigger não está ativo
**Solução**:
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger
WHERE tgname = 'trigger_schedule_process_project';

-- Recriar trigger se necessário
CREATE TRIGGER trigger_schedule_process_project
AFTER UPDATE ON "Projeto"
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION schedule_process_project();
```

### Problema: Job não é criado no pg_cron
**Possível Causa**: Extensão pg_cron não habilitada
**Solução**:
```sql
-- Verificar extensão
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Habilitar se necessário
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Problema: Jobs duplicados
**Possível Causa**: Job anterior não foi removido
**Solução**:
```sql
-- Listar jobs ativos
SELECT * FROM cron.job WHERE jobname LIKE 'process_%';

-- Remover job duplicado
SELECT cron.unschedule('nome_do_job');
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver todos os jobs ativos do projeto
```sql
SELECT * FROM cron.job
WHERE jobname LIKE '%' || {project_id} || '%';
```

### Ver histórico de execução de jobs
```sql
SELECT * FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname LIKE '%' || {project_id} || '%'
)
ORDER BY start_time DESC
LIMIT 20;
```

### Ver último status do projeto
```sql
SELECT id, status, updated_at
FROM "Projeto"
WHERE id = {project_id};
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────────┐
                    │   UPDATE Projeto.status │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  schedule_process_      │
                    │      project()          │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
        ┌────────────┐  ┌────────────┐  ┌────────────┐
        │ Status 0-1 │  │ Status 2-3 │  │ Status 4-5 │
        │   Jobs     │  │   Jobs     │  │   Jobs     │
        └────────────┘  └────────────┘  └────────────┘
                 │               │               │
                 ▼               ▼               ▼
            pg_cron.schedule() executa funções
                 │               │               │
                 ▼               ▼               ▼
           Próximo STATUS (auto-transition)
```

---

## 📁 ARQUIVOS RELACIONADOS

- **SQL**: `schedule_process_project.sql`
- **Dependências**: Nenhuma (é o ponto de entrada)
- **Dependentes**: Todas as funções de STATUS

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0