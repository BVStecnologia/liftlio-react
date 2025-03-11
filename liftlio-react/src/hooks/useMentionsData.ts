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
  
  // Busca e processa os dados com base no timeframe e tab
  useEffect(() => {
    if (!currentProject) return;
    
    const fetchMentionsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Buscando dados para a aba: ${activeTab}`);
        
        // Consulta base na view mentions_overview
        let query = supabase
          .from('mentions_overview')
          .select('*')
          .eq('scanner_project_id', currentProject.id);
        
        // Aplicar filtros específicos para as diferentes abas
        if (activeTab === 'scheduled') {
          console.log('Aplicando filtro para menções agendadas (published_date vazio)');
          query = query.is('msg_created_at_formatted', null); // Filtra por published_date vazio
        } else if (activeTab === 'posted') {
          console.log('Aplicando filtro para menções postadas (published_date não vazio)');
          query = query.not('msg_created_at_formatted', 'is', null); // Filtra por published_date não vazio
        } else if (activeTab === 'favorites') {
          console.log('Aplicando filtro para menções favoritadas (msg_template = true)');
          query = query.eq('msg_template', true); // Filtra por msg_template = true
        }
        
        // Executar a consulta
        const { data, error } = await query;
        
        console.log(`Resultados encontrados: ${data?.length || 0}`);
        if (data?.length === 0) {
          console.log('Nenhum resultado encontrado com os filtros aplicados');
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
        
        // Processar dados para o formato da interface
        const processedMentions: MentionData[] = data.map((item: any) => ({
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
          favorite: item.is_favorite || false
        }));
        
        setMentionsData(processedMentions);
        
        // Calcular estatísticas
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
  }, [currentProject, currentTimeframe, activeTab]);
  
  // Função para atualizar o timeframe
  const setTimeframe = (timeframe: TimeframeType) => {
    setCurrentTimeframe(timeframe);
  };
  
  // Função para alternar favorito
  const toggleFavorite = async (mentionId: number) => {
    if (!currentProject) return;
    
    try {
      // Encontrar menção nos dados atuais
      const mention = mentionsData.find(m => m.id === mentionId);
      if (!mention) return;
      
      const newFavoriteState = !mention.favorite;
      
      // Atualizar localmente para feedback imediato
      setMentionsData(prev => 
        prev.map(item => 
          item.id === mentionId 
            ? { ...item, favorite: newFavoriteState } 
            : item
        )
      );
      
      // Atualizar no banco de dados
      console.log(`Atualizando favorito para ID ${mentionId}: ${newFavoriteState}`);
      
      const { error } = await supabase
        .from('Comentarios_Principais')  // Tabela principal de comentários
        .update({ is_favorite: newFavoriteState })
        .eq('comment_id', mentionId);
        
      if (error) {
        console.error('Erro ao atualizar favorito no banco:', error);
        throw error;
      }
      
      console.log('Favorito atualizado com sucesso');
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
    toggleFavorite
  };
};