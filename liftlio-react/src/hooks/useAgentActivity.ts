import { useState, useEffect } from 'react';
import { callRPC } from '../lib/supabaseClient';
import { AgentActivityData } from '../components/AgentActivityTimeline';

// Interface for the RPC function response
interface RPCAgentVideoResponse {
  mensagem_id: number;
  mensagem_texto: string;
  mensagem_data: string;
  mensagem_respondido: boolean;
  video_id: number;
  video_youtube_id: string;
  video_titulo: string;
  video_visualizacoes: number;
  video_likes: number;
  video_comentarios: number;
  content_category?: string;
  relevance_score?: number;
  canal_id: number;
  canal_nome: string;
  canal_youtube_id: string;
  sistema_tipo: 'direct' | 'reply';
  // Agent Activity Fields
  agent_task_id?: string;
  agent_task_type?: string;
  agent_status?: string;
  agent_duracao_segundos?: number;
  agent_started_at?: string;
  agent_completed_at?: string;
  agent_actions_result?: string;
  agent_success?: boolean;
  total_registros: number;
}

// Interface for the discovered video with agent activity
export interface DiscoveredVideoWithAgent {
  id: number;
  video_id_youtube: string;
  nome_do_video: string;
  thumbnailUrl: string;
  discovered_at: string;
  engaged_at: string;
  views: number;
  channel_id: number;
  channel_name: string;
  channel_image: string;
  engagement_message: string;
  content_category: string;
  relevance_score: number;
  position_comment: number;
  total_comments: number;
  projected_views: number;
  sistema_tipo: 'direct' | 'reply';
  // Agent activity
  agentActivity?: AgentActivityData;
}

// Interface for filtering options
interface AgentActivityOptions {
  page?: number;
  itemsPerPage?: number;
}

/**
 * Hook to fetch discovered videos with agent activity data
 */
export function useAgentActivity(
  projectId?: string | number,
  options: AgentActivityOptions = {}
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [videos, setVideos] = useState<DiscoveredVideoWithAgent[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Function to transform RPC data to the format expected by the component
  const mapResponseToVideos = (data: RPCAgentVideoResponse[]): DiscoveredVideoWithAgent[] => {
    return data.map(item => ({
      id: item.mensagem_id,
      video_id_youtube: item.video_youtube_id,
      nome_do_video: item.video_titulo || 'Untitled Video',
      thumbnailUrl: `https://img.youtube.com/vi/${item.video_youtube_id}/mqdefault.jpg`,
      discovered_at: item.mensagem_data,
      engaged_at: item.agent_completed_at || item.mensagem_data,
      views: item.video_visualizacoes || 0,
      channel_id: item.canal_id,
      channel_name: item.canal_nome || 'Unknown Channel',
      channel_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.canal_nome || 'Unknown')}&size=80&background=8B5CF6&color=fff`,
      engagement_message: item.mensagem_texto,
      content_category: item.content_category || "Uncategorized",
      relevance_score: item.relevance_score || 0.85,
      position_comment: item.video_comentarios + 1,
      total_comments: item.video_comentarios || 0,
      projected_views: Math.round((item.video_visualizacoes || 0) * (1 + (item.relevance_score || 0.8) / 2)),
      sistema_tipo: item.sistema_tipo,
      // Agent activity data
      agentActivity: item.agent_task_id ? {
        taskId: item.agent_task_id,
        taskType: item.agent_task_type,
        status: item.agent_status,
        durationSeconds: item.agent_duracao_segundos,
        startedAt: item.agent_started_at,
        completedAt: item.agent_completed_at,
        actionsResult: item.agent_actions_result,
        success: item.agent_success
      } : undefined
    }));
  };

  useEffect(() => {
    // Do nothing if there's no project ID
    if (!projectId) {
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Make RPC call to the new function
        const data = await callRPC('obter_discovered_videos_com_agent_activity', {
          p_projeto_id: projectId,
          p_pagina: options.page || 1,
          p_itens_por_pagina: options.itemsPerPage || 10
        });

        // Transform and store data if it exists
        if (data && data.length > 0) {
          const mappedVideos = mapResponseToVideos(data);
          setVideos(mappedVideos);
          // Extract total count from first item
          setTotalCount(data[0].total_registros || 0);
        } else {
          setVideos([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.error('Error fetching agent activity:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [projectId, options.page, options.itemsPerPage]);

  // Calculate pagination information
  const currentPage = options.page || 1;
  const itemsPerPage = options.itemsPerPage || 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return {
    videos,
    loading,
    error,
    totalCount,
    currentPage,
    itemsPerPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}
