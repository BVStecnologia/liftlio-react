# 🎯 Pipeline Completo de Cron Jobs - YouTube Monitoring

## 📊 Visão Geral do Sistema

O Liftlio possui **2 sistemas de cron** rodando em paralelo:
- **Edge Function Crons** (Supabase Scheduler) - Processamento de YouTube
- **pg_cron Jobs** (PostgreSQL) - Manutenção e analytics

---

## 🎯 PIPELINE COMPLETO DO YOUTUBE

Ordem cronológica de execução (cascata):

### 1️⃣ `verificar_novos_videos_youtube` (A cada 1 hora)
```
Frequência: 0 * * * * (toda hora exata)
Tipo: Edge Function Cron
Função SQL: verificar_novos_videos_youtube(lote_tamanho INT DEFAULT 15)
```

**O que faz:**
- ✅ Busca novos vídeos dos canais top via YouTube Data API v3
- ✅ Compara com campo `videos_scanreados` para evitar duplicatas
- ✅ Atualiza `videos_scanreados` com TODOS os IDs verificados
- ✅ Envia novos vídeos para análise AI (`video-qualifier-wrapper`)
- ✅ Atualiza `processar` apenas com IDs aprovados pela AI

**Edge Functions usadas:**
- `check-youtube-videos` - Busca IDs de vídeos do canal
- `video-qualifier-wrapper` - Análise AI para aprovar/rejeitar vídeos

**Performance:** ~5-10s por execução (15 canais/lote)

**Constantes:**
- `lote_tamanho = 15` canais por execução
- `intervalo_minimo = 30 minutos` entre verificações do mesmo canal
- `timeout_ms = 60000` (60 segundos)

---

### 2️⃣ `process_monitored_videos` (A cada 2 horas)
```
Frequência: 0 */2 * * * (horas pares: 00:00, 02:00, 04:00...)
Tipo: Edge Function Cron
Função SQL: process_monitored_videos()
```

**O que faz:**
- ✅ Analisa vídeos no campo `processar` (já aprovados pela AI)
- ✅ Cria comentários automaticamente para vídeos classificados como "High"
- ✅ Marca vídeos processados

**Performance:** ~30-60s por execução

---

### 3️⃣ `atualizar_canais_ativos` (A cada 6 horas)
```
Frequência: 0 */6 * * * (00:00, 06:00, 12:00, 18:00)
Tipo: Edge Function Cron
Função SQL: atualizar_canais_ativos()
```

**O que faz:**
- ✅ Atualiza ranking dos canais baseado em atividade
- ✅ Recalcula métricas de performance
- ✅ Ajusta status de canais ativos

**Performance:** ~2-5s por execução

---

### 4️⃣ `processar_novos_canais_youtube` (1x ao dia - 00:00 UTC)
```
Frequência: 0 0 * * * (meia-noite UTC)
Tipo: Edge Function Cron
Função SQL: processar_novos_canais_youtube(projeto_id)
```

**O que faz:**
- ✅ Processa canais descobertos durante o dia
- ✅ Rankeia novos canais por relevância
- ✅ Adiciona aos canais monitorados

**Performance:** ~10-20s por execução

---

## 📅 TODOS OS CRON JOBS DO SISTEMA

### 🏆 Ranking por Frequência

| Posição | Nome | Frequência | Sistema | Descrição |
|---------|------|------------|---------|-----------|
| 🥇 | `process_youtube_queue` | **15 min** | pg_cron | Reseta itens failed na fila |
| 🥈 | `analyze_comments` | **30 min** | pg_cron | Marca comentários para análise |
| 🥉 | `verificar_novos_videos_youtube` | **1 hora** | Edge Function | **Busca novos vídeos** |
| 4º | `update_analytics` | 1 hora | pg_cron | Marca tráfego orgânico |
| 5º | `process_monitored_videos` | 2 horas | Edge Function | Analisa vídeos |
| 6º | `atualizar_canais_ativos` | 6 horas | Edge Function | Atualiza ranking |
| 7º | `cleanup_logs` | Diário 02:00 | pg_cron | Limpa logs antigos |
| 8º | `check_channels` | Diário 03:00 | pg_cron | Desativa canais inativos |
| 9º | `check_subscriptions` | Diário 10:00 | pg_cron | Verifica renovações |
| 10º | `processar_novos_canais_youtube` | Diário 00:00 | Edge Function | Processa novos canais |
| 11º | `verify_messages` | Semanal Dom 04:00 | pg_cron | Verifica mensagens postadas |
| 12º | `cleanup_embeddings` | Semanal Dom 05:00 | pg_cron | Limpa embeddings órfãos |

---

## 🔄 Fluxo de Dados: videos_scanreados vs processar

### Campo `videos_scanreados`
**Propósito:** Evitar re-verificar vídeos já buscados na API YouTube
**Atualizado em:** Etapa 1 de `verificar_novos_videos_youtube`
**Contém:** TODOS os video IDs retornados pela API (aprovados + rejeitados)

### Campo `processar`
**Propósito:** Armazenar apenas vídeos aprovados pela AI
**Atualizado em:** Etapa 2 de `verificar_novos_videos_youtube`
**Contém:** APENAS os video IDs aprovados pela AI (`video-qualifier-wrapper`)

### Exemplo Prático

**Estado Inicial:**
```sql
videos_scanreados = "v1,v2,v3"
processar = "v1,v3"  -- v2 foi rejeitado pela AI
last_canal_check = "2025-10-20 10:00:00"
```

**Após execução do cron às 11:00:**
```sql
-- API retorna: ["v1", "v2", "v3", "v4", "v5"]
-- v4 e v5 são NOVOS → Enviar para AI

-- AI aprova v4, rejeita v5

videos_scanreados = "v1,v2,v3,v4,v5"  -- TODOS verificados
processar = "v1,v3,v4"                 -- APENAS aprovados (v4 adicionado)
last_canal_check = "2025-10-20 11:00:00"
```

---

## 🔧 Como Configurar Novos Crons

### Edge Function Cron (Supabase Scheduler)

1. **Crie a Edge Function:**
```typescript
// supabase/functions/nome-do-cron/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('sua_funcao_sql')

  return new Response(
    JSON.stringify({ data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

2. **Deploy:**
```bash
supabase functions deploy nome-do-cron
```

3. **Configure Schedule no Dashboard:**
   - Vá para Edge Functions
   - Selecione sua função
   - Configure Cron (ex: `0 */2 * * *` para cada 2 horas)

---

### pg_cron Job (PostgreSQL)

Adicione em uma migration:

```sql
-- Criar a função
CREATE OR REPLACE FUNCTION public.minha_funcao()
RETURNS void AS $$
BEGIN
    -- Seu código aqui
END;
$$ LANGUAGE plpgsql;

-- Agendar o cron
SELECT cron.schedule(
    'nome_do_job',
    '*/15 * * * *',  -- A cada 15 minutos
    'SELECT public.minha_funcao();'
);
```

---

## ⚠️ Monitoramento de Crons

### Ver logs de Edge Functions:
```sql
SELECT * FROM supabase_functions.function_runs
WHERE function_name = 'verificar_novos_videos_youtube'
ORDER BY created_at DESC
LIMIT 10;
```

### Ver jobs pg_cron:
```sql
-- Ver todos os jobs agendados
SELECT
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
ORDER BY jobname;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Ver logs no system_logs:
```sql
SELECT * FROM public.system_logs
WHERE operation LIKE 'CRON_%'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 📊 Métricas de Performance

| Cron | Tempo Médio | Canais/Batch | Timeout |
|------|-------------|--------------|---------|
| `verificar_novos_videos_youtube` | 5-10s | 15 | 5 min |
| `process_monitored_videos` | 30-60s | - | 5 min |
| `atualizar_canais_ativos` | 2-5s | - | 2 min |
| `processar_novos_canais_youtube` | 10-20s | - | 5 min |

---

## 🚨 Troubleshooting

### Cron não está executando
1. Verificar se Edge Function está deployed: `supabase functions list`
2. Verificar logs: `supabase functions logs nome-da-funcao`
3. Verificar schedule no Dashboard > Edge Functions

### Timeout errors
1. Aumentar `statement_timeout` na função SQL
2. Reduzir `lote_tamanho` (default: 15)
3. Otimizar queries dentro da função

### Videos não sendo processados
1. Verificar `videos_scanreados` - deve conter IDs
2. Verificar `processar` - deve conter IDs aprovados
3. Verificar logs da AI: `video-qualifier-wrapper`
4. Verificar `last_canal_check` - deve ser < 30min

---

## 📝 Notas Importantes

- **Intervalo mínimo entre verificações:** 30 minutos por canal
- **Batch size padrão:** 15 canais por execução
- **Cada projeto tem ~30 canais** em média
- **Sistema escala bem até 100-200 projetos** sem mudanças
- **Para >200 projetos:** Implementar `FOR UPDATE SKIP LOCKED`

---

**Última atualização:** 2025-10-20
**Versão do sistema:** Liftlio v2.0
**Documentação completa:** `/supabase/functions_backup/SQL_Functions/00_Monitoramento_YouTube/`
