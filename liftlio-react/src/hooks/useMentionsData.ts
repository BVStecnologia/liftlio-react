import { useState, useEffect } from 'react';
import { supabase, callRPC } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';

// Type definition for mention data
export interface MentionData {
  id: number;
  video: {
    id: string;
    youtube_id: string;
    thumbnail: string;
    title: string;
    views: number;
    likes: number;
    channel?: string;
  };
  type: string;
  score: number;
  comment: {
    author: string;
    date: string;
    text: string;
    likes: number;
    comment_justificativa?: string;
  };
  response: {
    text: string;
    date: string | null;
    status: string; // 'posted' | 'scheduled' | 'draft' | 'new'
    msg_justificativa?: string;
  };
  favorite: boolean;
  msg_respondido: boolean;
}

// Statistics about mentions
export interface MentionStats {
  totalMentions: number;
  respondedMentions: number;
  pendingResponses: number;
  responseRate: number;
  trends: {
    totalMentionsTrend: number;
    respondedMentionsTrend: number;
    pendingResponsesTrend: number;
    responseRateTrend: number;
  };
}

// Performance data for charts
export interface MentionPerformance {
  day: string;
  mentions: number;
  responses: number;
  led: number;
  brand: number;
}

export type TimeframeType = 'day' | 'week' | 'month' | 'year';
export type TabType = 'all' | 'scheduled' | 'posted' | 'favorites';

export const useMentionsData = (activeTab: TabType = 'all') => {
  // Obter o projeto atual do contexto global
  const { currentProject } = useProject();
  const projectId = currentProject?.id;  // Extraindo o ID do projeto para fácil referência
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de tentativas repetidas
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // States for data
  const [mentionsData, setMentionsData] = useState<MentionData[]>([]);
  const [mentionStats, setMentionStats] = useState<MentionStats>({
    totalMentions: 0,
    respondedMentions: 0,
    pendingResponses: 0,
    responseRate: 0,
    trends: {
      totalMentionsTrend: 0,
      respondedMentionsTrend: 0,
      pendingResponsesTrend: 0,
      responseRateTrend: 0
    }
  });
  const [performanceData, setPerformanceData] = useState<MentionPerformance[]>([]);
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeframeType>('week');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5; // Limit of 5 items per page
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Helper function to process data in the interface format
  const processMentionsData = (data: any[]): MentionData[] => {
    return data.map((item: any) => {
      // Determinar a data correta para a resposta com base no status
      let responseDate = null;
      if (item.status_das_postagens === 'pending') {
        // Para menções agendadas, manter o formato original
        responseDate = item.scheduled_post_date_timestamp 
          ? item.scheduled_post_date_timestamp // Manter timestamp para ser formatado pelo formatDate depois
          : null;
      } else if (item.status_das_postagens === 'posted') {
        // Para menções postadas, manter o formato original
        responseDate = item.data_da_ultima_postagem || item.msg_created_at_formatted;
      } else {
        // Para outros casos, manter o comportamento original
        responseDate = item.msg_created_at_formatted;
      }

      return {
        id: item.comment_id,
        video: {
          id: item.video_id,
          youtube_id: item.video_youtube_id || '',
          thumbnail: item.video_youtube_id ? 
            `https://i.ytimg.com/vi/${item.video_youtube_id}/hqdefault.jpg` : 
            '',
          title: item.video_title || 'No title',
          views: parseInt(item.video_views) || 0,
          likes: parseInt(item.video_likes) || 0,
          channel: item.video_channel || 'Unknown channel'
        },
        type: item.msg_type === 1 ? 'LED' : item.msg_type === 2 ? 'BRAND' : 'Outro',
        score: parseFloat(item.comment_lead_score || '0'),
        comment: {
          author: item.comment_author || 'Anonymous',
          date: item.comment_published_at_formatted || '',
          text: item.comment_text || '',
          likes: parseInt(item.comment_likes) || 0,
          comment_justificativa: item.comment_justificativa || ''
        },
        response: {
          text: item.msg_text || '',
          date: responseDate,
          status: item.mention_status || 'new',
          msg_justificativa: item.msg_justificativa || ''
        },
        favorite: item.is_favorite || item.msg_template || item.template || false,
        msg_respondido: item.msg_respondido || false
      };
    });
  };
  
  // Helper function to calculate statistics
  const calculateStats = (data: any[]) => {
    // Se estamos na aba 'all', usamos todos os dados
    let dataToUse = data;
    
    // Se estamos em outra aba mas queremos estatísticas de todos os dados do projeto atual
    if (activeTab !== 'all') {
      // Por enquanto, vamos usar os dados disponíveis
      console.log('Calculando estatísticas baseadas nos dados disponíveis');
    }
    
    const totalMentions = dataToUse.length;
    const respondedMentions = dataToUse.filter((item: any) => 
      item.msg_created_at_formatted !== null).length;
    const pendingResponses = dataToUse.filter((item: any) => 
      item.msg_created_at_formatted === null).length;
    
    console.log(`Statistics: Total: ${totalMentions}, Responded: ${respondedMentions}, Pending: ${pendingResponses}`);
    const responseRate = totalMentions > 0 ? 
      (respondedMentions / totalMentions) * 100 : 0;
    
    // Trends (simulated for now)
    setMentionStats({
      totalMentions,
      respondedMentions,
      pendingResponses,
      responseRate,
      trends: {
        totalMentionsTrend: 5,
        respondedMentionsTrend: 12,
        pendingResponsesTrend: -3,
        responseRateTrend: 8
      }
    });
  };
  
  // Function to fetch and process data
  const fetchMentionsData = async () => {
    if (!projectId) {
      console.log('Não foi possível buscar dados: ID do projeto não disponível');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Buscando dados para aba: ${activeTab}, projeto ID: ${projectId}`);
        
        // Base query on the mentions_overview view
        let query = supabase
          .from('mentions_overview')
          .select('*') // Select all fields
          .eq('scanner_project_id', projectId)
          .range((currentPage - 1) * itemsPerPage, (currentPage * itemsPerPage) - 1); // Apply pagination
        
        // Apply specific filters for different tabs
        if (activeTab === 'scheduled') {
          console.log('Applying filter for scheduled mentions (status_das_postagens = pending)');
          query = query
            .eq('status_das_postagens', 'pending')
            .order('scheduled_post_date_timestamp', { ascending: true });  // Ordenar pela data agendada, mais próximas primeiro
        } else if (activeTab === 'posted') {
          console.log('Applying filter for posted mentions (status_das_postagens = posted)');
          query = query
            .eq('status_das_postagens', 'posted')
            .order('data_da_ultima_postagem', { ascending: false }); // Ordenar por data da última postagem
        } else if (activeTab === 'favorites' as TabType) {
          console.log('Applying filter for favorite mentions (msg_template=TRUE)');
          
          // Updated to filter only by msg_template=TRUE
          console.log('Finding msg_template=TRUE');
          
          const favResults = await Promise.all([
            supabase
              .from('mentions_overview')
              .select('*')
              .eq('scanner_project_id', projectId)
              .eq('msg_template', true)
              .order('comment_published_at', { ascending: false })
          ]);
          
          // Usar os resultados diretamente
          let favData: any[] = [];
          if (favResults[0].data) favData = [...favResults[0].data];
          
          // Calcular o total de páginas
          const totalFavorites = favData.length;
          const totalPages = Math.ceil(totalFavorites / itemsPerPage);
          
          // Atualizar o total de itens
          setTotalItems(totalFavorites);
          
          console.log(`Found ${favData.length} total favorites (${favResults[0].data?.length || 0} with msg_template=TRUE) - Page ${currentPage} of ${totalPages}`);
          
          // Processar os dados diretamente
          if (favData.length === 0) {
            setMentionsData([]);
            setMentionStats({
              totalMentions: 0,
              respondedMentions: 0,
              pendingResponses: 0,
              responseRate: 0,
              trends: {
                totalMentionsTrend: 0,
                respondedMentionsTrend: 0,
                pendingResponsesTrend: 0,
                responseRateTrend: 0
              }
            });
            setPerformanceData([]);
            setLoading(false);
            return; // Sair da função para evitar processamento adicional
          }
          
          // Ordenar dados combinados por data mais recente
          favData.sort((a, b) => {
            const dateA = new Date(a.comment_published_at || 0).getTime();
            const dateB = new Date(b.comment_published_at || 0).getTime();
            return dateB - dateA; // Ordenação decrescente
          });
          
          // Aplicar paginação manualmente aos dados combinados
          const paginatedFavData = favData.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );
          
          console.log(`Paginação: mostrando ${paginatedFavData.length} de ${favData.length} favoritos (página ${currentPage})`);
          
          // Continuar processamento normal com os dados paginados
          const processedMentions: MentionData[] = processMentionsData(paginatedFavData);
          setMentionsData(processedMentions);
          calculateStats(favData); // Maintain statistics about all data
          
          // Exit the function to avoid additional processing
          setLoading(false);
          return;
          
          // The lines below are never executed because we return above
          query = query.eq('is_favorite', true);
        }
        
        // Execute the main query
        console.log(`Executing query for tab: ${activeTab} (page ${currentPage})`);
        const { data, error } = await query;
        
        // Execute a separate query to get the total count
        // Instead of counting, let's fetch all IDs and count them manually
        let countQuery = supabase
          .from('mentions_overview')
          .select('comment_id')
          .eq('scanner_project_id', currentProject.id);
          
        // Apply the same filters in the count query
        if (activeTab === 'scheduled') {
          countQuery = countQuery
            .eq('status_das_postagens', 'pending');  // Only filter by status_das_postagens = pending
        } else if (activeTab === 'posted') {
          countQuery = countQuery.eq('status_das_postagens', 'posted');
        }
        
        console.log(`Executing count query for tab: ${activeTab}`);
        const { data: countData, error: countError } = await countQuery;
        
        if (countError) {
          console.error(`Error in count query: ${countError.message}`);
        }
        
        // Count manually
        const count = countData?.length || 0;
        
        // Update total items
        setTotalItems(count);
        
        console.log(`Results found: ${data?.length || 0} of ${count} total (page ${currentPage} of ${Math.ceil(count / itemsPerPage)})`);
        
        // Log de depuração detalhado
        if (data?.length === 0 && count > 0) {
          console.log(`No results found with applied filters for tab: ${activeTab}`);
          console.log('Query parameters:', { 
            projectId,
            activeTab,
            currentPage,
            status: activeTab === 'scheduled' ? 'pending' : activeTab === 'posted' ? 'posted' : 'all'
          });
          
          if (retryCount < maxRetries) {
            // Incrementar contador de tentativas
            setRetryCount(prev => prev + 1);
            console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
            
            // Se não temos dados mas temos total, tente a primeira página
            if (currentPage > 1) {
              console.log(`Retrying with first page since we have ${count} total items but current page ${currentPage} is empty`);
              setCurrentPage(1);
            } else {
              // Se já estamos na primeira página, aguardar e tentar novamente
              console.log('Already on first page, will retry automatically in 1 second');
              setTimeout(() => {
                fetchMentionsData();
              }, 1000);
            }
          } else {
            console.log(`Max retries (${maxRetries}) reached, giving up.`);
            // Resetar contador após atingir o máximo
            setRetryCount(0);
          }
        } else if (data?.length > 0) {
          // Se temos dados, resetar contador de tentativas
          setRetryCount(0);
        }
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          setMentionsData([]);
          setMentionStats({
            totalMentions: 0,
            respondedMentions: 0,
            pendingResponses: 0,
            responseRate: 0,
            trends: {
              totalMentionsTrend: 0,
              respondedMentionsTrend: 0,
              pendingResponsesTrend: 0,
              responseRateTrend: 0
            }
          });
          setPerformanceData([]);
          setLoading(false);
          return;
        }
        
        // Process data using the helper function
        const processedMentions: MentionData[] = processMentionsData(data);
        setMentionsData(processedMentions);
        
        // Calculate statistics
        calculateStats(data);
        
        // Performance data for the chart (grouped by day)
        // This would be a good case for a separate view in the database,
        // but we can calculate it here for now
        const performanceMap = new Map<string, { mentions: number, responses: number, led: number, brand: number }>();
        
        // Define an interval according to the timeframe
        const startDate = new Date();
        if (currentTimeframe === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (currentTimeframe === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (currentTimeframe === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else {
          startDate.setDate(startDate.getDate() - 1);
        }
        
        // Create dates for the interval
        const dates: string[] = [];
        const currentDate = new Date();
        let tempDate = new Date(startDate);
        
        while (tempDate <= currentDate) {
          const formattedDate = tempDate.toLocaleDateString('default', {
            month: 'short',
            day: 'numeric'
          });
          dates.push(formattedDate);
          performanceMap.set(formattedDate, { mentions: 0, responses: 0, led: 0, brand: 0 });
          
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        // Fill in real data
        data.forEach((item: any) => {
          // Processar todos os itens, independentemente do status
          // A data pode ser a data de publicação ou data atual se não estiver publicado
          const commentDate = item.comment_published_at ? new Date(item.comment_published_at) : new Date();
          if (commentDate >= startDate) {
            const formattedDate = commentDate.toLocaleDateString('default', {
              month: 'short',
              day: 'numeric'
            });
            
            const existing = performanceMap.get(formattedDate) || { mentions: 0, responses: 0, led: 0, brand: 0 };
            existing.mentions += 1;
            
            // If it was responded to (has a publication date)
            if (item.msg_created_at_formatted !== null) {
              existing.responses += 1;
            }
            
            // Classificar como LED (msg_type = 1) ou Brand (msg_type = 2)
            console.log(`Classificando item: msg_type=${item.msg_type}, author=${item.comment_author}`);
            
            if (item.msg_type === 1) {
              existing.led += 1;
              console.log('Classificado como LED');
            } else if (item.msg_type === 2) {
              existing.brand += 1;
              console.log('Classificado como Brand');
            } else {
              console.log('ALERTA: Item não classificado em nenhuma categoria!');
            }
            
            performanceMap.set(formattedDate, existing);
          }
        });
        
        // Convert to array for the chart
        const performance: MentionPerformance[] = dates.map(day => ({
          day,
          mentions: performanceMap.get(day)?.mentions || 0,
          responses: performanceMap.get(day)?.responses || 0,
          led: performanceMap.get(day)?.led || 0,
          brand: performanceMap.get(day)?.brand || 0
        }));
        
        setPerformanceData(performance);
        
      } catch (err: any) {
        console.error('Error fetching mentions data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  // Fetch and process data based on timeframe and tab
  useEffect(() => {
    if (!projectId) {
      console.log('Não foi possível configurar assinatura em tempo real: ID do projeto não disponível');
      return;
    }
    
    // Resetar contagem de retry ao mudar de tab ou página
    setRetryCount(0);
    
    fetchMentionsData();
    
    // Configure listener for real-time updates
    const subscription = supabase
      .channel('mentions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Comentarios_Principais',
        filter: `video_id=in.(select id from "Videos" where scanner_id in (select id from "Scanner de videos do youtube" where "Projeto_id"=${projectId}))`
      }, () => {
        fetchMentionsData();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, currentTimeframe, activeTab, currentPage]);
  
  // Função para atualizar o timeframe
  const setTimeframe = (timeframe: TimeframeType) => {
    setCurrentTimeframe(timeframe);
  };
  
  // Funções para navegação de páginas
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const goToPage = (page: number) => {
    const targetPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(targetPage);
  };
  
  // Função auxiliar para testar a tabela Mensagens
  const testarTabelaMensagens = async () => {
    console.log("Testando acesso à tabela Mensagens no Supabase...");
    
    try {
      const { data, error } = await supabase
        .from('Mensagens')
        .select('id, template')
        .limit(1);
        
      console.log("Teste acesso tabela Mensagens:", { 
        sucesso: !error, 
        erro: error ? error.message : null,
        dados: data,
        colunas: data && data.length > 0 ? Object.keys(data[0]) : []
      });
      
      return !error;
    } catch (err) {
      console.error("Erro crítico ao acessar tabela Mensagens:", err);
      return false;
    }
  };
  
  // Função para alternar favorito
  const toggleFavorite = async (mentionId: number) => {
    console.log("=== INICIANDO OPERAÇÃO DE FAVORITO ===");
    console.log(`Botão clicado para mentionId=${mentionId}`);
    
    // Verificar se o projeto está disponível
    if (!currentProject) {
      console.error("Projeto não disponível, não é possível alterar favorito");
      return;
    }
    
    // Encontrar a menção específica nos dados atuais
    const mention = mentionsData.find(m => m.id === mentionId);
    if (!mention) {
      console.error(`Menção com ID ${mentionId} não encontrada nos dados atuais`);
      return;
    }
    
    const newFavoriteState = !mention.favorite;
    console.log(`Alternando favorito: ID=${mentionId}, Estado atual=${mention.favorite}, Novo estado=${newFavoriteState}`);
    
    // Atualizar localmente para feedback imediato (otimista)
    setMentionsData(prev => 
      prev.map(item => 
        item.id === mentionId 
          ? { ...item, favorite: newFavoriteState } 
          : item
      )
    );
    
    try {
      // 1. Buscar informações específicas do comentário
      console.log(`Buscando detalhes do comentário ${mentionId}...`);
      const { data: comentario, error: fetchError } = await supabase
        .from('mentions_overview')
        .select('comment_id, msg_id, msg_template, is_favorite')
        .eq('comment_id', mentionId)
        .single();
        
      if (fetchError) {
        console.error(`Erro ao buscar comentário ${mentionId}:`, fetchError);
        throw fetchError;
      }
      
      if (!comentario) {
        console.error(`Comentário ${mentionId} não encontrado`);
        throw new Error(`Comentário não encontrado`);
      }
      
      console.log(`Dados do comentário: ${JSON.stringify(comentario)}`);
      
      // 2. Verificar se temos uma mensagem associada
      if (!comentario.msg_id) {
        console.error(`Nenhuma mensagem associada ao comentário ${mentionId}`);
        throw new Error(`Nenhuma mensagem associada`);
      }
      
      // 3. Formatar o ID da mensagem corretamente
      const msgId = comentario.msg_id;
      console.log(`ID da mensagem a ser atualizada: ${msgId}`);
      
      // 4. Atualizar diretamente na tabela Mensagens usando RPC ou SQL direto
      console.log(`Atualizando template na mensagem ${msgId} para ${newFavoriteState}`);
      
      // Teste usando método normal do Supabase
      console.log(`USANDO MÉTODO NORMAL: Atualizando direto na tabela Mensagens`);
      const { data: updateResult, error: updateError } = await supabase
        .from('Mensagens')
        .update({ template: newFavoriteState })
        .eq('id', msgId)
        .select();
      
      if (updateError) {
        console.error("FALHA ao atualizar favorito:", updateError);
        throw updateError;
      }
      
      console.log("Resultado da atualização:", updateResult);
      
      // 5. Verificar se a atualização foi bem-sucedida
      const { data: verificacao, error: verificacaoError } = await supabase
        .from('Mensagens')
        .select('id, template')
        .eq('id', msgId)
        .single();
        
      if (verificacaoError) {
        console.error("Erro ao verificar atualização:", verificacaoError);
      } else {
        console.log(`Verificação: mensagem ${msgId} tem template=${verificacao?.template}`);
        const sucesso = verificacao?.template === newFavoriteState;
        console.log(`Atualização foi ${sucesso ? 'BEM-SUCEDIDA ✅' : 'MAL-SUCEDIDA ❌'}`);
        
        if (!sucesso) {
          console.error("Valor não foi atualizado corretamente!");
          // Tentar método alternativo usando RPC
          try {
            console.log("Tentando método alternativo via RPC ou SQL direto");
            const altResult = await callRPC('update_message_template', { 
              message_id: msgId, 
              template_value: newFavoriteState 
            });
            console.log("Resultado do método alternativo:", altResult);
          } catch (rpcError) {
            console.error("Erro no método alternativo:", rpcError);
          }
        }
      }
      
      // 6. Recarregar dados se necessário
      // Isto é gerenciado pelo subscription em tempo real, então não precisamos
      // fazer nada aqui, apenas garantir que a UI está consistente
      console.log("Operação concluída, UI será atualizada pelo subscription");
      
    } catch (error) {
      console.error("ERRO NA OPERAÇÃO DE FAVORITO:", error);
      
      // Reverter estado local em caso de erro
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: mention.favorite } // Voltar ao estado original
            : item
        )
      );
    }
    
    console.log("=== OPERAÇÃO DE FAVORITO CONCLUÍDA ===");
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Se o formato de data original for DD/MM/YYYY HH:MM, vamos converter
        const parts = dateString.split(' ');
        if (parts.length === 2) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            const timeParts = parts[1].split(':');
            
            if (timeParts.length === 2) {
              const [hours, minutes] = timeParts;
              return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes)
              ).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        }
        return dateString; // Se não conseguir converter, retorna a string original
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  return {
    loading,
    error,
    mentionsData,
    mentionStats,
    performanceData,
    timeframe: currentTimeframe,
    setTimeframe,
    toggleFavorite,
    // Adicionar informações e funções de paginação
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      goToNextPage,
      goToPrevPage,
      goToPage
    }
  };
};