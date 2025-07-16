# Análise: Métricas do Agente AI vs Dashboard

## Resumo da Análise

Após examinar o código do agente AI (Edge Function `agente-liftlio` v12) e comparar com os hooks do dashboard (`useDashboardData.ts`) e menções (`useMentionsData.ts`), identifiquei que **o agente está buscando as mesmas métricas que o usuário vê no dashboard**, mas existem algumas discrepâncias na forma como os dados são apresentados.

## 1. Métricas que o Agente Busca Corretamente ✅

### Dashboard Stats (via RPC `get_project_dashboard_stats`)
O agente busca exatamente os mesmos dados que o dashboard:
- **total_mentions**: Total de menções do projeto
- **mentions_posted_today**: Menções postadas hoje
- **channels_count**: Número de canais
- **videos_count**: Número de vídeos

### Dados Adicionais
- **Top Channels**: Via RPC `get_top_channels_by_project` (top 3 canais)
- **Mensagens Recentes**: Últimas 2 mensagens agendadas/postadas

## 2. Como o Dashboard Apresenta os Dados

No `useDashboardData.ts` (linhas 284-299):
```typescript
const totalChannels = Number(dashboardStats.channels_count) || 0;
const totalVideos = Number(dashboardStats.videos_count) || 0;
const totalMentions = Number(dashboardStats.total_mentions) || 0;
const todayMentions = Number(dashboardStats.today_mentions) || 0;
```

O dashboard mostra 4 cards principais:
1. **Reach** → `channels_count` (Alcance/Canais)
2. **Videos** → `videos_count` 
3. **Mentions** → `total_mentions`
4. **Scheduled** → Calculado separadamente

## 3. Como o Agente Apresenta os Dados

No `agente-liftlio_v12_cors_corrigido.ts.bak` (linhas 531-558):
```typescript
// Em português
contextualPrompt += `\n\n## 📈 Estatísticas REAIS do projeto:`;
contextualPrompt += `\n- Total de menções: ${projectStats.totalMentions}`;
contextualPrompt += `\n- Menções hoje: ${projectStats.mentionsToday}`;
contextualPrompt += `\n- Canais ativos: ${projectStats.activeChannels}`;
contextualPrompt += `\n- Vídeos totais: ${projectStats.totalVideos}`;
```

## 4. Discrepâncias Identificadas 🔍

### 4.1 Campo "Canais Ativos" vs "Total de Canais"
- **Dashboard**: Mostra `channels_count` (total de canais do RPC)
- **Agente**: Calcula `activeChannels` de forma diferente (linhas 192-199):
  ```typescript
  // Buscar canais ativos (que têm pelo menos uma menção)
  const uniqueChannels = new Set(activeChannelsData?.map(c => c.channelId) || []);
  const activeChannels = uniqueChannels.size;
  ```
  
**PROBLEMA**: O agente está contando apenas canais com menções, enquanto o dashboard mostra o total de canais do projeto.

### 4.2 Campo "Menções Hoje" 
- **Dashboard**: Usa `today_mentions` do RPC
- **Agente**: Usa `mentions_posted_today` do RPC (que parece ser o campo correto)

### 4.3 Falta de Métricas de Agendamento
- **Dashboard**: Tem um card "Scheduled" com mensagens agendadas
- **Agente**: Não mostra o total de mensagens agendadas pendentes

## 5. Recomendações para Correção 🛠️

### 5.1 Corrigir o Cálculo de Canais
```typescript
// Em vez de:
const activeChannels = uniqueChannels.size;

// Usar:
const totalChannels = dashboardStats?.channels_count || 0;
```

### 5.2 Adicionar Métricas de Agendamento
```typescript
// Buscar total de mensagens agendadas
const { count: scheduledCount } = await supabase
  .from('Mensagens')
  .select('*', { count: 'exact', head: true })
  .eq('ProjetoID', projectId)
  .eq('Postado', false)
  .not('DataPostagem', 'is', null);
```

### 5.3 Usar Nomenclatura Consistente
- Mudar "Canais ativos" para "Total de canais" 
- Garantir que os nomes das métricas sejam os mesmos do dashboard

### 5.4 Adicionar Contexto de Página
O agente deveria ajustar as métricas mostradas baseado na página atual:
- Se o usuário está em `/mentions` → Focar em estatísticas de menções
- Se está em `/monitoring` → Focar em estatísticas de vídeos
- Se está em `/dashboard` → Mostrar visão geral completa

## 6. Métricas por Página

### Dashboard (`/dashboard`)
- **Reach**: Total de canais (`channels_count`)
- **Videos**: Total de vídeos (`videos_count`)
- **Mentions**: Total de menções (`total_mentions`)
- **Scheduled**: Mensagens agendadas (calculado separadamente)

### Mentions (`/mentions`)
- **Total Mentions**: Total de menções na view
- **Responded Mentions**: Menções com `msg_created_at_formatted != null`
- **Pending Responses**: Menções com `msg_created_at_formatted == null`
- **Response Rate**: Porcentagem de menções respondidas

### Monitoring (`/monitoring`)
- **Total Views**: Total de visualizações dos vídeos
- **Likes**: Total de likes
- **Engagement Rate**: Taxa de engajamento média
- **Videos**: Total de vídeos do projeto

## 7. Conclusão

O agente está **parcialmente correto** ao buscar dados do mesmo RPC que o dashboard usa, mas há inconsistências na forma como alguns campos são calculados e apresentados. A principal discrepância está no cálculo de "canais ativos" vs "total de canais". 

Para garantir que o agente sempre mostre exatamente o que o usuário vê na tela, é necessário:
1. Usar os mesmos campos do RPC sem cálculos adicionais
2. Adicionar métricas faltantes (como mensagens agendadas)
3. Contextualizar as respostas baseado na página atual do usuário
4. Ajustar as métricas mostradas de acordo com a página onde o usuário está navegando