import { useState, useEffect, useCallback } from 'react';
import { callRPC } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface DecliningTopic {
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

const CACHE_KEY = 'declining_topics_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useDecliningTopics = () => {
  const [trends, setTrends] = useState<DecliningTopic[]>([]);
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

      // Filter only topics with negative growth
      const decliningTrends = (data || [])
        .filter((trend: DecliningTopic) => {
          const growthValue = parseFloat(trend.growth);
          return growthValue < 0;
        })
        .slice(0, 10); // Get top 10 declining trends
        
      console.log('Total data received:', data?.length);
      console.log('Data received:', data);
      console.log('Filtered declining trends:', decliningTrends.length);
      console.log('Declining trends:', decliningTrends);

      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: decliningTrends,
        timestamp: Date.now(),
        lang: language
      }));

      setTrends(decliningTrends);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching declining trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch declining trends');
      
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