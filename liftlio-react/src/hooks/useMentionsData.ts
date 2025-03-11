import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';

// Definição de tipos para dados de menções
export interface MentionData {
  id: number;
  video: {
    id: string;
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
  };
  response: {
    text: string;
    date: string | null;
    status: string; // 'posted' | 'scheduled' | 'draft' | 'new'
  };
  favorite: boolean;
  msg_respondido: boolean;
}

// Estatísticas sobre menções
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

// Dados de performance para gráficos
export interface MentionPerformance {
  day: string;
  mentions: number;
  responses: number;
}

export type TimeframeType = 'day' | 'week' | 'month' | 'year';
export type TabType = 'all' | 'scheduled' | 'posted' | 'favorites';

export const useMentionsData = (activeTab: TabType = 'all') => {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para dados
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
  
  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5; // Limite de 5 itens por página
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Função auxiliar para processar dados no formato da interface
  const processMentionsData = (data: any[]): MentionData[] => {
    return data.map((item: any) => ({
      id: item.comment_id,
      video: {
        id: item.video_id,
        thumbnail: item.video_youtube_id ? 
          `https://i.ytimg.com/vi/${item.video_youtube_id}/hqdefault.jpg` : 
          '',
        title: item.video_title || 'Sem título',
        views: parseInt(item.video_views) || 0,
        likes: parseInt(item.video_likes) || 0,
        channel: item.video_channel || 'Canal desconhecido'
      },
      type: item.comment_is_lead ? 'Led Score' : 'Standard',
      score: parseFloat(item.comment_lead_score || '0'),
      comment: {
        author: item.comment_author || 'Anônimo',
        date: item.comment_published_at_formatted || '',
        text: item.comment_text || '',
        likes: parseInt(item.comment_likes) || 0
      },
      response: {
        text: item.msg_text || '',
        date: item.msg_created_at_formatted || null,
        status: item.mention_status || 'new'
      },
      favorite: item.is_favorite || item.msg_template || false,
      msg_respondido: item.msg_respondido || false
    }));
  };
  
  // Função auxiliar para calcular estatísticas
  const calculateStats = (data: any[]) => {
    const totalMentions = data.length;
    const respondedMentions = data.filter((item: any) => 
      item.msg_created_at_formatted !== null).length;
    const pendingResponses = data.filter((item: any) => 
      item.msg_created_at_formatted === null).length;
    
    console.log(`Estatísticas: Total: ${totalMentions}, Respondidas: ${respondedMentions}, Pendentes: ${pendingResponses}`);
    const responseRate = totalMentions > 0 ? 
      (respondedMentions / totalMentions) * 100 : 0;
    
    // Tendências (simuladas por enquanto)
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
  
  // Função para buscar e processar os dados
  const fetchMentionsData = async () => {
    if (!currentProject) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching data for tab: ${activeTab}`);
        
        // Consulta base na view mentions_overview
        let query = supabase
          .from('mentions_overview')
          .select('*') // Selecionar todos os campos
          .eq('scanner_project_id', currentProject.id)
          .order('comment_published_at', { ascending: false }) // Ordenar pelos mais recentes
          .range((currentPage - 1) * itemsPerPage, (currentPage * itemsPerPage) - 1); // Aplicar paginação
        
        // Aplicar filtros específicos para as diferentes abas
        if (activeTab === 'scheduled') {
          console.log('Applying filter for scheduled mentions (msg_text not empty and msg_respondido = FALSE)');
          query = query
            .not('msg_text', 'is', null)    // Filter for non-empty msg_text
            .eq('msg_respondido', false);   // And msg_respondido = FALSE
        } else if (activeTab === 'posted') {
          console.log('Applying filter for posted mentions (published_date not empty)');
          query = query.not('msg_created_at_formatted', 'is', null); // Filter for non-empty published_date
        } else if (activeTab === 'favorites' as TabType) {
          console.log('Applying filter for favorite mentions (msg_template=TRUE)');
          
          // Updated to filter only by msg_template=TRUE
          console.log('Finding msg_template=TRUE');
          
          const favResults = await Promise.all([
            supabase
              .from('mentions_overview')
              .select('*')
              .eq('scanner_project_id', currentProject.id)
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
          calculateStats(favData); // Mantém estatísticas sobre todos os dados
          
          // Sair da função para evitar processamento adicional
          setLoading(false);
          return;
          
          // As linhas abaixo nunca são executadas pois retornamos acima
          query = query.eq('is_favorite', true);
        }
        
        // Executar a consulta principal
        const { data, error } = await query;
        
        // Executar uma consulta separada para obter a contagem total
        // Em vez de contar, vamos buscar todos os IDs e contar manualmente
        let countQuery = supabase
          .from('mentions_overview')
          .select('comment_id')
          .eq('scanner_project_id', currentProject.id);
          
        // Aplicar os mesmos filtros na consulta de contagem
        if (activeTab === 'scheduled') {
          countQuery = countQuery
            .not('msg_text', 'is', null)    // Filtra por msg_text não vazio
            .eq('msg_respondido', false);   // E msg_respondido = FALSE
        } else if (activeTab === 'posted') {
          countQuery = countQuery.not('msg_created_at_formatted', 'is', null);
        }
        
        const { data: countData } = await countQuery;
        
        // Contar manualmente
        const count = countData?.length || 0;
        
        // Atualizar total de itens
        setTotalItems(count);
        
        console.log(`Results found: ${data?.length || 0} of ${count} total (page ${currentPage} of ${Math.ceil(count / itemsPerPage)})`);
        if (data?.length === 0) {
          console.log('No results found with applied filters');
        } else if (activeTab === 'favorites' as TabType) {
          // Detailed log for debugging favorites
          console.log('Favorites found:');
          data.forEach((item: any, index: number) => {
            console.log(`Item ${index}: is_favorite=${item.is_favorite}, msg_template=${item.msg_template}, msg_respondido=${item.msg_respondido}`);
          });
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
        
        // Processar os dados usando a função auxiliar
        const processedMentions: MentionData[] = processMentionsData(data);
        setMentionsData(processedMentions);
        
        // Calcular estatísticas
        calculateStats(data);
        
        // Dados de performance para o gráfico (agrupados por dia)
        // Este seria um bom caso para uma view separada no banco,
        // mas podemos calcular aqui por enquanto
        const performanceMap = new Map<string, { mentions: number, responses: number }>();
        
        // Definir um intervalo de acordo com o timeframe
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
        
        // Criar datas para o intervalo
        const dates: string[] = [];
        const currentDate = new Date();
        let tempDate = new Date(startDate);
        
        while (tempDate <= currentDate) {
          const formattedDate = tempDate.toLocaleDateString('default', {
            month: 'short',
            day: 'numeric'
          });
          dates.push(formattedDate);
          performanceMap.set(formattedDate, { mentions: 0, responses: 0 });
          
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        // Preencher dados reais
        data.forEach((item: any) => {
          if (!item.comment_published_at) return;
          
          const commentDate = new Date(item.comment_published_at);
          if (commentDate >= startDate) {
            const formattedDate = commentDate.toLocaleDateString('default', {
              month: 'short',
              day: 'numeric'
            });
            
            const existing = performanceMap.get(formattedDate) || { mentions: 0, responses: 0 };
            existing.mentions += 1;
            
            // Se foi respondido (tem data de publicação)
            if (item.msg_created_at_formatted !== null) {
              existing.responses += 1;
            }
            
            performanceMap.set(formattedDate, existing);
          }
        });
        
        // Converter para array para o gráfico
        const performance: MentionPerformance[] = dates.map(day => ({
          day,
          mentions: performanceMap.get(day)?.mentions || 0,
          responses: performanceMap.get(day)?.responses || 0
        }));
        
        setPerformanceData(performance);
        
      } catch (err: any) {
        console.error('Error fetching mentions data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  // Busca e processa os dados com base no timeframe e tab
  useEffect(() => {
    if (!currentProject) return;
    
    fetchMentionsData();
    
    // Configurar listener para atualizações em tempo real
    const subscription = supabase
      .channel('mentions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Comentarios_Principais',
        filter: `video_id=in.(select id from "Videos" where scanner_id in (select id from "Scanner de videos do youtube" where "Projeto_id"=${currentProject.id}))`
      }, () => {
        fetchMentionsData();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [currentProject, currentTimeframe, activeTab, currentPage]);
  
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
  
  // Função para alternar favorito
  const toggleFavorite = async (mentionId: number) => {
    if (!currentProject) return;
    
    try {
      // Encontrar menção nos dados atuais
      const mention = mentionsData.find(m => m.id === mentionId);
      if (!mention) return;
      
      const newFavoriteState = !mention.favorite;
      
      // Detailed log for debugging
      console.log(`======= TOGGLING FAVORITE =======`);
      console.log(`Toggling favorite for mention ID ${mentionId}`);
      console.log(`Current state: favorite=${mention.favorite}`);
      console.log(`New state: favorite=${newFavoriteState}`);
      console.log(`=================================`);
      
      // Atualizar localmente para feedback imediato
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: newFavoriteState } 
            : item
        )
      );
      
      // Atualizar no banco de dados
      console.log(`Sending update to database: ID ${mentionId}, favorite=${newFavoriteState}`);
      
      // Obter a chave primária correta baseada no comment_id
      const { data: comentario, error: fetchError } = await supabase
        .from('Comentarios_Principais')
        .select('id, comment_id')
        .eq('comment_id', mentionId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching comment for update:', fetchError);
        throw fetchError;
      }
      
      if (!comentario) {
        console.error(`Comment with ID ${mentionId} not found`);
        throw new Error(`Comment not found`);
      }
      
      console.log(`Comment found: Table ID=${comentario.id}, comment_id=${comentario.comment_id}`);
      
      // Log current operation for debugging
      console.log(`Attempting to update template status in Mensagens table for comment ID=${comentario.id}`);
      
      try {
        // Let's add more detailed logging to understand the current state
        console.log(`Working with comment ID=${comentario.id} for update template=${newFavoriteState}`);
        
        // First check if a message record exists
        console.log(`Checking for existing message with Comentario_Principais=${comentario.id}`);
        const { data: existingMsg, error: checkError } = await supabase
          .from('Mensagens')
          .select('*')
          .eq('Comentario_Principais', comentario.id);
        
        if (checkError) {
          console.error('Error checking for existing message:', checkError);
          throw checkError;
        }
        
        console.log('Existing message check result:', existingMsg);
        
        if (existingMsg && existingMsg.length > 0) {
          // Update existing record
          console.log(`Found ${existingMsg.length} existing messages. Updating message ID=${existingMsg[0].id}`);
          
          const { data: updateResult, error: updateError } = await supabase
            .from('Mensagens')
            .update({ 
              template: newFavoriteState 
            })
            .eq('id', existingMsg[0].id)
            .select();
          
          if (updateError) {
            console.error('Error updating template in Mensagens:', updateError);
            throw updateError;
          }
          
          console.log('Update result:', updateResult);
        } else {
          // Create a new record
          console.log(`No existing record found. Creating new message for comment ID=${comentario.id}`);
          
          // Create a new message record
          const { data: newMsg, error: insertError } = await supabase
            .from('Mensagens')
            .insert({
              Comentario_Principais: comentario.id,
              template: newFavoriteState,
              mensagem: 'Favorite' // Add a default message
            })
            .select();
          
          if (insertError) {
            console.error('Error creating message record:', insertError);
            throw insertError;
          }
          
          console.log('New message created:', newMsg);
        }
      } catch (err) {
        console.error('Failed to update Mensagens table:', err);
        throw err;
      }
      
      // Also update the msg_template field in Comentarios_Principais for UI consistency
      console.log(`Now updating Comentarios_Principais table ID=${comentario.id} with msg_template=${newFavoriteState}`);
      
      const { data: commentUpdateResult, error: updateError } = await supabase
        .from('Comentarios_Principais')
        .update({ 
          msg_template: newFavoriteState
        })
        .eq('id', comentario.id)
        .select();
        
      if (updateError) {
        console.error('Error updating favorite status in database:', updateError);
        throw updateError;
      }
      
      console.log('Comment update result:', commentUpdateResult);
      
      // Let's verify that our update worked
      const { data: verifyData, error: verifyError } = await supabase
        .from('Comentarios_Principais')
        .select('id, msg_template')
        .eq('id', comentario.id)
        .single();
        
      if (verifyError) {
        console.error('Error verifying update:', verifyError);
      } else {
        console.log(`Verification result: Comment ID=${verifyData.id} has msg_template=${verifyData.msg_template}`);
      }
      
      console.log('Favorite status successfully updated in database');
      
      // Always reload data after toggling favorite status to ensure UI is consistent
      console.log("Reloading data after favorite status update");
      fetchMentionsData();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Reverter atualização local em caso de erro
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: !item.favorite } // Reverter para estado anterior
            : item
        )
      );
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