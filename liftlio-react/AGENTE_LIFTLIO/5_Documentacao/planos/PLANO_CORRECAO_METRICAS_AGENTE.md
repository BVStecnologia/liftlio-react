# Plano de Correção: Métricas do Agente AI

## Objetivo
Garantir que o agente AI sempre mostre exatamente as mesmas métricas que o usuário vê em sua tela, contextualizando as respostas de acordo com a página atual.

## 1. Correções Necessárias no Edge Function `agente-liftlio`

### 1.1 Corrigir Função `getProjectStats`

```typescript
async function getProjectStats(projectId: string, currentPage?: string) {
  try {
    // Usar a função RPC que conta mensagens postadas
    const { data: dashboardStats, error: dashboardError } = await supabase.rpc('get_project_dashboard_stats', {
      project_id_param: parseInt(projectId)
    });

    if (dashboardError) {
      console.error('Erro ao buscar dashboard stats:', dashboardError);
      return null;
    }

    // Métricas base do dashboard
    const baseStats = {
      totalChannels: dashboardStats?.channels_count || 0, // MUDANÇA: usar channels_count direto
      totalVideos: dashboardStats?.videos_count || 0,
      totalMentions: dashboardStats?.total_mentions || 0,
      mentionsToday: dashboardStats?.today_mentions || 0, // CORREÇÃO: usar today_mentions
    };

    // Adicionar métricas específicas da página
    if (currentPage === '/mentions') {
      // Buscar estatísticas de menções
      const { data: mentionStats } = await supabase
        .from('mentions_overview')
        .select('msg_created_at_formatted')
        .eq('scanner_project_id', projectId);
      
      const respondedMentions = mentionStats?.filter(m => m.msg_created_at_formatted !== null).length || 0;
      const pendingResponses = mentionStats?.filter(m => m.msg_created_at_formatted === null).length || 0;
      const responseRate = baseStats.totalMentions > 0 
        ? (respondedMentions / baseStats.totalMentions) * 100 
        : 0;

      return {
        ...baseStats,
        respondedMentions,
        pendingResponses,
        responseRate: responseRate.toFixed(1)
      };
    }

    if (currentPage === '/monitoring') {
      // Buscar estatísticas de monitoramento
      const { data: monitoringStats } = await supabase.rpc('get_monitoring_stats', {
        project_id_param: parseInt(projectId)
      });

      return {
        ...baseStats,
        totalViews: monitoringStats?.total_views || 0,
        totalLikes: monitoringStats?.total_likes || 0,
        engagementRate: monitoringStats?.media || 0
      };
    }

    if (currentPage === '/dashboard') {
      // Buscar mensagens agendadas
      const { count: scheduledCount } = await supabase
        .from('Mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('ProjetoID', projectId)
        .eq('Postado', false)
        .not('DataPostagem', 'is', null);

      // Buscar top canais
      const { data: topChannelsData } = await supabase.rpc('get_top_channels_by_project', {
        project_id_input: parseInt(projectId),
        limit_input: 3
      });

      return {
        ...baseStats,
        scheduledMessages: scheduledCount || 0,
        topChannels: topChannelsData || []
      };
    }

    // Retornar métricas base se não houver página específica
    return baseStats;

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}
```

### 1.2 Atualizar Formatação de Contexto

```typescript
// Adicionar estatísticas reais contextualizadas
if (projectStats) {
  const currentPagePath = context?.currentPage || '';
  
  if (language === 'pt') {
    contextualPrompt += `\n\n## 📊 Métricas do Projeto:`;
    
    // Métricas base sempre visíveis
    contextualPrompt += `\n- Total de canais: ${projectStats.totalChannels}`;
    contextualPrompt += `\n- Total de vídeos: ${projectStats.totalVideos}`;
    contextualPrompt += `\n- Total de menções: ${projectStats.totalMentions}`;
    
    // Métricas específicas da página
    if (currentPagePath.includes('/mentions')) {
      contextualPrompt += `\n\n### 📬 Estatísticas de Menções:`;
      contextualPrompt += `\n- Menções respondidas: ${projectStats.respondedMentions}`;
      contextualPrompt += `\n- Respostas pendentes: ${projectStats.pendingResponses}`;
      contextualPrompt += `\n- Taxa de resposta: ${projectStats.responseRate}%`;
    } else if (currentPagePath.includes('/monitoring')) {
      contextualPrompt += `\n\n### 📹 Estatísticas de Monitoramento:`;
      contextualPrompt += `\n- Visualizações totais: ${projectStats.totalViews?.toLocaleString()}`;
      contextualPrompt += `\n- Likes totais: ${projectStats.totalLikes?.toLocaleString()}`;
      contextualPrompt += `\n- Taxa de engajamento: ${projectStats.engagementRate}%`;
    } else if (currentPagePath.includes('/dashboard')) {
      contextualPrompt += `\n- Mensagens agendadas: ${projectStats.scheduledMessages}`;
      contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
      
      if (projectStats.topChannels?.length > 0) {
        contextualPrompt += `\n\n### 🏆 Top Canais:`;
        projectStats.topChannels.forEach((channel: any, index: number) => {
          contextualPrompt += `\n${index + 1}. ${channel.channel_title} (${channel.mention_count} menções)`;
        });
      }
    }
  } else {
    // Versão em inglês similar...
  }
}
```

### 1.3 Modificar Chamada da Função

```typescript
// Na função principal, passar a página atual
let projectStats = null;
if (context?.currentProject?.id) {
  // Passar currentPage como parâmetro
  projectStats = await getProjectStats(
    context.currentProject.id, 
    context?.currentPage
  );
  
  // Resto do código...
}
```

## 2. Testes de Validação

### 2.1 Dashboard
- Verificar se mostra: Canais, Vídeos, Menções, Agendadas
- Confirmar que "Canais" mostra o total, não apenas ativos

### 2.2 Mentions
- Verificar se mostra: Total, Respondidas, Pendentes, Taxa
- Confirmar cálculos de taxa de resposta

### 2.3 Monitoring  
- Verificar se mostra: Views, Likes, Engagement, Videos
- Confirmar formatação de números grandes

## 3. Implementação da Memória Contextual

O agente deve "lembrar" em que página o usuário estava nas conversas anteriores para fornecer contexto relevante mesmo sem a informação explícita da página atual.

```typescript
// Ao salvar conversa, incluir página atual nos metadados
await saveConversation(userId, projectId, sessionId, message, type, {
  currentPage: context?.currentPage,
  timestamp: new Date().toISOString(),
  message_length: message.length
});
```

## 4. Prioridade de Implementação

1. **Alta**: Corrigir cálculo de canais (ativos vs total)
2. **Alta**: Adicionar métricas de mensagens agendadas
3. **Média**: Contextualizar métricas por página
4. **Baixa**: Implementar memória de página nas conversas

## 5. Resultado Esperado

Após as correções, o agente deve:
- Sempre mostrar os mesmos números que aparecem na interface
- Adaptar as métricas mostradas de acordo com a página atual
- Usar nomenclatura consistente com a UI
- Fornecer contexto relevante baseado no que o usuário está vendo