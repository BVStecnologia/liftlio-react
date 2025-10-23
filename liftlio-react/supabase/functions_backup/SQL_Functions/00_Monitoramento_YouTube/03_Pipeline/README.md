# Pipeline de Monitoramento Completo

## 📋 Visão Geral

A função `pipeline_monitoramento_completo()` é um **wrapper inteligente** que executa todo o pipeline de monitoramento YouTube em sequência:

```
1. Calcular Ranking → 2. Monitorar Canais → 3. Processar Vídeos
```

---

## 🔄 Fluxo de Execução

```
Para cada projeto com "Youtube Active" = TRUE:
│
├─ ✅ Verificar Mentions disponíveis
│   └─ Se = 0: Pula projeto
│
├─ 📊 ETAPA 1: Calcular Ranking
│   └─ calcular_ranking_canais_projeto(project_id)
│       ├─ Calcula ranking_score (40% leads + 30% engagement...)
│       └─ Atribui rank_position (1, 2, 3...)
│
├─ 🎥 ETAPA 2: Monitorar Top Channels
│   └─ monitor_top_channels_for_project(project_id)
│       ├─ Pega top N canais por rank_position
│       ├─ Verifica Anti-Spam (can_comment_on_channel)
│       └─ Processa vídeos do campo "processar"
│
└─ 📈 ETAPA 3: Retornar Estatísticas
    └─ canais_ranqueados, canais_processados, mensagens_criadas
```

---

## 🧪 Como Testar

### 1. Criar a função no Supabase

```sql
-- Copiar TODO o conteúdo de:
-- pipeline_monitoramento_completo.sql

-- Colar no SQL Editor do Supabase
-- Executar (já tem DROP FUNCTION IF EXISTS)
```

### 2. Testar manualmente

```sql
-- Executar pipeline para todos os projetos
SELECT * FROM pipeline_monitoramento_completo();
```

**Resultado esperado:**
```
projeto_id | canais_ranqueados | canais_processados | canais_pulados | mensagens_criadas | success | error_message
-----------+-------------------+--------------------+----------------+-------------------+---------+--------------
117        | 6                 | 6                  | 0              | 3                 | true    | null
71         | 0                 | 0                  | 0              | 0                 | true    | Sem Mentions...
```

### 3. Verificar logs

```sql
SELECT
    operation,
    details,
    success,
    created_at
FROM system_logs
WHERE operation LIKE 'PIPELINE%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## ⏰ Configurar CRON

### Criar CRON no Supabase

```sql
SELECT cron.schedule(
    'pipeline_monitoramento_completo',
    '30 */3 * * *',  -- A cada 3 horas com offset de 30min
    $$SELECT * FROM pipeline_monitoramento_completo()$$
);
```

### Horários de execução:

```
00:30 → Pipeline completo
03:30 → Pipeline completo
06:30 → Pipeline completo
09:30 → Pipeline completo
12:30 → Pipeline completo
15:30 → Pipeline completo
18:30 → Pipeline completo
21:30 → Pipeline completo
```

**Offset de 30min** para evitar conflito com `atualizar_canais_ativos()` (que roda a cada 6h às horas exatas).

---

## 🔧 Gerenciar CRON

### Ver se CRON foi criado:
```sql
SELECT * FROM cron.job
WHERE jobname = 'pipeline_monitoramento_completo';
```

### Ver execuções recentes:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (
    SELECT jobid FROM cron.job
    WHERE jobname = 'pipeline_monitoramento_completo'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Desativar CRON (se necessário):
```sql
SELECT cron.unschedule('pipeline_monitoramento_completo');
```

### Reativar CRON:
```sql
-- Executar novamente o SELECT cron.schedule(...)
```

---

## 📊 Monitoramento

### Dashboard de Estatísticas

```sql
-- Últimas 24h de execuções
SELECT
    DATE_TRUNC('hour', created_at) as hora,
    COUNT(*) FILTER (WHERE operation = 'PIPELINE_SUCCESS') as sucessos,
    COUNT(*) FILTER (WHERE operation = 'PIPELINE_ERROR') as erros,
    COUNT(*) FILTER (WHERE operation = 'PIPELINE_SKIPPED') as pulados
FROM system_logs
WHERE operation LIKE 'PIPELINE%'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC;
```

### Projetos Processados

```sql
-- Ver quais projetos foram processados hoje
SELECT DISTINCT
    (details::text) as projeto_info
FROM system_logs
WHERE operation = 'PIPELINE_SUCCESS'
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🚨 Troubleshooting

### Problema: Nenhum canal processado

**Causa:** `rank_position` está NULL

**Solução:**
```sql
-- Rodar manualmente o cálculo de ranking
SELECT * FROM calcular_ranking_canais_projeto(117);
```

### Problema: Campo "processar" vazio

**Causa:** `verificar_novos_videos_youtube()` não está populando

**Solução:** Verificar CRON de descoberta de vídeos

### Problema: Erro de schema em system_logs

**Causa:** Função usando campos antigos (level, message, function_name)

**Solução:** Atualizar função para usar (operation, details, success)

---

## 📈 Performance

### Tempo de Execução Estimado

- **1 projeto com 6 canais**: ~5-10 segundos
- **5 projetos**: ~30-60 segundos
- **Depende de:**
  - Quantidade de canais por projeto
  - Quantidade de vídeos no campo "processar"
  - Latência da YouTube API (via process_channel_videos)

### Otimizações

- ✅ Error handling por projeto (não trava tudo)
- ✅ Logs detalhados em cada etapa
- ✅ Skip automático se sem Mentions
- ✅ Processamento em lote (todos projetos de uma vez)

---

## 🎯 Integração com Outros Sistemas

### Pipeline Completo do Sistema

```
┌─────────────────────────────────────────┐
│ verificar_novos_videos_youtube (45min)  │ ← Descobre vídeos
│ └─ Adiciona ao campo "processar"        │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ atualizar_canais_ativos (6h)            │ ← Gerencia canais ativos
│ └─ Verifica Mentions, ativa/desativa    │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ pipeline_monitoramento_completo (3h)    │ ← Este!
│ ├─ Calcula ranking                      │
│ └─ Monitora e processa vídeos           │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ process_monitored_videos (5min)         │ ← Analisa com Claude AI
│ └─ Cria mensagens High potential        │
└─────────────────────────────────────────┘
```

---

## 📝 Manutenção

### Atualizar Pesos do Ranking

Editar `calcular_ranking_canais_projeto.sql`:

```sql
-- Linha 31-38 (pesos atuais):
COALESCE(total_leads, 0) * 0.4 +              -- 40%
COALESCE(engagement_rate, 0) * 100 * 0.3 +    -- 30%
COALESCE(subscriber_count, 0)::numeric / 1000 * 0.2 +  -- 20%
recencia * 0.1                                  -- 10%
```

### Adicionar Nova Etapa ao Pipeline

Editar `pipeline_monitoramento_completo.sql`, adicionar ETAPA 3:

```sql
-- ETAPA 3: Nova funcionalidade
SELECT * INTO v_nova_result
FROM nova_funcao(projeto_record.id);
```

---

## ✅ Checklist de Deploy

- [ ] Criar `calcular_ranking_canais_projeto()` no Supabase
- [ ] Criar `monitor_top_channels_for_project()` no Supabase
- [ ] Criar `pipeline_monitoramento_completo()` no Supabase
- [ ] Testar manualmente com `SELECT * FROM pipeline_monitoramento_completo()`
- [ ] Verificar logs em `system_logs`
- [ ] Criar CRON job
- [ ] Monitorar primeiras execuções
- [ ] Validar mensagens sendo criadas
