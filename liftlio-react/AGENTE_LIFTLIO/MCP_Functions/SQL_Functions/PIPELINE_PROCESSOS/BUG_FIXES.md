# 🐛 BUGS CONHECIDOS E CORREÇÕES

**Última Atualização**: 2025-01-30
**Status**: Pendente de Aplicação

---

## ⚠️ BUG CRÍTICO #1: Loop Infinito STATUS 2 ↔ 3

### 📋 RESUMO
A função `process_videos_batch()` está **revertendo o status de '3' para '2'** ao invés de mantê-lo ou avançá-lo, criando um loop infinito entre STATUS 2 e 3.

---

### 🔍 DETALHES TÉCNICOS

**Arquivo Afetado**:
```
/STATUS_2_VIDEO_STATS/process_videos_batch.sql
```

**Linha**: 58

**Severidade**: 🔴 CRÍTICA

**Impacto**:
- Pipeline nunca avança para STATUS 3 (Video Analysis)
- Processamento infinito de comentários
- Consumo desnecessário de recursos
- API quota desperdício

---

### 🧬 ANÁLISE DA CAUSA RAIZ

#### Fluxo Esperado (CORRETO)
```
STATUS 2: update_video_stats()
    ↓
Busca stats de vídeos (views, likes, comments)
    ↓
Quando termina stats → Chama start_video_processing()
    ↓
start_video_processing() → UPDATE status = '3' ✅
    ↓
start_video_processing() → Chama process_videos_batch()
    ↓
process_videos_batch() → Processa comentários
    ↓
Quando termina comentários → DEVERIA manter status = '3' ✅
    ↓
STATUS 3: Avança para Video Analysis
```

#### Fluxo Atual (ERRADO)
```
STATUS 2: update_video_stats()
    ↓
Busca stats de vídeos
    ↓
Quando termina stats → Chama start_video_processing()
    ↓
start_video_processing() → UPDATE status = '3' ✅
    ↓
start_video_processing() → Chama process_videos_batch()
    ↓
process_videos_batch() → Processa comentários
    ↓
Quando termina comentários → UPDATE status = '2' ❌ (BUG!)
    ↓
Trigger detecta mudança para '2' e recomeça o ciclo
    ↓
LOOP INFINITO 2 ↔ 3
```

---

### 📍 CÓDIGO ATUAL (ERRADO)

**Arquivo**: `process_videos_batch.sql`
**Linhas**: 54-60

```sql
-- Verifica se ainda há vídeos pendentes
IF EXISTS (
  SELECT 1
  FROM "Videos" v
  JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
  WHERE s."Projeto_id" = project_id
    AND v.comentarios_atualizados = false
    AND v.comentarios_desativados = false
) THEN
  -- Agenda a próxima execução
  PERFORM cron.schedule(
    'process_videos_' || project_id::text,
    '5 seconds',
    format('SELECT process_videos_batch(%s, %s)', project_id, batch_size)
  );
ELSE
  -- Verifica se o job existe antes de tentar removê-lo
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process_videos_' || project_id::text
  ) INTO job_exists;

  -- Remove o job agendado apenas se ele existir
  IF job_exists THEN
    PERFORM cron.unschedule('process_videos_' || project_id::text);
  END IF;

  -- ❌ BUG: Atualiza o status do projeto para 2 quando todos os comentários foram processados
  UPDATE public."Projeto"
  SET status = '2'  -- ❌ ERRADO! REVERTE PARA STATUS 2
  WHERE id = project_id;
END IF;
```

---

### ✅ CORREÇÃO NECESSÁRIA

**Arquivo**: `process_videos_batch.sql`
**Linhas**: 56-59

```sql
-- Remove a seção do ELSE que atualiza o status
-- Comentários já foram processados, status já está em '3' graças a start_video_processing()

ELSE
  -- Verifica se o job existe antes de tentar removê-lo
  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process_videos_' || project_id::text
  ) INTO job_exists;

  -- Remove o job agendado apenas se ele existir
  IF job_exists THEN
    PERFORM cron.unschedule('process_videos_' || project_id::text);
  END IF;

  -- ✅ CORREÇÃO: Não altera status aqui
  -- O status já foi corretamente definido para '3' por start_video_processing()
  -- Deixar o status como está permite que o pipeline avance para STATUS 3

  -- REMOVIDO:
  -- UPDATE public."Projeto"
  -- SET status = '2'
  -- WHERE id = project_id;
END IF;
```

**Alternativa** (se houver necessidade de confirmar o status):
```sql
-- ✅ ALTERNATIVA: Garantir que status está em '3'
UPDATE public."Projeto"
SET status = '3'  -- ✅ CORRETO! Mantém ou avança para STATUS 3
WHERE id = project_id;
```

---

### 🧪 COMO TESTAR A CORREÇÃO

#### 1. Antes da Correção (Verificar Bug)
```sql
-- 1. Criar projeto de teste
INSERT INTO "Projeto" (nome, status) VALUES ('Teste Bug', '2');

-- 2. Monitorar mudanças de status
SELECT id, status, updated_at
FROM "Projeto"
WHERE nome = 'Teste Bug'
ORDER BY updated_at DESC;

-- Resultado Esperado (BUG):
-- status oscila entre '2' e '3' indefinidamente
```

#### 2. Após Correção (Verificar Sucesso)
```sql
-- 1. Aplicar correção em process_videos_batch.sql

-- 2. Criar novo projeto de teste
INSERT INTO "Projeto" (nome, status) VALUES ('Teste Correção', '2');

-- 3. Monitorar mudanças de status
SELECT id, status, updated_at
FROM "Projeto"
WHERE nome = 'Teste Correção'
ORDER BY updated_at DESC;

-- Resultado Esperado (CORRETO):
-- Status 2 → Status 3 → Status 4 → ... (sem loop)
```

#### 3. Query de Diagnóstico
```sql
-- Ver histórico de mudanças de status
SELECT
    id,
    status,
    updated_at,
    LAG(status) OVER (ORDER BY updated_at) as status_anterior,
    LAG(updated_at) OVER (ORDER BY updated_at) as mudanca_anterior
FROM "Projeto"
WHERE id = {project_id}
ORDER BY updated_at DESC
LIMIT 20;

-- Se há loop, você verá:
-- status='3', status_anterior='2'
-- status='2', status_anterior='3'  ← Indicador de loop!
-- status='3', status_anterior='2'
```

---

### 📊 IMPACTO DO BUG

#### Recursos Desperdiçados
| Recurso | Impacto |
|---------|---------|
| CPU | Processamento infinito |
| API Quota (YouTube) | Requisições duplicadas |
| API Quota (Claude) | N/A (não chega no STATUS 3) |
| Banco de Dados | Queries repetidas |
| pg_cron Jobs | Jobs duplicados |

#### Projetos Afetados
```sql
-- Ver projetos potencialmente afetados
SELECT
    p.id,
    p.nome,
    p.status,
    p.updated_at,
    COUNT(v.id) as total_videos,
    COUNT(v.id) FILTER (WHERE v.comentarios_atualizados = true) as videos_com_comentarios
FROM "Projeto" p
JOIN "Scanner de videos do youtube" s ON s."Projeto_id" = p.id
JOIN "Videos" v ON v.scanner_id = s.id
WHERE p.status IN ('2', '3')
GROUP BY p.id, p.nome, p.status, p.updated_at
HAVING COUNT(v.id) FILTER (WHERE v.comentarios_atualizados = true) = COUNT(v.id);

-- Projetos listados aqui estão potencialmente travados no loop
```

---

### 🚀 PLANO DE APLICAÇÃO DA CORREÇÃO

#### Passo 1: Backup
```sql
-- Backup da função atual
CREATE TABLE process_videos_batch_backup AS
SELECT * FROM pg_proc
WHERE proname = 'process_videos_batch';
```

#### Passo 2: Aplicar Correção
```sql
-- Aplicar a correção via MCP Supabase
-- ou editando diretamente no Dashboard
```

#### Passo 3: Limpar Projetos Travados
```sql
-- Identificar projetos travados
UPDATE "Projeto"
SET status = '3'
WHERE status = '2'
AND id IN (
    SELECT DISTINCT p.id
    FROM "Projeto" p
    JOIN "Scanner de videos do youtube" s ON s."Projeto_id" = p.id
    JOIN "Videos" v ON v.scanner_id = s.id
    WHERE p.status = '2'
    GROUP BY p.id
    HAVING COUNT(v.id) FILTER (WHERE v.comentarios_atualizados = true) = COUNT(v.id)
);
```

#### Passo 4: Verificar Jobs Órfãos
```sql
-- Remover jobs órfãos
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE 'process_videos_%'
AND NOT EXISTS (
    SELECT 1 FROM "Projeto"
    WHERE id = SUBSTRING(jobname FROM 'process_videos_(\d+)')::integer
    AND status = '2'
);
```

---

### 📝 CHECKLIST DE CORREÇÃO

- [ ] Backup da função `process_videos_batch` criado
- [ ] Correção aplicada no código SQL
- [ ] Função `process_videos_batch` atualizada no Supabase
- [ ] Teste com projeto de teste executado
- [ ] Projetos travados identificados e corrigidos
- [ ] Jobs órfãos do pg_cron removidos
- [ ] Monitoramento de 24h para garantir que loop não ocorre mais
- [ ] Documentação atualizada
- [ ] Equipe notificada da correção

---

### 🔗 ARQUIVOS RELACIONADOS

- **Função com Bug**: `/STATUS_2_VIDEO_STATS/process_videos_batch.sql`
- **Funções Relacionadas**:
  - `/STATUS_2_VIDEO_STATS/update_video_stats.sql`
  - `/STATUS_2_VIDEO_STATS/start_video_processing.sql`
  - `/STATUS_2_VIDEO_STATS/process_pending_videos.sql`
- **Documentação**: `/STATUS_2_VIDEO_STATS/README.md`

---

### 📧 CONTATO

**Descoberto por**: Claude Code (Anthropic)
**Data**: 2025-01-30
**Prioridade**: 🔴 CRÍTICA
**Status**: ⏳ Aguardando Aplicação

---

## 📊 HISTÓRICO DE BUGS

### Bug #1 - Loop STATUS 2 ↔ 3
- **Descoberto**: 2025-01-30
- **Status**: Pendente
- **Severidade**: Crítica
- **Arquivo**: `process_videos_batch.sql:58`

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0