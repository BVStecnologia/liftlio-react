# Fix: Claude API Timeout - Projeto 117

**Data**: 2025-10-17 14:30
**Status**: ⏸️ PAUSADO (aguardando reset de rate limit)

## 📊 Situação Atual

- ✅ **Processados**: 74 mensagens
- ⏳ **Pendentes**: 62 mensagens
- 📝 **Total**: 136 mensagens

## 🚨 Problema Identificado

**Claude API não está respondendo** após processar 74 mensagens:
```
WARNING: claude_complete EXCEPTION: Operation timed out after 30002 milliseconds with 0 bytes received
```

### Causa Provável
**Rate Limit da Anthropic API**
- 74 requisições em curto período (cron a cada 30-59s)
- API bloqueou temporariamente por volume
- Timeout de 30s com 0 bytes = sem resposta da API

## ✅ Otimizações Aplicadas

### 1. Migrations Criadas
- `20251017140000_fix_engagement_batch_timeout.sql` - Corrige batch_size
- `20251017140100_optimize_claude_transcript.sql` - Otimiza payload

### 2. Mudanças nas Funções

**process_engagement_comments_with_claude**:
- ✅ Transcrição limitada a 15.000 caracteres
- ✅ Templates reduzidos de 20 para 10
- ✅ Prompt simplificado
- ✅ Só processa se tiver transcrição

**process_and_create_messages_engagement**:
- ✅ Agora recebe e passa `p_batch_size` corretamente

**process_engagement_messages_batch**:
- ✅ Passa `batch_size` para função de processamento
- ✅ Intervalo do cron aumentado para 59s

### 3. Cron Job
- ✅ Intervalo aumentado de 30s → 59s
- ⏸️ **PAUSADO** temporariamente (17/10/2025 14:30)

## 🔄 Como Reativar (após 1 hora)

**Opção 1: Batch Pequeno (RECOMENDADO)**
```sql
-- Reativar com 5 comentários por vez (mais seguro)
SELECT cron.schedule(
    'process_engagement_messages_117',
    '59 seconds',
    'SELECT process_engagement_messages_batch(117, 5)'
);
```

**Opção 2: Batch Médio**
```sql
-- Reativar com 10 comentários por vez (original otimizado)
SELECT cron.schedule(
    'process_engagement_messages_117',
    '59 seconds',
    'SELECT process_engagement_messages_batch(117, 10)'
);
```

**Opção 3: Manual (DEBUG)**
```sql
-- Processar 1 lote manualmente para testar
SELECT process_engagement_messages_batch(117, 5);

-- Aguardar 5 minutos
-- Repetir se funcionou
```

## 📋 Checklist de Reativação

- [ ] Aguardar 1 hora desde pausamento (14:30)
- [ ] Verificar console.anthropic.com para limites
- [ ] Escolher batch size (5 recomendado)
- [ ] Executar comando de reativação
- [ ] Monitorar logs: `SELECT * FROM cron.job_run_details WHERE jobid = 158784 ORDER BY start_time DESC LIMIT 5;`
- [ ] Se continuar falhando: pausar e aguardar mais tempo

## 🔍 Monitoramento

### Ver Status do Processamento
```sql
SELECT
    COUNT(*) FILTER (WHERE mensagem = false) as pendentes,
    COUNT(*) FILTER (WHERE mensagem = true) as processados,
    COUNT(*) as total
FROM "Comentarios_Principais"
WHERE project_id = 117 AND comentario_analizado = true;
```

### Ver Logs Recentes
```sql
SELECT
    jobid,
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = 158784
ORDER BY start_time DESC
LIMIT 10;
```

### Ver Logs do Postgres (via MCP)
```typescript
await mcp__supabase__get_logs({ service: "postgres" });
```

## 🆘 Se Continuar Falhando

1. **Verificar Chave API**:
   - Console Anthropic → API Keys
   - Verificar se não expirou
   - Ver quota/usage

2. **Tentar Modelo Alternativo**:
   - Criar versão com GPT-4 (OpenAI)
   - Usar proxy/gateway com retry

3. **Processar Offline**:
   - Exportar comentários pendentes
   - Processar localmente
   - Importar respostas

## 📝 Arquivos Modificados

```
/supabase/migrations/
├── 20251017140000_fix_engagement_batch_timeout.sql
└── 20251017140100_optimize_claude_transcript.sql

/supabase/functions_backup/SQL_Functions/PIPELINE_PROCESSOS/STATUS_5_ENGAGEMENT/
├── 01_process_engagement_comments_with_claude.sql (otimizado)
├── 02_process_and_create_messages_engagement.sql (batch_size adicionado)
└── 03_process_engagement_messages_batch.sql (batch_size passado)
```

## 🎯 Próximos Passos

1. ⏰ **Aguardar 1 hora** (até ~15:30)
2. 🔍 **Verificar console Anthropic**
3. ▶️ **Reativar com batch=5**
4. 👀 **Monitorar logs**
5. ✅ **Processar os 62 restantes**

---

**Última atualização**: 2025-10-17 14:30
**Por**: Claude Code (Supabase MCP Expert)
