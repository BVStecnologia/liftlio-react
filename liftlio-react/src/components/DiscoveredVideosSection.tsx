import React from 'react';
import { useDiscoveredVideos } from '../hooks/useDiscoveredVideos';
import RecentDiscoveredVideos from './RecentDiscoveredVideos';

interface DiscoveredVideosSectionProps {
  projectId?: string | number;
  itemsPerPage?: number;
}

/**
 * Componente que busca e exibe vídeos descobertos para um projeto
 * Utiliza o hook useDiscoveredVideos e passa os dados para o componente RecentDiscoveredVideos
 */
const DiscoveredVideosSection: React.FC<DiscoveredVideosSectionProps> = ({ 
  projectId,
  itemsPerPage = 3
}) => {
  // Usar o hook para buscar os dados
  const { videos, loading, error } = useDiscoveredVideos(projectId, {
    itemsPerPage,
    // Outras opções podem ser adicionadas aqui conforme necessário
  });

  // Se ocorrer um erro, não exibir nada ou exibir uma mensagem de erro
  if (error) {
    console.error('Erro ao carregar vídeos descobertos:', error);
  }

  // O componente RecentDiscoveredVideos lida com dados vazios/null
  // usando dados mockados internamente
  return <RecentDiscoveredVideos data={videos} />;
};

export default DiscoveredVideosSection;