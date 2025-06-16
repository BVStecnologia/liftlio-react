import { useState, useEffect, useCallback } from 'react';
import { callRPC } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface TrendingTopic {
  id: number;
  topic: string;
  category: string;
  status: string;
  volume: number;
  growth: string;
  velocity: string;
  momentum: string;
  engagement_rate: string;
  video_count: number;
  channel_count: number;
  quality_score: string;
  sentiment_score: string;
  sentiment_label: string;
  top_channels: Array<{
    id: string;
    name: string;
    videos: number;
    total_views: number;
    avg_engagement: number;
  }>;
  temporal_data: {
    frequency: number;
    last_seen: string;
    peak_date: string;
    first_seen: string;
    distribution: {
      older: number;
      last_24h: number;
      last_week: number;
      last_month: number;
    };
    days_trending: number;
  };
  scores: {
    risk: number;
    confidence: number;
    saturation: number;
    opportunity: number;
    sustainability: number;
  };
  insights: string[];
  last_seen: string;
  updated_at: string;
}

// Remove old interface as we're using RPC directly

const CACHE_KEY = 'trending_topics_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTrendingTopics = () => {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { language } = useLanguage();

  const fetchTrends = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp, lang } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION && lang === language) {
            setTrends(data);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      setError(null);

      const data = await callRPC('get_youtube_trends', {});

      // Filter only topics with positive growth
      const risingTrends = (data || [])
        .filter((trend: TrendingTopic) => {
          const growthValue = parseFloat(trend.growth);
          if (trend.topic === 'ClickUp') {
            console.log('ClickUp found:', trend);
            console.log('ClickUp growth value:', growthValue);
            console.log('ClickUp passes filter:', growthValue > 0);
          }
          return growthValue > 0;
        })
        .sort((a: TrendingTopic, b: TrendingTopic) => parseFloat(b.growth) - parseFloat(a.growth))
        .slice(0, 10); // Get top 10 rising trends by growth
      
      console.log('Total data received:', data?.length);
      console.log('Data received:', data);
      console.log('Filtered rising trends:', risingTrends.length);
      console.log('Rising trends:', risingTrends);
      console.log('ClickUp in final results?', risingTrends.some((t: TrendingTopic) => t.topic === 'ClickUp'));

      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: risingTrends,
        timestamp: Date.now(),
        lang: language
      }));

      setTrends(risingTrends);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
      
      // Try to use cached data even if expired
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        setTrends(data);
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refresh = () => fetchTrends(true);

  return {
    trends,
    loading,
    error,
    lastUpdated,
    refresh
  };
};