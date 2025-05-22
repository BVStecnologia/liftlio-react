import { useState, useEffect } from 'react';
import { callRPC } from '../lib/supabaseClient';

// Interface for the RPC function response
interface RPCVideoResponse {
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
  canal_inscritos: number;
  canal_visualizacoes: number;
  total_registros: number;
}

// Interface for the discovered video component
export interface DiscoveredVideo {
  id: number;
  video_id_youtube: string;
  nome_do_video: string; // video name
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
}

// Interface for filtering options
interface DiscoveredVideosOptions {
  page?: number;
  itemsPerPage?: number;
  filtroRespondido?: boolean | null; // filter by responded status
  filtroMensagem?: string;           // filter by message content
  filtroVideoId?: number;            // filter by video ID
}

/**
 * Hook to fetch discovered videos using Supabase RPC
 */
export function useDiscoveredVideos(
  projectId?: string | number,
  options: DiscoveredVideosOptions = {}
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [videos, setVideos] = useState<DiscoveredVideo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Function to transform RPC data to the format expected by the component
  const mapResponseToVideos = (data: RPCVideoResponse[]): DiscoveredVideo[] => {
    return data.map(item => ({
      id: item.mensagem_id,
      video_id_youtube: item.video_youtube_id,
      nome_do_video: item.video_titulo,
      thumbnailUrl: `https://img.youtube.com/vi/${item.video_youtube_id}/mqdefault.jpg`,
      discovered_at: item.mensagem_data,
      engaged_at: item.mensagem_data,
      views: item.video_visualizacoes,
      channel_id: item.canal_id,
      channel_name: item.canal_nome,
      channel_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.canal_nome)}&size=80&background=random`,
      engagement_message: item.mensagem_texto,
      content_category: item.content_category || "Uncategorized",
      relevance_score: item.relevance_score || 0.85,
      position_comment: item.video_comentarios + 1, // As requested: total comments + 1
      total_comments: item.video_comentarios,
      projected_views: Math.round(item.video_visualizacoes * (1 + (item.relevance_score || 0.8) / 2))
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
        // Make RPC call directly using the callRPC helper function
        const data = await callRPC('obter_comentarios_postados_por_projeto', {
          id_projeto: projectId,
          pagina_atual: options.page || 1,
          itens_por_pagina: options.itemsPerPage || 3,
          filtro_respondido: options.filtroRespondido,
          filtro_mensagem: options.filtroMensagem,
          filtro_video_id: options.filtroVideoId
        });
        
        // Transform and store data if it exists
        if (data && data.length > 0) {
          const mappedVideos = mapResponseToVideos(data);
          setVideos(mappedVideos);
          // Extract total count from first item (all items have the same total_registros)
          setTotalCount(data[0].total_registros);
        } else {
          setVideos([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.error('Error fetching discovered videos:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [projectId, options.page, options.itemsPerPage, options.filtroRespondido, options.filtroMensagem, options.filtroVideoId]);
  
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