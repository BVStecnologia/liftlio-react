import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface MonitoredChannelsStats {
  count: number;
  loading: boolean;
  error: Error | null;
}

export function useMonitoredChannels(projectId?: string | number): MonitoredChannelsStats {
  const [stats, setStats] = useState<MonitoredChannelsStats>({
    count: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchChannelCount() {
      if (!projectId) {
        setStats({
          count: 0,
          loading: false,
          error: null
        });
        return;
      }

      try {
        // Get active channels for this project
        const { data, error } = await supabase
          .from('Canais do youtube')
          .select('id')
          .eq('Projeto', projectId)
          .eq('is_active', true);

        if (error) throw error;
        
        // Count the returned data
        const count = data?.length || 0;

        setStats({
          count: count || 0,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching monitored channels:', error);
        setStats({
          count: 0,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error fetching channel count')
        });
      }
    }

    fetchChannelCount();
    
    // Set up a polling interval to refresh the count every 60 seconds
    const interval = setInterval(fetchChannelCount, 60000);
    
    return () => clearInterval(interval);
  }, [projectId]);

  return stats;
}