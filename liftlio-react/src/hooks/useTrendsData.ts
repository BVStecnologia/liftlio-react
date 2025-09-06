import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase ANÔNIMO para dados públicos (sem autenticação)
// Usando valores diretos como em supabaseClient.ts
const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Criar cliente público sem autenticação
const publicSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false, // NÃO persistir sessão
      autoRefreshToken: false, // NÃO renovar token
      detectSessionInUrl: false // NÃO detectar sessão na URL
    }
  }
);

export interface TrendData {
  id: number;
  topic: string;
  status: 'BLAZING' | 'ON FIRE' | 'HOT' | 'WARMING' | 'HEATING UP' | 'MODERATE' | 'COOLING' | 'COLD' | 'FROZEN';
  growth: number;
  velocity: number;
  momentum: number;
  volume: number;
  category: string;
  video_count: number;
  channel_count: number;
  engagement_rate: number;
  sentiment_score: number;
  sentiment_label: string;
  quality_score: number;
  temporal_data: {
    frequency: number;
    days_trending: number;
    first_seen: string;
    last_seen: string;
    peak_date: string;
    distribution: {
      last_24h: number;
      last_week: number;
      last_month: number;
      older: number;
    };
  };
  scores: {
    opportunity: number;
    saturation: number;
    sustainability: number;
    confidence: number;
    risk: number;
  };
  top_channels: Array<{
    id: string;
    name: string;
    videos: number;
    total_views: number;
    avg_engagement: number;
  }>;
  insights: string[];
}

export interface TrendsSummary {
  total_active: number;
  by_status: {
    BLAZING: number;
    'ON FIRE': number;
    HOT: number;
    WARMING: number;
    'HEATING UP': number;
    MODERATE: number;
    COOLING: number;
    COLD: number;
    FROZEN: number;
  };
  top_growing: Array<{
    topic: string;
    growth: number;
    status: string;
  }>;
  top_declining: Array<{
    topic: string;
    growth: number;
    status: string;
  }>;
  categories: Array<{
    category: string;
    count: number;
  }>;
  avg_growth: number;
  avg_sentiment: number;
  total_videos: number;
  total_channels: number;
}

export interface AnalyticsData {
  visitor_count: number;
  pageviews: number;
  avg_time_on_page: number;
  bounce_rate: number;
  top_countries: Array<{
    country: string;
    count: number;
  }>;
  top_referrers: Array<{
    referrer: string;
    count: number;
  }>;
}

export const useTrendsData = () => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<TrendsSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trends and analytics data
      const [trendsResponse, analyticsResponse] = await Promise.all([
        // Get current YouTube trends
        publicSupabase
          .from('youtube_trends_current')
          .select('*')
          .order('growth', { ascending: false }),
        
        // Get analytics data for the last 7 days
        publicSupabase
          .from('analytics')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      if (trendsResponse.error) throw trendsResponse.error;
      if (analyticsResponse.error) throw analyticsResponse.error;

      // Process trends data
      const processedTrends = (trendsResponse.data || []).map(trend => ({
        ...trend,
        growth: parseFloat(trend.growth || 0),
        velocity: parseFloat(trend.velocity || 0),
        momentum: parseFloat(trend.momentum || 0),
        engagement_rate: parseFloat(trend.engagement_rate || 0),
        sentiment_score: parseFloat(trend.sentiment_score || 0),
        quality_score: parseFloat(trend.quality_score || 0)
      }));

      setTrends(processedTrends);

      // Calculate summary data from trends
      if (processedTrends.length > 0) {
        const statusCounts = processedTrends.reduce((acc, trend) => {
          const status = trend.status as keyof TrendsSummary['by_status'];
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as TrendsSummary['by_status']);

        const categoryCounts = processedTrends.reduce((acc: Array<{ category: string; count: number }>, trend) => {
          const existing = acc.find((c: { category: string; count: number }) => c.category === trend.category);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ category: trend.category, count: 1 });
          }
          return acc;
        }, [] as Array<{ category: string; count: number }>);

        const summaryData: TrendsSummary = {
          total_active: processedTrends.length,
          by_status: {
            BLAZING: statusCounts.BLAZING || 0,
            'ON FIRE': statusCounts['ON FIRE'] || 0,
            HOT: statusCounts.HOT || 0,
            WARMING: statusCounts.WARMING || 0,
            'HEATING UP': statusCounts['HEATING UP'] || 0,
            MODERATE: statusCounts.MODERATE || 0,
            COOLING: statusCounts.COOLING || 0,
            COLD: statusCounts.COLD || 0,
            FROZEN: statusCounts.FROZEN || 0
          },
          top_growing: processedTrends
            .filter(t => t.growth > 0)
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 5)
            .map(t => ({
              topic: t.topic,
              growth: t.growth,
              status: t.status
            })),
          top_declining: processedTrends
            .filter(t => t.growth < 0)
            .sort((a, b) => a.growth - b.growth)
            .slice(0, 5)
            .map(t => ({
              topic: t.topic,
              growth: t.growth,
              status: t.status
            })),
          categories: categoryCounts.sort((a: { category: string; count: number }, b: { category: string; count: number }) => b.count - a.count),
          avg_growth: processedTrends.length > 0 
            ? processedTrends.reduce((sum, t) => sum + t.growth, 0) / processedTrends.length
            : 0,
          avg_sentiment: processedTrends.length > 0
            ? processedTrends.reduce((sum, t) => sum + t.sentiment_score, 0) / processedTrends.length
            : 0,
          total_videos: processedTrends.reduce((sum, t) => sum + (t.video_count || 0), 0),
          total_channels: processedTrends.reduce((sum, t) => sum + (t.channel_count || 0), 0)
        };

        setSummary(summaryData);
      }

      // Process analytics data
      if (analyticsResponse.data) {
        const analyticsData = analyticsResponse.data;
        
        // Calculate analytics metrics
        const visitorCount = new Set(analyticsData.map(a => a.visitor_id)).size;
        const pageviews = analyticsData.filter(a => a.event_type === 'pageview').length;
        
        const timeOnPageData = analyticsData
          .filter(a => a.time_on_page)
          .map(a => a.time_on_page);
        const avgTimeOnPage = timeOnPageData.length > 0
          ? timeOnPageData.reduce((a, b) => a + b, 0) / timeOnPageData.length
          : 0;
        
        // Calculate bounce rate
        const sessions = new Set(analyticsData.map(a => a.session_id));
        const bounces = Array.from(sessions).filter(sessionId => {
          const sessionEvents = analyticsData.filter(a => a.session_id === sessionId);
          return sessionEvents.length === 1;
        }).length;
        const bounceRate = sessions.size > 0 ? (bounces / sessions.size) * 100 : 0;
        
        // Get top countries
        const countryCounts = analyticsData.reduce((acc, a) => {
          if (a.country) {
            acc[a.country] = (acc[a.country] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const topCountries = Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        // Get top referrers
        const referrerCounts = analyticsData.reduce((acc, a) => {
          if (a.referrer && a.referrer !== 'direct') {
            acc[a.referrer] = (acc[a.referrer] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const topReferrers = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({ referrer, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setAnalytics({
          visitor_count: visitorCount,
          pageviews,
          avg_time_on_page: avgTimeOnPage,
          bounce_rate: bounceRate,
          top_countries: topCountries,
          top_referrers: topReferrers
        });
      }
    } catch (error) {
      console.error('Error fetching trends data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendsData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchTrendsData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchTrendsData]);

  // Calculate historical data for charts based on temporal distribution
  const getHistoricalData = (trend: TrendData) => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    // If no temporal data, generate sample data based on growth
    if (!trend.temporal_data || !trend.temporal_data.distribution) {
      const baseValue = 100;
      const growthRate = trend.growth / 100;
      
      // Generate ascending data based on growth rate
      return [
        { date: new Date(now - 30 * day).toISOString(), value: baseValue, label: '30d ago' },
        { date: new Date(now - 21 * day).toISOString(), value: baseValue * (1 + growthRate * 0.3), label: '21d ago' },
        { date: new Date(now - 14 * day).toISOString(), value: baseValue * (1 + growthRate * 0.5), label: '14d ago' },
        { date: new Date(now - 7 * day).toISOString(), value: baseValue * (1 + growthRate * 0.7), label: '7d ago' },
        { date: new Date(now - 3 * day).toISOString(), value: baseValue * (1 + growthRate * 0.85), label: '3d ago' },
        { date: new Date(now - day).toISOString(), value: baseValue * (1 + growthRate * 0.95), label: '1d ago' },
        { date: new Date(now).toISOString(), value: baseValue * (1 + growthRate), label: 'Now' }
      ];
    }
    
    const { distribution } = trend.temporal_data;
    
    // Generate data points based on temporal distribution
    const data = [];
    
    // Last 24 hours
    data.push({
      date: new Date(now - day).toISOString(),
      value: distribution.last_24h || 0,
      label: '24h ago'
    });
    
    // Last week
    data.push({
      date: new Date(now - 7 * day).toISOString(),
      value: distribution.last_week || 0,
      label: '1 week ago'
    });
    
    // Last month
    data.push({
      date: new Date(now - 30 * day).toISOString(),
      value: distribution.last_month || 0,
      label: '1 month ago'
    });
    
    // Add current value (extrapolated from growth)
    const currentValue = Math.max(
      distribution.last_24h || 0,
      distribution.last_week || 0,
      distribution.last_month || 0
    ) * (1 + trend.growth / 100);
    
    data.push({
      date: new Date(now).toISOString(),
      value: currentValue,
      label: 'Now'
    });
    
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return {
    trends,
    summary,
    analytics,
    loading,
    error,
    refresh: fetchTrendsData,
    getHistoricalData
  };
};