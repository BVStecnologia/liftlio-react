// Função corrigida de fetchEngagementData para debugging
const fetchEngagementData = async () => {
  if (!currentProject?.id) return;
  
  setLoadingEngagementData(true);
  try {
    // Determinar número de dias baseado no timeframe
    let days_back = 7; // Padrão: 7 dias
    if (timeframe === 'week') days_back = 7;
    else if (timeframe === 'month') days_back = 30;
    else if (timeframe === 'quarter') days_back = 90;
    else if (timeframe === 'year') days_back = 365;
    
    const project_id_param = currentProject.id;
    console.log(`Buscando dados de performance: projeto ${project_id_param}, últimos ${days_back} dias`);
    
    // Usar a função callRPC
    const data = await callRPC('get_weekly_project_performance', {
      days_back,
      project_id_param
    });
    
    // Debug completo da estrutura de dados recebida
    console.log('Estrutura completa da resposta da RPC:', JSON.stringify(data));
    
    if (!data) {
      console.error('Erro ao buscar dados de performance: dados vazios');
      generateFallbackEngagementData();
      return;
    }
    
    // Verificar a estrutura exata dos dados
    if (!Array.isArray(data)) {
      console.error('Erro de formato: data não é um array:', typeof data);
      generateFallbackEngagementData();
      return;
    }
    
    if (data.length === 0) {
      console.error('Erro: array de dados vazio');
      generateFallbackEngagementData();
      return;
    }
    
    // Verificar se a propriedade get_weekly_project_performance existe
    const performanceDataRoot = data[0]?.get_weekly_project_performance;
    if (!performanceDataRoot) {
      console.error('Erro: propriedade get_weekly_project_performance não encontrada em data[0]:', data[0]);
      generateFallbackEngagementData();
      return;
    }
    
    // Verificar se o resultado é um array
    if (!Array.isArray(performanceDataRoot)) {
      console.error('Erro: get_weekly_project_performance não é um array:', typeof performanceDataRoot);
      generateFallbackEngagementData();
      return;
    }
    
    console.log('Dados de performance em formato bruto:', performanceDataRoot);
    
    // Se não houver dados, usar fallback
    if (performanceDataRoot.length === 0) {
      console.log('Aviso: Nenhum dado de performance encontrado para o período');
      generateFallbackEngagementData();
      return;
    }
    
    // Debugar um item para entender sua estrutura
    console.log('Exemplo de item de performance:', performanceDataRoot[0]);
    
    // Verificar se os dados estão na ordem correta (mais antigo para mais recente)
    const sortedData = [...performanceDataRoot].sort((a, b) => {
      // Garantir que day existe e é uma string válida
      if (!a.day || !b.day) {
        console.error('Erro: propriedade day ausente em alguns itens');
        return 0;
      }
      
      // Ordenar por data (formato YYYY-MM-DD do campo 'day')
      return new Date(a.day).getTime() - new Date(b.day).getTime();
    });
    
    console.log('Dados ordenados:', sortedData);
    
    // Mapear diretamente para os nomes dos campos no gráfico
    const formattedData = sortedData.map((item) => {
      // Debug do item sendo processado
      console.log('Processando item:', item);
      
      // Formatar a data para exibição como dia da semana em inglês
      const date = new Date(item.day);
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekDay = weekDays[date.getDay()];
      
      // Debug das datas
      console.log(`Data original: ${item.day}, Date object: ${date}, Dia da semana: ${weekDay}`);
      
      // Formatar a data conforme o timeframe
      let displayDate = '';
      if (timeframe === 'week') {
        // Para exibição semanal, mostrar o dia da semana e a data
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        displayDate = `${weekDay} ${day}/${month}`;
      } else {
        // Para outros timeframes, usar o formato DD/MM da string date
        displayDate = item.date 
          ? item.date.substring(0, 5)  // Pegar apenas DD/MM
          : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      
      console.log(`Data formatada para exibição: ${displayDate}`);
      
      // Garantir que os valores numéricos sejam números, mesmo que venham como strings ou null
      const videos = item.videos !== undefined && item.videos !== null 
        ? Number(item.videos) 
        : 0;
        
      const engagement = item.engagement !== undefined && item.engagement !== null 
        ? Number(item.engagement) 
        : 0;
        
      const mentions = item.mentions !== undefined && item.mentions !== null 
        ? Number(item.mentions) 
        : 0;
        
      const channels = item.channels !== undefined && item.channels !== null 
        ? Number(item.channels) 
        : 0;
      
      return {
        date: displayDate,
        videos,
        engagement,
        mentions,
        channels
      };
    });
    
    console.log('Dados formatados para o gráfico:', formattedData);
    setDynamicEngagementData(formattedData);
  } catch (error) {
    console.error('Erro na chamada de performance:', error);
    generateFallbackEngagementData();
  } finally {
    setLoadingEngagementData(false);
  }
}; 