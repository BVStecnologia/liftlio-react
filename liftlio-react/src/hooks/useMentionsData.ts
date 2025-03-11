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
      favorite: item.is_favorite || item.msg_template || false
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
      console.log(`Buscando dados para a aba: ${activeTab}`);
        
        // Consulta base na view mentions_overview
        let query = supabase
          .from('mentions_overview')
          .select('*') // Selecionar todos os campos
          .eq('scanner_project_id', currentProject.id)
          .order('comment_published_at', { ascending: false }) // Ordenar pelos mais recentes
          .range((currentPage - 1) * itemsPerPage, (currentPage * itemsPerPage) - 1); // Aplicar paginação
        
        // Aplicar filtros específicos para as diferentes abas
        if (activeTab === 'scheduled') {
          console.log('Aplicando filtro para menções agendadas (published_date vazio)');
          query = query.is('msg_created_at_formatted', null); // Filtra por published_date vazio
        } else if (activeTab === 'posted') {
          console.log('Aplicando filtro para menções postadas (published_date não vazio)');
          query = query.not('msg_created_at_formatted', 'is', null); // Filtra por published_date não vazio
        } else if (activeTab === 'favorites' as TabType) {
          console.log('Aplicando filtro para menções favoritadas');
          
          // Abordagem alternativa que é mais compatível
          // Faz duas consultas separadas e depois combina os resultados
          console.log('Buscando ambos os campos separadamente e combinando resultados');
          
          const favResults = await Promise.all([
            supabase
              .from('mentions_overview')
              .select('*')
              .eq('scanner_project_id', currentProject.id)
              .eq('is_favorite', true)
              .order('comment_published_at', { ascending: false }),
            supabase
              .from('mentions_overview')
              .select('*')
              .eq('scanner_project_id', currentProject.id)
              .eq('msg_template', true)
              .order('comment_published_at', { ascending: false })
          ]);
          
          // Combinar resultados e remover duplicatas
          let favData: any[] = [];
          if (favResults[0].data) favData = [...favResults[0].data];
          if (favResults[1].data) {
            // Adicionar apenas itens que não estão duplicados
            favResults[1].data.forEach((item: any) => {
              if (!favData.some(existingItem => existingItem.comment_id === item.comment_id)) {
                favData.push(item);
              }
            });
          }
          
          // Calcular o total de páginas
          const totalFavorites = favData.length;
          const totalPages = Math.ceil(totalFavorites / itemsPerPage);
          
          // Atualizar o total de itens
          setTotalItems(totalFavorites);
          
          console.log(`Encontrados ${favData.length} favoritos totais (${favResults[0].data?.length || 0} de is_favorite, ${favResults[1].data?.length || 0} de msg_template) - Página ${currentPage} de ${totalPages}`);
          
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
          countQuery = countQuery.is('msg_created_at_formatted', null);
        } else if (activeTab === 'posted') {
          countQuery = countQuery.not('msg_created_at_formatted', 'is', null);
        }
        
        const { data: countData } = await countQuery;
        
        // Contar manualmente
        const count = countData?.length || 0;
        
        // Atualizar total de itens
        setTotalItems(count);
        
        console.log(`Resultados encontrados: ${data?.length || 0} de ${count} total (página ${currentPage} de ${Math.ceil(count / itemsPerPage)})`);
        if (data?.length === 0) {
          console.log('Nenhum resultado encontrado com os filtros aplicados');
        } else if (activeTab === 'favorites' as TabType) {
          // Log detalhado para depuração dos favoritos
          console.log('Favoritos encontrados:');
          data.forEach((item: any, index: number) => {
            console.log(`Item ${index}: is_favorite=${item.is_favorite}, msg_template=${item.msg_template}`);
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
      
      // Log detalhado para depuração
      console.log(`Alternando favorito para menção ID ${mentionId}`);
      console.log(`Estado atual: favorite=${mention.favorite}`);
      console.log(`Novo estado: favorite=${newFavoriteState}`);
      
      // Atualizar localmente para feedback imediato
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: newFavoriteState } 
            : item
        )
      );
      
      // Atualizar no banco de dados
      console.log(`Enviando atualização para o banco de dados: ID ${mentionId}, favorite=${newFavoriteState}`);
      
      // Obter a chave primária correta baseada no comment_id
      const { data: comentario, error: fetchError } = await supabase
        .from('Comentarios_Principais')
        .select('id, comment_id')
        .eq('comment_id', mentionId)
        .single();
        
      if (fetchError) {
        console.error('Erro ao buscar comentário para atualizar:', fetchError);
        throw fetchError;
      }
      
      if (!comentario) {
        console.error(`Comentário com ID ${mentionId} não encontrado`);
        throw new Error(`Comentário não encontrado`);
      }
      
      console.log(`Comentário encontrado: ID da tabela=${comentario.id}, comment_id=${comentario.comment_id}`);
      
      // Atualizar usando a chave primária correta
      const { error: updateError } = await supabase
        .from('Comentarios_Principais')  // Tabela principal de comentários
        .update({ 
          is_favorite: newFavoriteState,
          msg_template: newFavoriteState  // Atualizar ambos os campos
        })
        .eq('id', comentario.id);  // Usar a chave primária real da tabela
        
      if (updateError) {
        console.error('Erro ao atualizar favorito no banco:', updateError);
        throw updateError;
      }
      
      console.log('Favorito atualizado com sucesso no banco de dados');
      
      // Buscar dados novamente para garantir consistência
      if (activeTab === 'favorites' as TabType) {
        console.log("Recarregando dados de favoritos após atualização");
        fetchMentionsData();
      }
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