# 📊 Métricas de Monitoramento - Agente Liftlio

## KPIs Principais

### 1. Performance Técnica

#### Tempo de Resposta
- **Meta**: < 3 segundos
- **Crítico**: > 5 segundos
- **Query SQL**:
```sql
SELECT 
    DATE_TRUNC('hour', created_at) as hora,
    AVG(response_time_ms) as tempo_medio,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
    COUNT(*) as total_requests
FROM agent_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC;
```

#### Taxa de Sucesso
- **Meta**: > 95%
- **Crítico**: < 90%
- **Query SQL**:
```sql
SELECT 
    COUNT(CASE WHEN success = true THEN 1 END)::float / COUNT(*) * 100 as taxa_sucesso,
    COUNT(CASE WHEN error_type = 'timeout' THEN 1 END) as timeouts,
    COUNT(CASE WHEN error_type = 'api_error' THEN 1 END) as api_errors
FROM agent_requests
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### 2. Uso e Engajamento

#### Interações por Usuário
- **Meta**: > 5 por sessão
- **Query SQL**:
```sql
SELECT 
    user_id,
    COUNT(*) as total_interacoes,
    COUNT(DISTINCT DATE_TRUNC('day', created_at)) as dias_ativos,
    AVG(session_duration_minutes) as duracao_media_sessao
FROM agent_interactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_interacoes DESC;
```

#### Ações Executadas
```sql
SELECT 
    action_type,
    COUNT(*) as total,
    COUNT(DISTINCT user_id) as usuarios_unicos,
    AVG(CASE WHEN completed = true THEN 1 ELSE 0 END) * 100 as taxa_conclusao
FROM agent_actions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type
ORDER BY total DESC;
```

### 3. Qualidade das Respostas

#### Feedback dos Usuários
- **Meta**: > 4.5/5
- **Query SQL**:
```sql
SELECT 
    AVG(rating) as rating_medio,
    COUNT(CASE WHEN rating >= 4 THEN 1 END)::float / COUNT(*) * 100 as satisfacao,
    COUNT(*) as total_avaliacoes
FROM agent_feedback
WHERE created_at > NOW() - INTERVAL '30 days';
```

#### Taxa de Fallback
- **Meta**: < 20%
- **Crítico**: > 30%
```sql
SELECT 
    COUNT(CASE WHEN used_rag = true THEN 1 END)::float / COUNT(*) * 100 as uso_rag,
    COUNT(CASE WHEN created_support_ticket = true THEN 1 END)::float / COUNT(*) * 100 as escalou_suporte
FROM agent_responses
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### 4. Custos Operacionais

#### Uso de Tokens
```sql
SELECT 
    DATE_TRUNC('day', created_at) as dia,
    SUM(tokens_used) as total_tokens,
    SUM(tokens_used) * 0.00001 as custo_estimado_usd,
    COUNT(DISTINCT user_id) as usuarios_ativos
FROM agent_requests
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY dia
ORDER BY dia DESC;
```

#### ROI do Agente
```sql
WITH agent_stats AS (
    SELECT 
        COUNT(DISTINCT user_id) as usuarios_assistidos,
        COUNT(*) as total_interacoes,
        COUNT(CASE WHEN prevented_support_ticket = true THEN 1 END) as tickets_evitados
    FROM agent_interactions
    WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT 
    usuarios_assistidos,
    total_interacoes,
    tickets_evitados,
    tickets_evitados * 15 as economia_estimada_usd, -- $15 por ticket
    (SELECT SUM(tokens_used) * 0.00001 FROM agent_requests WHERE created_at > NOW() - INTERVAL '30 days') as custo_total_usd
FROM agent_stats;
```

## Dashboard de Monitoramento

### Visualizações Recomendadas

#### 1. Gráfico de Linha - Performance
- Eixo X: Tempo (últimas 24h)
- Eixo Y: Tempo de resposta (ms)
- Linhas: Média, P95, P99

#### 2. Gráfico de Pizza - Tipos de Ação
- Navegação: XX%
- Informação: XX%
- Suporte: XX%
- RAG: XX%

#### 3. Heatmap - Uso por Hora
- Eixo X: Hora do dia
- Eixo Y: Dia da semana
- Cor: Intensidade de uso

#### 4. Gauge - Satisfação
- Escala: 0-5
- Cores: Vermelho (<3), Amarelo (3-4), Verde (>4)

## Alertas Configurados

### 🚨 Críticos
1. **Taxa de erro > 10%** por 5 minutos
2. **Tempo resposta P95 > 5s** por 10 minutos
3. **Serviço indisponível** por 1 minuto

### ⚠️ Avisos
1. **Taxa de fallback > 25%** por 30 minutos
2. **Uso de tokens > 150%** da média
3. **Satisfação < 4.0** no dia

### 📧 Notificações
- Email: valdair3d@gmail.com
- Slack: #liftlio-alerts (futuro)
- SMS: Para críticos (futuro)

## Relatórios Automáticos

### Diário (9:00 AM)
- Total de interações
- Taxa de sucesso
- Principais queries
- Custos do dia anterior

### Semanal (Segunda 9:00 AM)
- Tendências de uso
- Top 10 usuários
- Análise de fallbacks
- Projeção de custos

### Mensal (Dia 1, 9:00 AM)
- KPIs vs metas
- ROI detalhado
- Análise de crescimento
- Recomendações

## Queries Úteis para Debug

### Últimos erros
```sql
SELECT 
    created_at,
    user_id,
    error_type,
    error_message,
    request_data
FROM agent_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

### Usuários com problemas
```sql
SELECT 
    user_id,
    COUNT(*) as total_erros,
    array_agg(DISTINCT error_type) as tipos_erro
FROM agent_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY total_erros DESC;
```

### Análise de latência
```sql
SELECT 
    component,
    AVG(duration_ms) as media,
    MAX(duration_ms) as maximo,
    STDDEV(duration_ms) as desvio_padrao
FROM agent_performance_traces
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY component
ORDER BY media DESC;
```

---

*Atualizar estas queries conforme o schema evolui*