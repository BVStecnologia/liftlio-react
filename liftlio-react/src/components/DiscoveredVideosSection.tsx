import React, { useState } from 'react';
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
  itemsPerPage = 10
}) => {
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Use the hook to fetch data
  const { 
    videos, 
    loading, 
    error, 
    totalCount, 
    totalPages, 
    hasNextPage, 
    hasPrevPage 
  } = useDiscoveredVideos(projectId, {
    page: currentPage,
    itemsPerPage,
    // Other options can be added here as needed
  });

  // If there's an error, log it
  if (error) {
    console.error('Error loading discovered videos:', error);
  }

  // Pagination functions
  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // The RecentDiscoveredVideos component handles empty/null data
  // using mocked data internally
  return (
    <RecentDiscoveredVideos 
      data={videos} 
      projectId={projectId}
      loading={loading}
      // Pagination props
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onNextPage={goToNextPage}
      onPrevPage={goToPrevPage}
    />
  );
};

export default DiscoveredVideosSection;