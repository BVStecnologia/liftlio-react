# Crons de Monitoramento

## 📅 Edge Functions Scheduled

Os crons de monitoramento são executados através de Edge Functions agendadas no Supabase.

### 1. **verificar_novos_videos_youtube**
- **Frequência**: A cada 1 hora
- **Função**: `verificar_novos_videos_youtube()`
- **Descrição**: Verifica novos vídeos dos top canais de cada projeto

### 2. **process_monitored_videos**
- **Frequência**: A cada 2 horas
- **Função**: `process_monitored_videos()`
- **Descrição**: Analisa vídeos monitorados e cria comentários para vídeos High

### 3. **atualizar_canais_ativos**
- **Frequência**: A cada 6 horas
- **Função**: `atualizar_canais_ativos()`
- **Descrição**: Atualiza ranking e status de canais ativos

### 4. **processar_novos_canais_youtube**
- **Frequência**: 1x ao dia (00:00 UTC)
- **Função**: `processar_novos_canais_youtube(projeto_id)`
- **Descrição**: Processa e rankeia novos canais descobertos

## 🔧 Como configurar um novo Cron

1. Crie a Edge Function no Supabase:
```typescript
// supabase/functions/nome-do-cron/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Chamar função SQL
  const { data, error } = await supabase.rpc('sua_funcao_sql')

  return new Response(
    JSON.stringify({ data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

2. Deploy da Edge Function:
```bash
supabase functions deploy nome-do-cron
```

3. Configure o schedule no Dashboard do Supabase:
- Vá para Edge Functions
- Selecione sua função
- Configure o Cron schedule (ex: "0 */2 * * *" para cada 2 horas)

## ⚠️ Monitoramento de Crons

Verificar logs de execução:
```sql
SELECT * FROM supabase_functions.function_runs
WHERE function_name = 'verificar_novos_videos_youtube'
ORDER BY created_at DESC
LIMIT 10;
```

## 📊 Métricas de Performance

- **verificar_novos_videos_youtube**: ~5-10s por execução
- **process_monitored_videos**: ~30-60s por execução
- **atualizar_canais_ativos**: ~2-5s por execução
- **processar_novos_canais_youtube**: ~10-20s por execução