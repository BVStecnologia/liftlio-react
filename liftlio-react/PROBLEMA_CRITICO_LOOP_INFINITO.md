# 🚨 PROBLEMA CRÍTICO: Loop Infinito de Processamento e Consumo de API

**Data:** 19/01/2025
**Severidade:** CRÍTICA
**Impacto:** Consumo massivo de créditos API Anthropic/OpenAI

## 📊 O QUE ACONTECEU

O projeto Liftlio (ID: 77) entrou em loop infinito de processamento, gerando:
- **10.127 embeddings** em 24 horas
- **~1.354 chamadas/hora** para APIs
- Jobs rodando a cada **5-7 segundos** indefinidamente

## 🔍 CAUSA RAIZ

### 1. Falha na Função de Scanner
```
Problema: 4 de 5 scanners com rodada = NULL
Função esperava: rodada = 1
Resultado: "Nenhum scanner encontrado"
Status travou em "1" e nunca progrediu
```

### 2. Jobs Criados Sem Validação
```sql
-- Jobs foram criados com intervalos insanos:
process_comment_analysis_77     → cada 5 segundos
process_project_status_77       → cada 7 segundos
process_engagement_messages_77  → cada 30 segundos
```

### 3. Sem Condição de Saída
```
Cada job:
1. Executa
2. Processa qualquer dado disponível
3. Se reagenda automaticamente
4. Repete eternamente (sem verificar se ainda é necessário)
```

## 🧠 MAPA DO DESASTRE

```
Integração Reutilizada (18/01 às 21h)
        ↓
Status muda: NULL → "0" → "1"
        ↓
Trigger dispara e cria jobs
        ↓
Scanner falha (rodada = NULL)
        ↓
Status não muda de "1"
        ↓
Jobs continuam rodando ←──┐
        ↓                  │
Processam tudo disponível │
        ↓                  │
Se reagendam ─────────────┘
        ↓
LOOP INFINITO (24h+)
```

## ❌ FALHAS DE DESIGN IDENTIFICADAS

### 1. Sem Circuit Breaker
- Não há limite de tentativas
- Não há timeout após falhas
- Jobs nunca são desativados automaticamente

### 2. Sem Validação de Estado
```sql
-- Jobs deveriam verificar:
IF current_status != expected_status THEN
    EXIT; -- Não reagendar
END IF;
```

### 3. Sem Rate Limiting
- Jobs podem rodar a cada 5 segundos
- Sem cooldown entre execuções
- Sem limite máximo por hora

### 4. Sem Monitoramento
- Nenhum alerta para consumo anormal
- Sem dashboard de jobs ativos
- Sem kill switch de emergência

## 🛡️ SOLUÇÕES NECESSÁRIAS

### 1. IMPLEMENTAR CIRCUIT BREAKER
```sql
CREATE OR REPLACE FUNCTION safe_job_execution(
    p_project_id INT,
    p_expected_status TEXT,
    p_max_attempts INT DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_status TEXT;
    v_attempt_count INT;
BEGIN
    -- Verificar status atual
    SELECT status INTO v_current_status
    FROM "Projeto" WHERE id = p_project_id;

    -- Sair se status incorreto
    IF v_current_status != p_expected_status THEN
        RAISE NOTICE 'Status incorreto: % (esperado: %)',
                     v_current_status, p_expected_status;
        RETURN FALSE; -- NÃO reagendar
    END IF;

    -- Contar tentativas recentes
    SELECT COUNT(*) INTO v_attempt_count
    FROM system_logs
    WHERE operation = format('job_project_%s', p_project_id)
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Circuit breaker
    IF v_attempt_count > p_max_attempts THEN
        -- Cancelar job
        PERFORM cron.unschedule(
            format('process_%%_%s', p_project_id)
        );
        RAISE EXCEPTION 'Circuit breaker: máximo de % tentativas excedido', p_max_attempts;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 2. ADICIONAR RATE LIMITING
```sql
-- Mínimo 1 minuto entre execuções
-- Máximo 60 execuções por hora
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_operation TEXT,
    p_max_per_hour INT DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM system_logs
    WHERE operation = p_operation
    AND created_at > NOW() - INTERVAL '1 hour';

    IF v_count >= p_max_per_hour THEN
        RETURN FALSE; -- Bloquear execução
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 3. MONITORAMENTO ATIVO
```sql
-- Criar view de monitoramento
CREATE VIEW job_monitoring AS
SELECT
    j.jobname,
    j.schedule,
    COUNT(jrd.runid) as executions_last_hour,
    MAX(jrd.start_time) as last_execution,
    CASE
        WHEN COUNT(jrd.runid) > 100 THEN 'CRÍTICO'
        WHEN COUNT(jrd.runid) > 50 THEN 'ALERTA'
        ELSE 'NORMAL'
    END as status
FROM cron.job j
LEFT JOIN cron.job_run_details jrd
    ON j.jobid = jrd.jobid
    AND jrd.start_time > NOW() - INTERVAL '1 hour'
WHERE j.active = true
GROUP BY j.jobid, j.jobname, j.schedule;
```

### 4. KILL SWITCH DE EMERGÊNCIA
```sql
CREATE OR REPLACE FUNCTION emergency_stop_all_jobs()
RETURNS TABLE(jobs_stopped INT) AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- Parar todos os jobs ativos
    UPDATE cron.job
    SET active = false
    WHERE active = true;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Log da ação
    INSERT INTO system_logs(operation, details, success)
    VALUES('EMERGENCY_STOP', format('%s jobs parados', v_count), true);

    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;
```

## 📋 CHECKLIST DE CORREÇÃO

- [ ] Implementar Circuit Breaker em todas as funções de job
- [ ] Adicionar validação de status antes de processar
- [ ] Configurar rate limiting (mínimo 1 min entre execuções)
- [ ] Criar dashboard de monitoramento
- [ ] Implementar kill switch de emergência
- [ ] Revisar TODOS os jobs com schedule < 1 minuto
- [ ] Adicionar logs detalhados de consumo de API
- [ ] Configurar alertas para consumo anormal
- [ ] Documentar limites de API e custos
- [ ] Treinar equipe sobre riscos de loops

## ⚠️ LIÇÕES APRENDIDAS

1. **NUNCA** criar jobs com intervalo < 1 minuto sem justificativa
2. **SEMPRE** implementar condição de saída em jobs
3. **SEMPRE** validar estado antes de processar
4. **NUNCA** confiar em "não vai dar problema"
5. **SEMPRE** ter kill switch de emergência
6. **MONITORAR** consumo de API em tempo real

## 🔴 AÇÕES IMEDIATAS

1. ✅ Jobs parados manualmente
2. ✅ 10.127 embeddings desnecessários identificados
3. ⚠️ Implementar proteções ANTES de reativar processamento
4. ⚠️ Revisar TODOS os triggers e jobs do sistema

## 💰 IMPACTO FINANCEIRO ESTIMADO

- Embeddings OpenAI: ~10.000 × $0.0001 = $1.00
- Claude API calls: ~32.496 × $0.003 = $97.48
- **Total estimado: ~$98.48 em 24 horas**

---

**IMPORTANTE:** Este problema ocorreu porque o sistema foi deixado rodando sem supervisão após a implementação da reutilização de integração YouTube. A função estava incompleta (não atualizava rodada dos scanners) e os jobs entraram em loop infinito tentando processar dados que nunca ficariam prontos.