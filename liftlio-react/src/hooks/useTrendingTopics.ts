import { useState, useEffect, useCallback } from 'react';
import { callEdgeFunction } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface TrendingTopic {
  topic: string;
  volume: string;
  growth: string;
  status: 'RISING' | 'EXPLODING' | 'STABLE';
  category: string;
  sentiment: string;
  keywords: string[];
  top_channels: string[];
  geographic_distribution: Record<string, number>;
  age_demographics: Record<string, number>;
}

interface TrendsResponse {
  data: {
    analysis_summary: {
      total_trends: number;
      exploding_trends: number;
      trending_topics: number;
      average_growth: number;
    };
    trends: TrendingTopic[];
    insights: string[];
  };
  metadata: {
    timestamp: string;
    total_trends: number;
  };
}

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

      const data = await callEdgeFunction('youtube-trends', {
        time_range: '30d',
        regions: language === 'pt' ? 'BR' : 'US',
        languages: language === 'pt' ? 'por' : 'eng',
        categories: 'Technology,Gaming,Music,Food,Entertainment',
        min_volume: 500,
        max_results: 20,
        include_sentiment: true,
        output_format: 'detailed'
      });

      const response = data as TrendsResponse;
      const trendsData = response.data.trends;

      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: trendsData,
        timestamp: Date.now(),
        lang: language
      }));

      setTrends(trendsData);
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