# Ferramenta: optimal_posting_schedule

## Informações Básicas
- **Nome**: optimal_posting_schedule
- **Tipo**: RPC (Remote Procedure Call)
- **Função SQL**: optimal_posting_schedule
- **Status**: Ativa
- **Versão**: 1.3
- **Data de Criação**: 22/01/2025

## Descrição
Análise dos melhores horários para postagem baseada em atividade histórica de comentários. Identifica padrões de engajamento, qualidade de leads e performance por horário/dia da semana para otimizar o timing de respostas. A função analisa quando há mais atividade de comentários, qual a qualidade dos leads em cada período e sugere os melhores momentos para maximizar o engajamento.

## Parâmetros
| Nome | Tipo | Descrição | Obrigatório | Padrão |
|------|------|-----------|-------------|---------|
| p_project_id | BIGINT | ID do projeto para análise | Sim | - |
| p_days_back | INTEGER | Número de dias para análise histórica | Não | 30 |

## Retorno
Retorna uma tabela com as seguintes colunas:

### Informações de Horário
- `time_slot` (TEXT): Slot de tempo formatado (ex: "Wed 14:00-15:00")
- `hour_of_day` (INTEGER): Hora do dia (0-23)
- `day_of_week` (TEXT): Nome do dia da semana
- `day_number` (INTEGER): Número do dia (0=Domingo, 6=Sábado)

### Métricas de Atividade
- `total_posts` (BIGINT): Total de posts criados neste horário
- `posts_responded` (BIGINT): Posts efetivamente enviados
- `response_rate` (NUMERIC): Taxa de resposta (%)
- `avg_response_time_hours` (NUMERIC): Tempo médio de resposta em horas

### Métricas de Qualidade
- `avg_lead_score` (NUMERIC): Score médio dos leads (0-100)
- `high_quality_leads` (BIGINT): Quantidade de leads com score >= 70
- `comment_activity_level` (TEXT): Nível de atividade (High/Medium/Low)
- `avg_video_age_days` (NUMERIC): Idade média dos vídeos quando comentados

### Análise e Recomendações
- `performance_score` (NUMERIC): Score de performance geral (0-100)
  - 30% - Nível de atividade de comentários
  - 30% - Qualidade dos leads
  - 20% - Taxa de resposta
  - 20% - Tempo de resposta (inverso)

- `recommendations` (JSONB): Recomendações estruturadas
  ```json
  {
    "is_optimal": true,
    "activity_status": "High",
    "recommendation": "Horário premium - priorizar postagens",
    "best_for": "Business hours engagement"
  }
  ```

## Lógica de Classificação

### Activity Level
- **High**: Acima do percentil 75 de atividade
- **Medium**: Entre percentis 25 e 75
- **Low**: Abaixo do percentil 25

### Recommendations
- **Horário premium**: Alta atividade + lead score >= 70
- **Bom horário**: Alta atividade + lead score >= 50
- **Horário alternativo**: Média atividade + lead score >= 60
- **Baixa atividade**: Evitar se possível
- **Horário regular**: Outros casos

### Best For
- **Business hours engagement**: 9h-17h
- **Evening peak engagement**: 18h-22h
- **Early morning catch-up**: 6h-8h
- **Off-peak hours**: Outros horários

## Exemplo de Uso

### SQL Direto
```sql
-- Análise dos últimos 30 dias
SELECT * FROM optimal_posting_schedule(58, 30)
ORDER BY performance_score DESC;

-- Apenas horários ótimos
SELECT * FROM optimal_posting_schedule(58, 180)
WHERE (recommendations->>'is_optimal')::boolean = true;

-- Melhor horário por dia da semana
SELECT 
    day_of_week,
    time_slot,
    performance_score,
    comment_activity_level,
    avg_lead_score
FROM optimal_posting_schedule(58, 90)
WHERE row_number() OVER (PARTITION BY day_of_week ORDER BY performance_score DESC) = 1;
```

### No Agente AI
```typescript
// Buscar horários ótimos
const schedule = await supabase.rpc('optimal_posting_schedule', {
  p_project_id: projectId,
  p_days_back: 60
});

if (schedule.error) {
  throw new Error(`Erro na análise: ${schedule.error.message}`);
}

// Filtrar melhores horários
const optimalTimes = schedule.data
  .filter(slot => slot.recommendations.is_optimal)
  .slice(0, 5);

const response = optimalTimes.map(slot => `
⏰ ${slot.time_slot}
- Performance Score: ${slot.performance_score}/100
- Atividade: ${slot.comment_activity_level}
- Posts: ${slot.total_posts} (Taxa: ${slot.response_rate}%)
- Lead Score médio: ${slot.avg_lead_score}
- ${slot.recommendations.recommendation}
`).join('\n');
```

## Casos de Uso
1. **Otimizar agendamento de posts** para máximo engajamento
2. **Identificar horários de pico** por dia da semana
3. **Planejar cobertura** de horários com alta atividade
4. **Analisar padrões sazonais** com períodos maiores
5. **Ajustar estratégia** baseada em qualidade dos leads

## Observações Técnicas
- Usa percentis para classificar atividade relativa
- Lead scores de 1 dígito são normalizados (*10)
- Tempo de resposta negativo impacta o score
- Vídeos com idade negativa indicam data futura (possível erro de dados)
- Performance score é calculado com pesos ajustáveis

## Localização do Código
- **SQL**: `/AGENTE_LIFTLIO/Ferramentas_Agente/RPC/optimal_posting_schedule.sql`
- **Registrado em**: `agent_tools` (ID: 11)

## Histórico de Alterações
- v1.0 (22/01/2025): Criação inicial
- v1.1: Corrigido ambiguidade de colunas
- v1.2: Corrigido cálculo de percentis
- v1.3: Corrigido FORMAT para concatenação

## Limitações Conhecidas
- Lead scores atualmente retornando 0 (necessita correção no JOIN)
- Idade dos vídeos pode ser negativa (verificar dados)