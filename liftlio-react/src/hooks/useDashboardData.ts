import { useState, useEffect } from 'react';
import React from 'react';
import { supabase, callRPC } from '../lib/supabaseClient';
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
  engagement: StatData;  // Community engagement messages
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
  
  // REMOVIDO: Estado loading local - usando apenas loading global
  // const [loading, setLoading] = useState(false);
  const loading = false; // Sempre false - loading é gerenciado globalmente
  const [error, setError] = useState<string | null>(null);
  
  // Dados para os cards
  const [statsData, setStatsData] = useState<StatsData>({
    reach: { value: '0', trend: null },
    activities: { value: '0', trend: null },
    engagements: { value: '0', trend: null },
    engagement: { value: '0', trend: null },
    leads: { value: '0', trend: null }
  });
  
  // Dados para gráficos
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [weeklyPerformanceData, setWeeklyPerformanceData] = useState<PerformanceData[]>([]);
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
      // setLoading(true); // Removido - loading global
      setError(null);
      
      try {
        // Buscar dados das seis views em paralelo (removido comment_overview)
        // Adicionando a nova chamada RPC get_project_dashboard_stats
        const [
          keywordsResponse, 
          videosResponse, 
          metricsResponse, 
          channelsResponse, 
          performanceResponse,
          performanceAnalysisResponse,
          dashboardStatsResponse
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
            .from('channel_metrics_dashboard')
            .select('*')
            .eq('projeto_id', projectId)
            .order('total_leads', { ascending: false })
            .limit(7),
            
          // Chamada RPC para dados de performance semanal
          callRPC('get_weekly_performance', {
            days_back: 30, // Aumentado para 30 dias para mostrar mais dados históricos
            project_id_param: projectId
          }),
            
          supabase
            .from('grafico_performance')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: true })
            .limit(100),
            
          // Nova chamada RPC para obter estatísticas de dashboard usando a função helper
          callRPC('get_project_dashboard_stats', {
            project_id_param: projectId
          })
        ]);
        
        if (keywordsResponse.error) throw keywordsResponse.error;
        if (videosResponse.error) throw videosResponse.error;
        if (metricsResponse.error) throw metricsResponse.error;
        if (channelsResponse.error) throw channelsResponse.error;
        if (performanceResponse.error) throw performanceResponse.error;
        if (performanceAnalysisResponse.error) throw performanceAnalysisResponse.error;
        // Não verificamos erro para a resposta do callRPC pois o formato é diferente
        
        const keywords = keywordsResponse.data || [];
        const videos = videosResponse.data || [];
        const metrics = metricsResponse.data[0] || {
          total_videos: 0,
          total_comments: 0,
          total_engagements: 0,
          total_leads: 0
        };
        
        // Obter os novos dados do dashboard da função RPC
        // A resposta da callRPC é diretamente o objeto JSON, sem a propriedade 'data'
        const dashboardStats = dashboardStatsResponse || {
          channels_count: 0,
          videos_count: 0,
          total_mentions: 0,
          total_engagement: 0,
          post_today: 0
        };
        const topChannels = channelsResponse.data || [];
        const performanceAnalysis: PerformanceAnalysisData[] = performanceAnalysisResponse.data || [];
        console.log('Performance Analysis Data:', performanceAnalysis);

        // Definir interface para a resposta da RPC
        interface WeeklyPerformanceRPC {
          date: string;
          Videos: number;
          Engagement: number;
          Mentions: number;
        }
        
        // Processar os dados do RPC get_weekly_performance
        let processedWeeklyData = [];
        console.log('Resposta da RPC get_weekly_performance:', performanceResponse);
        
        // Verificar diferentes formatos possíveis da resposta
        if (performanceResponse && Array.isArray(performanceResponse) && performanceResponse.length > 0) {
          // Se a resposta for um array [{ get_weekly_performance: [...] }]
          if (performanceResponse[0] && performanceResponse[0].get_weekly_performance) {
            processedWeeklyData = performanceResponse[0].get_weekly_performance.map((data: WeeklyPerformanceRPC) => ({
              name: data.date,
              videos: data.Videos || 0,
              engagement: data.Engagement || 0,
              leads: data.Mentions || 0
            }));
          } 
          // Se a resposta for diretamente um array de dados
          else if (Array.isArray(performanceResponse)) {
            processedWeeklyData = performanceResponse.map((data: WeeklyPerformanceRPC) => ({
              name: data.date,
              videos: data.Videos || 0,
              engagement: data.Engagement || 0,
              leads: data.Mentions || 0
            }));
          }
        } else if (performanceResponse && typeof performanceResponse === 'object') {
          // Se a resposta for { get_weekly_performance: [...] }
          if (performanceResponse.get_weekly_performance && Array.isArray(performanceResponse.get_weekly_performance)) {
            processedWeeklyData = performanceResponse.get_weekly_performance.map((data: WeeklyPerformanceRPC) => ({
              name: data.date,
              videos: data.Videos || 0,
              engagement: data.Engagement || 0,
              leads: data.Mentions || 0
            }));
          }
        } else {
          // Fallback para dados vazios caso a RPC não retorne o formato esperado
          console.log('Dados de performance semanal não disponíveis no formato esperado:', performanceResponse);
          processedWeeklyData = [];
        }
        
        console.log('Dados processados para o gráfico semanal:', processedWeeklyData);
        
        // Pegar apenas as últimas 7 entradas para manter o gráfico limpo
        const recentData = processedWeeklyData.slice(-7);
        console.log('Dados recentes para o gráfico (últimos 7 dias):', recentData);
        setWeeklyPerformanceData(recentData);
        
        // =============================================
        // 1. Processar CARDS DE ESTATÍSTICAS
        // =============================================
        
        // Usar dados da chamada RPC get_project_dashboard_stats
        // Garantindo que os valores são números, mesmo que a resposta contenha strings
        const totalChannels = Number(dashboardStats.channels_count) || 0;
        const totalVideos = Number(dashboardStats.videos_count) || 0;
        const totalMentions = Number(dashboardStats.total_mentions) || 0;
        const totalEngagement = Number(dashboardStats.total_engagement) || 0;
        const postToday = Number(dashboardStats.post_today) || 0;

        console.log('Dashboard Stats from RPC:', dashboardStats);

        // Calcular tendências (simulação para este exemplo)
        // Em produção, você compararia com dados históricos reais
        setStatsData({
          reach: {
            value: totalChannels.toString(),
            trend: null
          },
          activities: {
            value: totalVideos.toString(),
            trend: null
          },
          engagements: {
            value: totalMentions.toString(),
            trend: null
          },
          engagement: {
            value: totalEngagement.toString(),
            trend: null
          },
          leads: {
            value: postToday.toString(), 
            trend: null
          }
        });
        
        // =============================================
        // 2. Processar GRÁFICO DE PIZZA (Traffic Sources)
        // =============================================
        
        // Cores vivas e distintas para diferentes plataformas
        // Mapear todas as variações possíveis de nomes de canais para cores consistentes
        // ANALYTICS_COLORS palette for channel colors - Purple theme consistency
        const channelColors: Record<string, string> = {
          // Variações de YouTube - Primary Purple
          'YouTube': '#8b5cf6',
          'youtube': '#8b5cf6',
          'Youtube': '#8b5cf6',
          'YOUTUBE': '#8b5cf6',

          // Variações de Google - Accent Cyan
          'Google': '#22d3ee',
          'google': '#22d3ee',
          'GOOGLE': '#22d3ee',

          // Variações de Facebook - Secondary Purple
          'Facebook': '#a855f7',
          'facebook': '#a855f7',
          'FACEBOOK': '#a855f7',

          // Variações de Instagram - Light Purple
          'Instagram': '#c084fc',
          'instagram': '#c084fc',
          'INSTAGRAM': '#c084fc',

          // Variações de TikTok - Dark Purple
          'TikTok': '#7c3aed',
          'tiktok': '#7c3aed',
          'Tiktok': '#7c3aed',
          'TIKTOK': '#7c3aed',

          // Variações de Twitter - Accent Blue
          'Twitter': '#3b82f6',
          'twitter': '#3b82f6',
          'TWITTER': '#3b82f6',

          // Variações de LinkedIn - Lighter Purple
          'LinkedIn': '#d8b4fe',
          'linkedin': '#d8b4fe',
          'Linkedin': '#d8b4fe',
          'LINKEDIN': '#d8b4fe',

          // Outras plataformas - Mixed purple tones and accents
          'Pinterest': '#fb923c', // Accent Orange
          'pinterest': '#fb923c',
          'Snapchat': '#10b981', // Accent Green
          'snapchat': '#10b981',
          'Reddit': '#a855f7', // Secondary Purple
          'reddit': '#a855f7',
          'WhatsApp': '#10b981', // Accent Green
          'whatsapp': '#10b981',
          'Telegram': '#22d3ee', // Accent Cyan
          'telegram': '#22d3ee',
          'Discord': '#8b5cf6', // Primary Purple
          'discord': '#8b5cf6',
          'Medium': '#c084fc', // Light Purple
          'medium': '#c084fc',
          'Vimeo': '#7c3aed', // Dark Purple
          'vimeo': '#7c3aed',
          'Twitch': '#a855f7', // Secondary Purple
          'twitch': '#a855f7',
          'Spotify': '#10b981', // Accent Green
          'spotify': '#10b981',
          'Slack': '#d8b4fe', // Lighter Purple
          'slack': '#d8b4fe',
          'Tumblr': '#3b82f6', // Accent Blue
          'tumblr': '#3b82f6'
        };
        
        // Usar dados da nova view channel_metrics_dashboard - limitando a 7 canais
        // e organizando por total_leads (Mentions) em vez de weighted_score
        // ANALYTICS_COLORS palette - Purple theme for consistency with dashboard
        const fallbackColors = [
          '#8b5cf6', // Primary Purple (ANALYTICS_COLORS.purple.primary)
          '#a855f7', // Secondary Purple (ANALYTICS_COLORS.purple.secondary)
          '#c084fc', // Light Purple (ANALYTICS_COLORS.purple.light)
          '#7c3aed', // Dark Purple (ANALYTICS_COLORS.purple.dark)
          '#22d3ee', // Accent Cyan (ANALYTICS_COLORS.accent.cyan)
          '#10b981', // Accent Green (ANALYTICS_COLORS.accent.green)
          '#d8b4fe', // Lighter Purple (ANALYTICS_COLORS.purple.lighter)
          '#fb923c', // Accent Orange (ANALYTICS_COLORS.accent.orange)
          '#3b82f6'  // Accent Blue (ANALYTICS_COLORS.accent.blue)
        ];
        
        // First, collect all channels to determine min/max values for color scaling
        const allChannelsWithVideos = topChannels.map((channel: any) => ({
          name: channel.nome_canal || '',
          videos: channel.videos_encontrados || 0,
          engagements: channel.comentarios_reais || 0,
          leads: channel.total_leads || 0,
          leadPercentage: channel.total_leads > 0 && channel.comentarios_reais > 0
            ? (channel.total_leads / channel.comentarios_reais) * 100
            : 0
        }));

        // Find min and max video counts for color gradient
        const videosCounts = allChannelsWithVideos.map(c => c.videos);
        const minVideos = Math.min(...videosCounts);
        const maxVideos = Math.max(...videosCounts);

        // Analytics purple gradient: stronger (dark) for more videos, lighter for fewer videos
        const getPurpleGradientColor = (videoCount: number): string => {
          if (maxVideos === minVideos) {
            // All channels have same number of videos - use primary color
            return '#8b5cf6'; // Analytics primary
          }

          // Normalize video count to 0-1 range
          const normalizedValue = (videoCount - minVideos) / (maxVideos - minVideos);

          // Define purple gradient from light to dark (Analytics colors)
          const purpleGradient = [
            '#d8b4fe', // Lightest (fewer videos)
            '#c084fc', // Light
            '#a855f7', // Medium (Analytics secondary)
            '#8b5cf6', // Strong (Analytics primary)
            '#7c3aed'  // Strongest/Darkest (most videos)
          ];

          // Map normalized value to gradient index
          const gradientIndex = Math.min(
            Math.floor(normalizedValue * (purpleGradient.length - 1)),
            purpleGradient.length - 1
          );

          return purpleGradient[gradientIndex];
        };

        const trafficSourceData: TrafficSource[] = allChannelsWithVideos.map((channel) => {
          // Assign color based on video count (gradient from light to dark)
          const channelColor = getPurpleGradientColor(channel.videos);

          console.log(`Canal: ${channel.name}, Vídeos: ${channel.videos}, Cor: ${channelColor}`);

          return {
            name: channel.name,
            value: channel.videos,
            color: channelColor,
            engagements: channel.engagements,
            leads: channel.leads,
            leadPercentage: channel.leadPercentage
          };
        });
        
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
        // setLoading(false); // Removido - loading global
      }
    };
    
    fetchDashboardData();
    
    // Configurar listeners para atualizações em tempo real
    // NOTA: Removido filtro complexo que causava erro "malformed array literal"
    // O Supabase Realtime não suporta subqueries no filtro
    const subscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Videos'
        // Filtro removido - fetchDashboardData já filtra por projeto
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

  // Verificar se os dados são válidos
  const hasValidData = React.useMemo(() => {
    // Verificar se há dados válidos em todas as fontes principais
    const hasStatsData = statsData.reach.value !== '0' || 
                         statsData.activities.value !== '0' ||
                         statsData.engagements.value !== '0';
    
    const hasPerformanceData = performanceData.length > 0 && 
                              performanceData.some(d => d.videos > 0 || d.engagement > 0);
    
    const hasTrafficData = trafficSources.length > 0 && 
                          trafficSources.some(s => s.value > 0);
    
    return hasStatsData && hasPerformanceData && hasTrafficData;
  }, [statsData, performanceData, trafficSources]);

  return {
    loading,
    error,
    statsData,
    performanceData,
    weeklyPerformanceData, // Dados semanais sempre disponíveis independente do filtro
    trafficSources,
    keywordsTable,
    timeframe: currentTimeframe,
    setTimeframe,
    performanceAnalysis: getFilteredAnalysisData(),
    hasValidData
  };
};