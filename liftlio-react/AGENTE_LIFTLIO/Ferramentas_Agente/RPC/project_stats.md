# Ferramenta: project_stats

## Informações Básicas
- **Nome**: project_stats
- **Tipo**: RPC (Remote Procedure Call)
- **Função SQL**: get_complete_project_stats
- **Status**: Ativa
- **Versão**: 2.0
- **Última Atualização**: 22/07/2025

## Descrição
Retorna estatísticas completas do projeto: total de postagens realizadas (total_mentions), postagens agendadas, canais ativos, vídeos monitorados, postagens de hoje, top 5 canais por inscritos e detalhes das postagens agendadas futuras.

## Parâmetros
- `p_project_id` (BIGINT): ID do projeto para buscar estatísticas

## Retorno (JSONB)
```json
{
  "active_channels": 18,          // Canais ativos do YouTube
  "total_videos": 50,             // Total de vídeos descobertos
  "total_mentions": 256,          // Postagens REALIZADAS (postado IS NOT NULL)
  "mentions_today": 2,            // Postagens realizadas hoje
  "scheduled_mentions": 1,        // Postagens agendadas futuras
  "posted_mentions": 256,         // Total de postagens já enviadas
  "scheduled_details": [{         // Array com detalhes das agendadas
    "id": 65113,
    "content": "mensagem...",
    "tipo_msg": 2,
    "video_title": "título...",
    "comment_content": "comentário original...",
    "proxima_postagem": "2025-07-22T23:25:00"
  }],
  "total_messages": 223,          // Total de mensagens criadas
  "videos_monitored": 27,         // Vídeos sendo monitorados
  "scanner_stats": {              // Estatísticas dos scanners
    "total_scanners": 5,
    "active_scanners": 5,
    "keywords": ["keyword1", "keyword2", ...]
  },
  "top_channels": [{              // Top 5 canais por inscritos
    "channel_name": "CarterPCs",
    "channel_id": "UCi7wDE...",
    "subscriber_count": 1650000,
    "is_active": true
  }],
  "last_updated": "2025-07-22T20:41:26.305092+00:00"
}
```

## Correções Aplicadas (v2.0)
- **Problema**: `total_mentions` contava TODOS os registros, incluindo não postados
- **Solução**: Adicionado filtro `AND postado IS NOT NULL` para contar apenas postagens realizadas
- **Data**: 22/07/2025

## Exemplo de Uso no Agente
```typescript
// No agente-liftlio Edge Function
const statsResult = await supabase.rpc('get_complete_project_stats', {
  p_project_id: projectId
});

if (statsResult.error) {
  throw new Error(`Erro ao buscar estatísticas: ${statsResult.error.message}`);
}

const stats = statsResult.data;
const response = `
Estatísticas do Projeto:
- Canais Ativos: ${stats.active_channels}
- Vídeos Totais: ${stats.total_videos}
- Postagens Realizadas: ${stats.total_mentions}
- Postagens Hoje: ${stats.mentions_today}
- Postagens Agendadas: ${stats.scheduled_mentions}
`;
```

## Localização do Código
- **Função SQL**: `/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/get_complete_project_stats_corrigida_total_mentions.sql`
- **Edge Function**: `/AGENTE_LIFTLIO/Edge_Functions/agente-liftlio-v33.ts`

## Tabelas Utilizadas
- `Canais do youtube`
- `Videos`
- `Settings messages posts`
- `Mensagens`
- `Scanner de videos do youtube`
- `Comentarios_Principais`

## Notas Importantes
- A função respeita o isolamento por projeto
- `total_mentions` conta apenas postagens com `postado IS NOT NULL`
- `scheduled_mentions` conta postagens com `proxima_postagem > NOW()` e `status = 'pending'`
- Os top channels são ordenados por `subscriber_count DESC`