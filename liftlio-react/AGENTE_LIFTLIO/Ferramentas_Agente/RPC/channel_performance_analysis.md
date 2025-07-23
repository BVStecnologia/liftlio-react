# Ferramenta: channel_performance_analysis

## Informações Básicas
- **Nome**: channel_performance_analysis
- **Tipo**: RPC (Remote Procedure Call)
- **Função SQL**: channel_performance_analysis
- **Status**: Ativa
- **Versão**: 1.1
- **Data de Criação**: 22/07/2025

## Descrição
Análise completa de performance por canal do YouTube. Fornece métricas detalhadas sobre posts, engajamento, taxa de resposta, qualidade dos leads e um score de performance geral para cada canal monitorado.

## Parâmetros
| Nome | Tipo | Descrição | Obrigatório | Padrão |
|------|------|-----------|-------------|---------|
| p_project_id | BIGINT | ID do projeto para análise | Sim | - |
| p_days_back | INTEGER | Número de dias para análise histórica | Não | 30 |

## Retorno
Retorna uma tabela com as seguintes colunas:

### Informações do Canal
- `channel_id` (TEXT): ID único do canal no YouTube
- `channel_name` (TEXT): Nome do canal
- `subscriber_count` (INTEGER): Número de inscritos

### Métricas de Vídeos
- `total_videos` (BIGINT): Total de vídeos do canal
- `monitored_videos` (BIGINT): Vídeos sendo monitorados
- `total_comments` (BIGINT): Total de comentários nos vídeos

### Métricas de Posts
- `total_posts` (BIGINT): Total de posts criados
- `posts_responded` (BIGINT): Posts efetivamente enviados
- `response_rate` (NUMERIC): Taxa de resposta (%)
- `avg_response_time_hours` (NUMERIC): Tempo médio de resposta em horas
- `posts_last_7_days` (BIGINT): Posts nos últimos 7 dias
- `posts_last_30_days` (BIGINT): Posts nos últimos 30 dias

### Métricas de Qualidade
- `avg_lead_score` (NUMERIC): Score médio de qualidade dos leads (0-100)
- `total_engagement_posts` (BIGINT): Posts de engajamento (tipo 2)
- `total_lead_posts` (BIGINT): Posts de lead (tipo 1)

### Análises Avançadas
- `best_performing_video` (JSONB): Dados do vídeo com melhor performance
  ```json
  {
    "video_id": 123,
    "video_title": "Título do vídeo",
    "view_count": 50000,
    "posts_generated": 12,
    "avg_lead_score": 85.5
  }
  ```

- `posting_schedule` (JSONB): Padrões de horário de postagem
  ```json
  {
    "most_active_hour": 14,
    "most_active_day": "Tuesday",
    "posts_by_hour": {
      "14": 5,
      "15": 3,
      "16": 2
    }
  }
  ```

- `performance_score` (NUMERIC): Score geral de performance (0-100)
  - 30% - Atividade (posts nos últimos 30 dias)
  - 25% - Taxa de resposta
  - 25% - Qualidade dos leads
  - 20% - Engajamento relativo aos inscritos

## Exemplo de Uso

### SQL Direto
```sql
-- Análise dos últimos 30 dias para projeto 58
SELECT * FROM channel_performance_analysis(58, 30)
ORDER BY performance_score DESC;

-- Apenas canais com posts
SELECT * FROM channel_performance_analysis(58, 30)
WHERE total_posts > 0
ORDER BY performance_score DESC;

-- Top 5 canais por performance
SELECT 
    channel_name,
    subscriber_count,
    total_posts,
    response_rate,
    performance_score
FROM channel_performance_analysis(58, 30)
ORDER BY performance_score DESC
LIMIT 5;
```

### No Agente AI
```typescript
// Buscar análise de canais
const channelAnalysis = await supabase.rpc('channel_performance_analysis', {
  p_project_id: projectId,
  p_days_back: 30
});

if (channelAnalysis.error) {
  throw new Error(`Erro na análise: ${channelAnalysis.error.message}`);
}

// Formatar resposta
const topChannels = channelAnalysis.data
  .filter(ch => ch.total_posts > 0)
  .slice(0, 5);

const response = topChannels.map(ch => `
📺 ${ch.channel_name} (${ch.subscriber_count.toLocaleString()} inscritos)
- Performance Score: ${ch.performance_score}/100
- Posts: ${ch.total_posts} (Taxa resposta: ${ch.response_rate}%)
- Posts últimos 7 dias: ${ch.posts_last_7_days}
- Lead Score médio: ${ch.avg_lead_score}
`).join('\n');
```

## Casos de Uso
1. **Identificar canais mais efetivos** para focar esforços
2. **Detectar canais com baixa performance** para otimização
3. **Analisar padrões de postagem** para melhorar timing
4. **Comparar performance entre canais** similares
5. **Justificar ROI** por canal para tomada de decisão

## Observações Técnicas
- A função usa LEFT JOINs para incluir canais sem atividade
- Lead scores de 1 dígito são multiplicados por 10 para normalização
- Performance score é uma média ponderada ajustável
- Horários são agregados para identificar padrões

## Localização do Código
- **SQL**: `/AGENTE_LIFTLIO/Ferramentas_Agente/RPC/channel_performance_analysis.sql`
- **Registrado em**: `agent_tools` (ID: 9)

## Histórico de Alterações
- v1.0 (22/07/2025): Criação inicial com métricas completas
  - Correção: subscriber_count de BIGINT para INTEGER