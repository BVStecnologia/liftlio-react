# Ferramenta: list_all_channels

## Informações Básicas
- **Nome**: list_all_channels
- **Tipo**: RPC (Remote Procedure Call)
- **Função SQL**: list_all_channels
- **Status**: Ativa
- **Versão**: 1.0
- **Data de Criação**: 22/01/2025

## Descrição
Lista TODOS os canais monitorados do projeto com estatísticas completas. Esta ferramenta foi criada especificamente porque a função `project_stats` retorna apenas os TOP 5 canais, e frequentemente é necessário visualizar todos os 18 canais monitorados com suas métricas detalhadas.

## Parâmetros
| Nome | Tipo | Descrição | Obrigatório | Padrão |
|------|------|-----------|-------------|---------|
| p_project_id | BIGINT | ID do projeto para análise | Sim | - |

## Retorno
Retorna uma tabela com as seguintes colunas:

### Informações do Canal
- `channel_name` (TEXT): Nome do canal
- `channel_id` (TEXT): ID único do canal no YouTube
- `subscriber_count` (INTEGER): Número de inscritos
- `is_active` (BOOLEAN): Se o canal está ativo
- `channel_category` (TEXT): Categoria baseada em inscritos
  - Mega (1M+)
  - Grande (500K-1M)
  - Médio (100K-500K)
  - Pequeno-Médio (50K-100K)
  - Pequeno (10K-50K)
  - Micro (<10K)

### Estatísticas de Vídeos
- `total_videos` (BIGINT): Total de vídeos do canal
- `monitored_videos` (BIGINT): Vídeos sendo monitorados
- `last_video_date` (DATE): Data do último vídeo

### Estatísticas de Postagens
- `total_posts` (BIGINT): Total de posts criados
- `posts_responded` (BIGINT): Posts efetivamente enviados
- `response_rate` (NUMERIC): Taxa de resposta (%)
- `last_post_date` (TIMESTAMP): Data/hora do último post

### Métricas de Engajamento
- `total_comments` (BIGINT): Total de comentários analisados
- `avg_lead_score` (NUMERIC): Score médio dos leads (0-100)

## Exemplo de Uso

### SQL Direto
```sql
-- Listar todos os canais do projeto 58
SELECT * FROM list_all_channels(58);

-- Listar apenas canais grandes (500K+ inscritos)
SELECT * FROM list_all_channels(58)
WHERE subscriber_count >= 500000
ORDER BY subscriber_count DESC;

-- Agrupar por categoria
SELECT 
    channel_category,
    COUNT(*) as total_channels,
    AVG(subscriber_count) as avg_subscribers,
    SUM(total_posts) as total_posts
FROM list_all_channels(58)
GROUP BY channel_category
ORDER BY 
    CASE channel_category
        WHEN 'Mega (1M+)' THEN 1
        WHEN 'Grande (500K-1M)' THEN 2
        WHEN 'Médio (100K-500K)' THEN 3
        WHEN 'Pequeno-Médio (50K-100K)' THEN 4
        WHEN 'Pequeno (10K-50K)' THEN 5
        WHEN 'Micro (<10K)' THEN 6
    END;
```

### No Agente AI
```typescript
// Listar todos os canais
const channels = await supabase.rpc('list_all_channels', {
  p_project_id: projectId
});

if (channels.error) {
  throw new Error(`Erro ao listar canais: ${channels.error.message}`);
}

// Formatar resposta por categoria
const channelsByCategory = {};
channels.data.forEach(channel => {
  if (!channelsByCategory[channel.channel_category]) {
    channelsByCategory[channel.channel_category] = [];
  }
  channelsByCategory[channel.channel_category].push(channel);
});

// Gerar resposta formatada
let response = "📺 TODOS OS CANAIS MONITORADOS\n\n";
for (const [category, channelList] of Object.entries(channelsByCategory)) {
  response += `${category}:\n`;
  channelList.forEach((channel, index) => {
    response += `${index + 1}. ${channel.channel_name} - ${channel.subscriber_count.toLocaleString()} inscritos\n`;
    response += `   • Vídeos: ${channel.total_videos} (${channel.monitored_videos} monitorados)\n`;
    response += `   • Posts: ${channel.total_posts} (Taxa: ${channel.response_rate}%)\n`;
    response += `   • Lead Score médio: ${channel.avg_lead_score}\n\n`;
  });
}
```

## Resultado Esperado
A função retorna todos os 18 canais ativos do projeto, organizados por número de inscritos:

```
Mega (1M+):
1. CarterPCs - 1,650,000 inscritos

Grande (500K-1M):
2. Complete Technology - 670,000 inscritos

Médio (100K-500K):
3. Darrel Wilson - 445,000 inscritos
4. Shark Numbers - 320,000 inscritos
5. Real Money Strategies - 215,000 inscritos
6. Kimberly Mitchell - 156,000 inscritos
7. Income stream surfers - 137,000 inscritos

Pequeno (10K-50K):
8. UNmiss - 29,300 inscritos
9. WordsAtScale - 24,800 inscritos
10. Nico | AI Ranking - 24,000 inscritos
11. Insights4UToday - 22,000 inscritos
12. Robert Okello - 19,700 inscritos
13. CanEye - 19,100 inscritos
14. Think Smart - 16,800 inscritos
15. Study With Nuha - 15,000 inscritos
16. Alamin - 14,200 inscritos

Micro (<10K):
17. Kingsway Collins - 5,610 inscritos
18. Tadhg Blommerde - 1,770 inscritos
```

## Casos de Uso
1. **Visão geral completa** de todos os canais monitorados
2. **Análise por categoria** de tamanho de canal
3. **Identificar canais** sem atividade recente
4. **Comparar performance** entre diferentes tamanhos de canal
5. **Auditoria** de cobertura de monitoramento

## Observações Técnicas
- Filtra apenas canais ativos (`is_active = true`)
- Lead scores de 1 dígito são normalizados (*10)
- Usa JOINs otimizados com CTEs para performance
- Relacionamento via nome do canal (Videos.Channel = Canais.Nome)

## Localização do Código
- **SQL**: `/AGENTE_LIFTLIO/Ferramentas_Agente/RPC/list_all_channels.sql`
- **Backup**: `/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/list_all_channels_listar_todos_canais.sql`
- **Registrado em**: `agent_tools` (ID: 5)

## Integração com Agente v33
A partir da versão 33 do agente, esta ferramenta é automaticamente detectada e utilizada quando o usuário solicita:
- "Liste todos os canais"
- "Mostre todos os canais monitorados"
- "Quais são todos os canais?"
- Variações similares em português ou inglês

## Histórico de Alterações
- v1.0 (22/01/2025): Criação inicial para resolver limitação do project_stats