import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProcessingWrapper from '../components/ProcessingWrapperSimplified';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import { supabase } from '../lib/supabaseClient';

// Mock dependencies
jest.mock('../context/AuthContext');
jest.mock('../context/ProjectContext');
jest.mock('../context/LoadingContext');
jest.mock('../lib/supabaseClient');

describe('ProcessingWrapperSimplified RPC Tests', () => {
  const mockHideGlobalLoader = jest.fn();
  const mockShowGlobalLoader = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
    });

    (useGlobalLoading as jest.Mock).mockReturnValue({
      showGlobalLoader: mockShowGlobalLoader,
      hideGlobalLoader: mockHideGlobalLoader,
    });
  });

  test('should call RPC check_project_display_state with user email', async () => {
    // Setup mock project
    (useProject as jest.Mock).mockReturnValue({
      currentProject: { id: '1', status: '6' },
    });

    // Mock RPC response - dashboard state
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        display_component: 'dashboard',
        has_messages: true,
        project_status: 6,
        progress_percentage: 100,
        processing_message: 'Dashboard disponível'
      },
      error: null
    });

    (supabase.rpc as jest.Mock) = mockRpc;

    render(
      <ProcessingWrapper>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should call RPC with user email
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('check_project_display_state', {
        p_user_email: 'test@example.com'
      });
    });

    // Should hide global loader after RPC call
    await waitFor(() => {
      expect(mockHideGlobalLoader).toHaveBeenCalled();
    });

    // Should render children for dashboard state
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('should show processing screen for status <= 6 without messages', async () => {
    // Setup mock project
    (useProject as jest.Mock).mockReturnValue({
      currentProject: { id: '1', status: '3' },
    });

    // Mock RPC response - processing state
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        display_component: 'setup_processing',
        has_messages: false,
        project_status: 3,
        progress_percentage: 45,
        processing_message: 'Processando métricas de engajamento...'
      },
      error: null
    });

    (supabase.rpc as jest.Mock) = mockRpc;

    render(
      <ProcessingWrapper>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should call RPC
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });

    // Should show processing message
    await waitFor(() => {
      expect(screen.getByText(/Setting Up Your Project/i)).toBeInTheDocument();
    });
  });

  test('should handle RPC error gracefully', async () => {
    // Setup mock project
    (useProject as jest.Mock).mockReturnValue({
      currentProject: { id: '1', status: '0' },
    });

    // Mock RPC error
    const mockRpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'RPC error' }
    });

    (supabase.rpc as jest.Mock) = mockRpc;

    render(
      <ProcessingWrapper>
        <div>Test Content</div>
      </ProcessingWrapper>
    );

    // Should call RPC
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });

    // Should hide loader on error
    await waitFor(() => {
      expect(mockHideGlobalLoader).toHaveBeenCalled();
    });
  });
});