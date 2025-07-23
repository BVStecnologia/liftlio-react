# Ferramenta: video_engagement_metrics

## Informações Básicas
- **Nome**: video_engagement_metrics
- **Tipo**: RPC (Remote Procedure Call)
- **Função SQL**: video_engagement_metrics
- **Status**: Ativa
- **Versão**: 1.4
- **Data de Criação**: 22/01/2025

## Descrição
Análise detalhada de engajamento por vídeo. Fornece métricas completas sobre views, likes, comentários, posts gerados, taxa de resposta, qualidade dos leads e um score de engajamento geral para cada vídeo monitorado do projeto.

## Parâmetros
| Nome | Tipo | Descrição | Obrigatório | Padrão |
|------|------|-----------|-------------|---------|
| p_project_id | BIGINT | ID do projeto para análise | Sim | - |
| p_limit | INTEGER | Número máximo de vídeos retornados | Não | 50 |
| p_min_comments | INTEGER | Número mínimo de comentários monitorados | Não | 5 |

## Retorno
Retorna uma tabela com as seguintes colunas:

### Informações do Vídeo
- `video_id` (BIGINT): ID único do vídeo no banco
- `video_youtube_id` (TEXT): ID do vídeo no YouTube
- `video_title` (TEXT): Título do vídeo
- `channel_name` (TEXT): Nome do canal
- `created_date` (DATE): Data de criação no sistema
- `days_since_created` (INTEGER): Dias desde a criação

### Métricas de Engajamento
- `view_count` (BIGINT): Número de visualizações
- `like_count` (BIGINT): Número de likes
- `comment_count` (BIGINT): Total de comentários no vídeo
- `monitored_comments` (BIGINT): Comentários sendo monitorados

### Métricas de Posts
- `total_posts` (BIGINT): Total de posts criados
- `posts_responded` (BIGINT): Posts efetivamente enviados
- `response_rate` (NUMERIC): Taxa de resposta (%)
- `avg_lead_score` (NUMERIC): Score médio dos leads (0-100)
- `high_quality_leads` (BIGINT): Leads com score >= 70
- `engagement_posts` (BIGINT): Posts de engajamento (tipo 2)
- `lead_posts` (BIGINT): Posts de lead (tipo 1)
- `avg_comment_likes` (NUMERIC): Média de likes nos comentários

### Métricas de Performance
- `engagement_rate` (NUMERIC): Taxa de engajamento (%)
  ```
  (likes + comentários) / views * 100
  ```
- `posts_per_1k_views` (NUMERIC): Posts gerados por 1000 views
- `lead_quality_index` (NUMERIC): Índice de qualidade dos leads (0-100)
  - 40% - Score médio dos leads
  - 30% - Proporção de leads de alta qualidade
  - 30% - Engajamento dos comentários

### Análises Avançadas
- `posting_timeline` (JSONB): Padrões temporais de postagem
  ```json
  {
    "first_post_hours": 2.5,
    "last_post_hours": 168.3,
    "total_posts_timeline": 45,
    "peak_activity_day": 3
  }
  ```

- `top_comments` (JSONB): Top 3 comentários por performance
  ```json
  [
    {
      "comment_id": 12345,
      "author": "Nome do Autor",
      "text": "Primeiros 100 caracteres do comentário...",
      "likes": 25,
      "lead_score": 85,
      "posts_generated": 3
    }
  ]
  ```

- `engagement_score` (NUMERIC): Score geral de engajamento (0-100)
  - 30% - Taxa de engajamento
  - 25% - Posts gerados
  - 25% - Qualidade dos leads
  - 20% - Taxa de resposta

## Exemplo de Uso

### SQL Direto
```sql
-- Top 10 vídeos com melhor engajamento
SELECT * FROM video_engagement_metrics(58, 10, 0)
ORDER BY engagement_score DESC;

-- Vídeos com pelo menos 10 comentários monitorados
SELECT * FROM video_engagement_metrics(58, 50, 10)
WHERE total_posts > 0;

-- Análise de performance por canal
SELECT 
    channel_name,
    COUNT(*) as total_videos,
    AVG(engagement_rate) as avg_engagement_rate,
    SUM(total_posts) as total_posts_channel,
    AVG(engagement_score) as avg_score
FROM video_engagement_metrics(58, 100, 0)
GROUP BY channel_name
ORDER BY avg_score DESC;
```

### No Agente AI
```typescript
// Buscar análise de vídeos
const videoAnalysis = await supabase.rpc('video_engagement_metrics', {
  p_project_id: projectId,
  p_limit: 20,
  p_min_comments: 0
});

if (videoAnalysis.error) {
  throw new Error(`Erro na análise: ${videoAnalysis.error.message}`);
}

// Formatar resposta
const topVideos = videoAnalysis.data
  .filter(v => v.engagement_score > 50)
  .slice(0, 5);

const response = topVideos.map(v => `
📹 ${v.video_title}
- Canal: ${v.channel_name}
- Engagement Score: ${v.engagement_score}/100
- Views: ${v.view_count.toLocaleString()} | Taxa: ${v.engagement_rate}%
- Posts: ${v.total_posts} (Respondidos: ${v.posts_responded})
- Lead Score médio: ${v.avg_lead_score}
`).join('\n');
```

## Casos de Uso
1. **Identificar vídeos de alto engajamento** para focar esforços
2. **Analisar efetividade de conteúdo** por métricas detalhadas
3. **Descobrir oportunidades perdidas** (alto engajamento, poucos posts)
4. **Otimizar timing de resposta** com posting_timeline
5. **Priorizar vídeos** por potencial de conversão

## Observações Técnicas
- Usa `created_at` ao invés de `published_at` (não existe na tabela Videos)
- Lead scores de 1 dígito são multiplicados por 10 para normalização
- Top comments são ordenados por lead score e likes
- Engagement score é calculado com pesos ajustáveis
- Métricas zero são tratadas para evitar divisão por zero

## Localização do Código
- **SQL**: `/AGENTE_LIFTLIO/Ferramentas_Agente/RPC/video_engagement_metrics.sql`
- **Registrado em**: `agent_tools` (ID: 10)

## Histórico de Alterações
- v1.0 (22/01/2025): Criação inicial
- v1.1: Corrigido published_at para created_at
- v1.2: Corrigido erro de window function em FILTER
- v1.3: Simplificado top comments
- v1.4: Corrigido ambiguidade de colunas com aliases