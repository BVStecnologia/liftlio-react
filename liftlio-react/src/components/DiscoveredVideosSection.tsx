import React, { useState } from 'react';
import { useDiscoveredVideos } from '../hooks/useDiscoveredVideos';
import { useAgentActivity } from '../hooks/useAgentActivity';
import RecentDiscoveredVideos from './RecentDiscoveredVideos';

interface DiscoveredVideosSectionProps {
  projectId?: string | number;
  itemsPerPage?: number;
  showAgentActivity?: boolean; // Toggle to show agent activity data
}

/**
 * Component that fetches and displays discovered videos for a project
 * Uses the useDiscoveredVideos hook and passes data to the RecentDiscoveredVideos component
 * When showAgentActivity is true, uses useAgentActivity hook for richer data
 */
const DiscoveredVideosSection: React.FC<DiscoveredVideosSectionProps> = ({
  projectId,
  itemsPerPage = 10,
  showAgentActivity = true // Default to showing agent activity
}) => {
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Use agent activity hook when enabled (includes browser agent data)
  const agentActivityResult = useAgentActivity(showAgentActivity ? projectId : undefined, {
    page: currentPage,
    itemsPerPage,
  });

  // Fallback to regular discovered videos hook
  const discoveredVideosResult = useDiscoveredVideos(!showAgentActivity ? projectId : undefined, {
    page: currentPage,
    itemsPerPage,
  });

  // Choose which data source to use
  const {
    videos,
    loading,
    error,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = showAgentActivity ? agentActivityResult : discoveredVideosResult;

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
      itemsPerPage={itemsPerPage}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onNextPage={goToNextPage}
      onPrevPage={goToPrevPage}
    />
  );
};

export default DiscoveredVideosSection;