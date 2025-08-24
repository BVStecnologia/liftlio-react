import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProcessingWrapper from '../components/ProcessingWrapper';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import { supabase } from '../lib/supabaseClient';

// Mock dependencies
jest.mock('../context/ProjectContext');
jest.mock('../context/LoadingContext');
jest.mock('../lib/supabaseClient');

describe('ProcessingWrapper Race Condition Tests', () => {
  const mockHideGlobalLoader = jest.fn();
  const mockShowGlobalLoader = jest.fn();
  const mockOnCheckingStateChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useGlobalLoading as jest.Mock).mockReturnValue({
      showGlobalLoader: mockShowGlobalLoader,
      hideGlobalLoader: mockHideGlobalLoader,
    });
  });

  test('should notify parent when checking state changes', async () => {
    // Setup mock project with status 0
    (useProject as jest.Mock).mockReturnValue({
      currentProject: { id: '1', status: '0' },
      isInitialProcessing: false,
    });

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { status: '0' }, error: null }),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    render(
      <ProcessingWrapper onCheckingStateChange={mockOnCheckingStateChange}>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should call onCheckingStateChange(true) when starting
    await waitFor(() => {
      expect(mockOnCheckingStateChange).toHaveBeenCalledWith(true);
    });

    // Should hide global loader when processing
    await waitFor(() => {
      expect(mockHideGlobalLoader).toHaveBeenCalled();
    });
  });

  test('should not show GlobalLoader for projects with status <= 5', async () => {
    // Setup mock project with status 3
    (useProject as jest.Mock).mockReturnValue({
      currentProject: { id: '1', status: '3' },
      isInitialProcessing: false,
    });

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { status: '3' }, error: null }),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    render(
      <ProcessingWrapper onCheckingStateChange={mockOnCheckingStateChange}>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should hide global loader
    await waitFor(() => {
      expect(mockHideGlobalLoader).toHaveBeenCalled();
    });

    // Should never show global loader
    expect(mockShowGlobalLoader).not.toHaveBeenCalled();
  });

  test('should handle race condition between checking and status update', async () => {
    // Simulate a project that changes status during checking
    let callCount = 0;
    (useProject as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { currentProject: { id: '1', status: '0' }, isInitialProcessing: false };
      }
      return { currentProject: { id: '1', status: '6' }, isInitialProcessing: false };
    });

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { status: '6' }, error: null }),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    }));

    const { rerender } = render(
      <ProcessingWrapper onCheckingStateChange={mockOnCheckingStateChange}>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Simulate re-render with updated status
    rerender(
      <ProcessingWrapper onCheckingStateChange={mockOnCheckingStateChange}>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should always hide global loader during transitions
    await waitFor(() => {
      expect(mockHideGlobalLoader).toHaveBeenCalled();
    });
  });
});