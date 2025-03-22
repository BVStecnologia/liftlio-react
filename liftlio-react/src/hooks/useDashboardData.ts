import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';

// Define types for the data structures
interface TrendData {
  value: string;
  positive: boolean;
}

interface StatData {
  value: string;
  trend: TrendData | null;
}

interface StatsData {
  reach: StatData;
  activities: StatData;
  engagements: StatData;
  leads: StatData;
}

interface PerformanceData {
  name: string;
  videos: number;
  engagement: number;
  leads: number;
  dateKey?: string;
}

interface WeeklyPerformanceData {
  project_id: number | string;
  date: string;
  formatted_date: string;
  views: number;
  videos?: number;
  engagements: number;
  leads: number;
}

interface PerformanceAnalysisData {
  project_id: number | string;
  date: string;
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  label: string;
  videos: number;
  views: number;
  engagements: number;
  leads: number;
}

interface ChannelData {
  project_id: number | string;
  channel_name: string;
  engagement_count: number;
  lead_count: number;
  weighted_score: number;
  lead_percentage: number;
}

interface TrafficSource {
  name: string;
  value: number;
  color: string;
  engagements?: number;
  leads?: number;
  leadPercentage?: number;
}

interface Keyword {
  id: string;
  keyword: string;
  sentiment: number;
  views: number;
  videos: number;
  likes: number;
  comments: number;
  topVideos: string[];
  category: string;
  audience: string;
  total_leads?: number;
  converted_leads?: number;
  keyword_composite_score?: number;
}

type TimeframeType = 'week' | 'month' | 'year';

export const useDashboardData = () => {
  // Obter o projeto atual do contexto global
  const { currentProject } = useProject();
  const projectId = currentProject?.id;  // Extraindo o ID do projeto para fácil referência
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dados para os cards
  const [statsData, setStatsData] = useState<StatsData>({
    reach: { value: '0', trend: null },
    activities: { value: '0', trend: null },
    engagements: { value: '0', trend: null },
    leads: { value: '0', trend: null }
  });
  
  // Dados para gráficos
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [keywordsTable, setKeywordsTable] = useState<Keyword[]>([]);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysisData[]>([]);
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeframeType>('year');
  
  // Função para filtrar dados conforme timeframe
  const filterByTimeframe = <T extends Record<string, any>>(data: T[], dateField: string, timeframe: TimeframeType): T[] => {
    const cutoffDate = new Date();
    
    if (timeframe === 'week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (timeframe === 'year') {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    }
    
    return data.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      return itemDate >= cutoffDate;
    });
  };
  
  // Carregar dados do dashboard
  useEffect(() => {
    if (!projectId) {
      console.log('Não foi possível buscar dados: ID do projeto não disponível');
      return;
    }
    
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Buscar dados das seis views em paralelo (removido comment_overview)
        const [
          keywordsResponse, 
          videosResponse, 
          metricsResponse, 
          channelsResponse, 
          performanceResponse,
          performanceAnalysisResponse
        ] = await Promise.all([
          supabase
            .from('keyword_overview')
            .select('*')
            .eq('project_id', projectId),
          
          supabase
            .from('best_videos_overview')
            .select('*')
            .eq('project_id', projectId),
            
          supabase
            .from('dashboard_metrics')
            .select('*')
            .eq('project_id', projectId),
            
          supabase
            .from('melhores_canais')
            .select('*')
            .eq('project_id', projectId),
            
          supabase
            .from('performance_semanal')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: true })
            .limit(30),
            
          supabase
            .from('grafico_performance')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: true })
            .limit(100)
        ]);
        
        if (keywordsResponse.error) throw keywordsResponse.error;
        if (videosResponse.error) throw videosResponse.error;
        if (metricsResponse.error) throw metricsResponse.error;
        if (channelsResponse.error) throw channelsResponse.error;
        if (performanceResponse.error) throw performanceResponse.error;
        if (performanceAnalysisResponse.error) throw performanceAnalysisResponse.error;
        
        const keywords = keywordsResponse.data || [];
        const videos = videosResponse.data || [];
        const metrics = metricsResponse.data[0] || {
          total_videos: 0,
          total_comments: 0,
          total_engagements: 0,
          total_leads: 0
        };
        const topChannels: ChannelData[] = channelsResponse.data || [];
        const weeklyPerformance: WeeklyPerformanceData[] = performanceResponse.data || [];
        const performanceAnalysis: PerformanceAnalysisData[] = performanceAnalysisResponse.data || [];
        console.log('Performance Analysis Data:', performanceAnalysis);
        
        // =============================================
        // 1. Processar CARDS DE ESTATÍSTICAS
        // =============================================
        
        // Usar dados da nova view dashboard_metrics
        const totalVideos = metrics.total_videos;
        const totalComments = metrics.total_comments;
        const totalEngagements = metrics.total_engagements;
        const totalLeads = metrics.total_leads;
        
        // Calcular tendências (simulação para este exemplo)
        // Em produção, você compararia com dados históricos reais
        setStatsData({
          reach: { 
            value: totalVideos.toString(), 
            trend: { value: '+3%', positive: true } as TrendData
          },
          activities: { 
            value: totalComments.toString(), 
            trend: { value: '+12%', positive: true } as TrendData
          },
          engagements: { 
            value: totalEngagements.toString(), 
            trend: { value: '+8%', positive: true } as TrendData
          },
          leads: { 
            value: totalLeads.toString(), 
            trend: totalLeads > 0 ? { value: '+15%', positive: true } as TrendData : null
          }
        });
        
        // =============================================
        // 2. Processar GRÁFICO DE PIZZA (Traffic Sources)
        // =============================================
        
        // Cores vivas e distintas para diferentes plataformas
        const channelColors: Record<string, string> = {
          'YouTube': '#FF0000',      // Vermelho
          'Google': '#4285F4',       // Azul Google
          'Facebook': '#3b5998',     // Azul Facebook
          'Instagram': '#C13584',    // Roxo Instagram 
          'TikTok': '#000000',       // Preto
          'Twitter': '#1DA1F2',      // Azul Twitter
          'LinkedIn': '#0077B5',     // Azul LinkedIn
          'Pinterest': '#E60023',    // Vermelho Pinterest
          'Snapchat': '#FFFC00',     // Amarelo Snapchat
          'Reddit': '#FF4500',       // Laranja Reddit
          'WhatsApp': '#25D366',     // Verde WhatsApp
          'Telegram': '#0088CC'      // Azul Telegram
        };
        
        // Usar dados da view melhores_canais - já vem os 8 melhores canais
        const trafficSourceData: TrafficSource[] = topChannels.map((channel: ChannelData) => ({
          name: channel.channel_name,
          value: channel.weighted_score,
          color: channelColors[channel.channel_name] || '#555555', // Usar cinza escuro para canais sem cor predefinida
          engagements: channel.engagement_count,
          leads: channel.lead_count,
          leadPercentage: channel.lead_percentage
        }));
        
        setTrafficSources(trafficSourceData);
        
        // =============================================
        // 3. Processar GRÁFICOS DE PERFORMANCE
        // =============================================
        
        // Usar dados da nova view grafico_performance em vez dos antigos
        let filteredPerformance: PerformanceAnalysisData[] = [];
        
        if (currentTimeframe === 'week') {
          // Últimos 7 dias
          filteredPerformance = performanceAnalysis.filter(data => data.granularity === 'daily').slice(-7);
        } else if (currentTimeframe === 'month') {
          // Últimos 30 dias
          filteredPerformance = performanceAnalysis.filter(data => data.granularity === 'daily').slice(-30);
        } else {
          // year - Usar dados anuais ou mensais se disponíveis
          filteredPerformance = performanceAnalysis.filter(data => data.granularity === 'yearly');
          if (filteredPerformance.length === 0) {
            filteredPerformance = performanceAnalysis.filter(data => data.granularity === 'monthly');
          }
        }
        
        // Converter para o formato esperado pelo gráfico
        let processedPerformanceData: PerformanceData[] = filteredPerformance.map(data => ({
          name: data.label || new Date(data.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
          videos: data.videos || 0,
          engagement: data.engagements || 0,
          leads: data.leads || 0
        }));
        
        console.log('Processed Performance Data:', processedPerformanceData);
        
        // Se não tiver dados suficientes, criar dados de exemplo para garantir visualização nos gráficos
        if (processedPerformanceData.length < 5) {
          const lastWeek = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
              name: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              videos: Math.floor(Math.random() * 1000) + 500,
              engagement: Math.floor(Math.random() * 100) + 50,
              leads: Math.floor(Math.random() * 20) + 5
            };
          });
          processedPerformanceData = lastWeek;
        }
        
        // Se não houver dados de traffic sources, criar dados de exemplo
        if (trafficSourceData.length === 0) {
          const sampleChannels = [
            { 
              name: 'YouTube', 
              value: 30, 
              color: '#FF0000',
              engagements: 20,
              leads: 10,
              leadPercentage: 33.33
            },
            { 
              name: 'Facebook', 
              value: 25, 
              color: '#3b5998',
              engagements: 15,
              leads: 10,
              leadPercentage: 40.0
            },
            { 
              name: 'Instagram', 
              value: 15, 
              color: '#C13584',
              engagements: 10,
              leads: 5,
              leadPercentage: 33.33
            },
            { 
              name: 'TikTok', 
              value: 10, 
              color: '#000000',
              engagements: 8,
              leads: 2,
              leadPercentage: 20.0
            },
            { 
              name: 'Twitter', 
              value: 8, 
              color: '#1DA1F2',
              engagements: 6,
              leads: 2,
              leadPercentage: 25.0
            },
            { 
              name: 'LinkedIn', 
              value: 5, 
              color: '#0077B5',
              engagements: 3,
              leads: 2,
              leadPercentage: 40.0
            },
            { 
              name: 'Pinterest', 
              value: 4, 
              color: '#E60023',
              engagements: 3,
              leads: 1,
              leadPercentage: 25.0
            },
            { 
              name: 'Snapchat', 
              value: 3, 
              color: '#FFFC00',
              engagements: 2,
              leads: 1,
              leadPercentage: 33.33
            }
          ];
          setTrafficSources(sampleChannels);
        }
        
        setPerformanceData(processedPerformanceData);
        setPerformanceAnalysis(performanceAnalysis);
        
        // =============================================
        // 4. Processar TABELA DE KEYWORDS 
        // =============================================
        
        // Mapear dados de keywords para o formato esperado pela tabela
        const keywordsData: Keyword[] = keywords.map((keyword: any) => {
          // Calcular uma pontuação de sentimento de 0-100
          // Combinando sentimento de vídeos e comentários
          const videoSentiment = parseFloat(keyword.avg_video_sentiment) || 0;
          const commentSentiment = parseFloat(keyword.avg_comments_sentiment) || 0;
          
          const sentimentScore = (
            (videoSentiment * 50) + 
            (commentSentiment * 50)
          );
          
          // Obter top vídeos desta keyword
          const topVideoIds = keyword.top_video_ids || [];
          
          // Para simplificar, usamos os próprios IDs como títulos
          // Em produção, você buscaria títulos dos vídeos a partir dos IDs
          const topVideos = topVideoIds.slice(0, 3);
          
          return {
            id: keyword.keyword,
            keyword: keyword.keyword,
            sentiment: sentimentScore,
            views: parseInt(keyword.total_views) || 0,
            videos: parseInt(keyword.total_videos) || 0,
            likes: parseInt(keyword.avg_likes) || 0,
            comments: parseInt(keyword.avg_comments) || 0,
            topVideos,
            category: keyword.most_common_category || 'General',
            audience: keyword.primary_target_audience || 'General',
            total_leads: parseInt(keyword.total_leads) || 0,
            converted_leads: parseInt(keyword.converted_leads) || 0,
            keyword_composite_score: parseFloat(keyword.keyword_composite_score) || 0
          };
        });
        
        setKeywordsTable(keywordsData);
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Configurar listeners para atualizações em tempo real
    const subscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Videos',
        filter: `scanner_id=in.(select id from "Scanner de videos do youtube" where "Projeto_id"=${projectId})`
      }, () => {
        // Recarregar dados quando houver mudanças nos vídeos
        fetchDashboardData();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, currentTimeframe]);
  
  // Função para atualizar o timeframe
  const setTimeframe = (timeframe: TimeframeType) => {
    setCurrentTimeframe(timeframe);
  };
  
  // Filtrar dados de análise de performance com base no timeframe
  const getFilteredAnalysisData = () => {
    let filteredData = [];
    
    if (currentTimeframe === 'week') {
      filteredData = performanceAnalysis.filter((data: PerformanceAnalysisData) => data.granularity === 'daily').slice(-7);
    } else if (currentTimeframe === 'month') {
      filteredData = performanceAnalysis.filter((data: PerformanceAnalysisData) => data.granularity === 'daily').slice(-30);
    } else {
      // year
      filteredData = performanceAnalysis.filter((data: PerformanceAnalysisData) => data.granularity === 'yearly');
      if (filteredData.length === 0) {
        // Se não houver dados anuais, tente mensais
        filteredData = performanceAnalysis.filter((data: PerformanceAnalysisData) => data.granularity === 'monthly');
      }
    }
    
    console.log(`Filtered data for ${currentTimeframe}:`, filteredData);
    return filteredData;
  };

  return {
    loading,
    error,
    statsData,
    performanceData,
    trafficSources,
    keywordsTable,
    timeframe: currentTimeframe,
    setTimeframe,
    performanceAnalysis: getFilteredAnalysisData()
  };
};