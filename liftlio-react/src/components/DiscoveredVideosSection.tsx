import React from 'react';
import { useDiscoveredVideos } from '../hooks/useDiscoveredVideos';
import RecentDiscoveredVideos from './RecentDiscoveredVideos';

interface DiscoveredVideosSectionProps {
  projectId?: string | number;
  itemsPerPage?: number;
}

/**
 * Component that fetches and displays discovered videos for a project
 * Uses the useDiscoveredVideos hook and passes data to the RecentDiscoveredVideos component
 */
const DiscoveredVideosSection: React.FC<DiscoveredVideosSectionProps> = ({ 
  projectId,
  itemsPerPage = 3
}) => {
  // Use the hook to fetch data
  const { videos, loading, error } = useDiscoveredVideos(projectId, {
    itemsPerPage,
    // Other options can be added here as needed
  });

  // If there's an error, log it
  if (error) {
    console.error('Error loading discovered videos:', error);
  }

  // The RecentDiscoveredVideos component handles empty/null data
  // using mocked data internally
  return <RecentDiscoveredVideos data={videos} projectId={projectId} />;
};

export default DiscoveredVideosSection;