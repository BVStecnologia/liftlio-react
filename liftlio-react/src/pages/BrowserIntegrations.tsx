import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  FaGoogle as FaGoogleBase,
  FaYoutube as FaYoutubeBase,
  FaReddit as FaRedditBase,
  FaCheck as FaCheckBase,
  FaTimes as FaTimesBase,
  FaSpinner as FaSpinnerBase,
  FaLock as FaLockBase,
  FaEye as FaEyeBase,
  FaEyeSlash as FaEyeSlashBase,
  FaPlug as FaPlugBase,
  FaSignOutAlt as FaSignOutAltBase,
  FaMobileAlt as FaMobileAltBase,
  FaEnvelope as FaEnvelopeBase
} from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabaseClient';

// Icon wrappers for React 19 compatibility
const FaGoogle: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaGoogleBase as any, props);
const FaYoutube: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaYoutubeBase as any, props);
const FaReddit: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaRedditBase as any, props);
const FaCheck: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaCheckBase as any, props);
const FaTimes: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaTimesBase as any, props);
const FaSpinner: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaSpinnerBase as any, props);
const FaLock: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaLockBase as any, props);
const FaEye: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaEyeBase as any, props);
const FaEyeSlash: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaEyeSlashBase as any, props);
const FaPlug: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaPlugBase as any, props);
const FaSignOutAlt: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaSignOutAltBase as any, props);
const FaMobileAlt: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaMobileAltBase as any, props);
const FaEnvelope: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaEnvelopeBase as any, props);

// ============================================
// CONFIG
// ============================================

const BROWSER_ORCHESTRATOR_URL = process.env.REACT_APP_BROWSER_ORCHESTRATOR_URL || 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy';
const BROWSER_MCP_API_KEY = process.env.REACT_APP_BROWSER_MCP_API_KEY || '';
const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';
const VPS_IP = '173.249.22.2';

const getVpsUrl = (port: number, path: string): string => {
  if (IS_HTTPS) return `/browser-proxy/port/${port}/${path}`;
  return `http://${VPS_IP}:${port}/${path}`;
};

const getOrchestratorUrl = (path: string): string => {
  if (IS_HTTPS) return `/browser-proxy/orchestrator/${path}`;
  return `${BROWSER_ORCHESTRATOR_URL}/${path}`;
};

// ============================================
// TYPES
// ============================================

interface BrowserPlatform {
  id: number;
  platform_name: string;
  display_name: string;
  login_url: string;
  login_prompt: string;
  logout_prompt?: string;
  check_logged_prompt: string;
  twofa_phone_prompt: string;
  twofa_code_prompt: string;
  icon_name: string;
  brand_color: string;
  supports_google_sso: boolean;
  is_active: boolean;
}

interface BrowserLogin {
  id?: number;
  projeto_id: number;
  platform_name: string;
  login_email: string;
  login_password?: string;
  uses_google_sso: boolean;
  google_login_id?: number;
  is_connected: boolean;
  connected_at?: string;
  has_2fa: boolean;
  twofa_type?: string;
  last_error?: string;
  is_active: boolean;
}

type LoginStatus = 'idle' | 'connecting' | '2fa_phone' | '2fa_code' | 'success' | 'error' | 'disconnecting';

interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

// ============================================
// ICONS MAP
// ============================================

const ICONS: Record<string, React.ComponentType<any>> = {
  FaGoogle,
  FaYoutube,
  FaReddit,
};

// ============================================
// ANIMATIONS
// ============================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const phoneVibrate = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const PageContainer = styled.div`
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s ease-out;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
  text-align: center;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  svg {
    color: #8b5cf6;
  }
`;

const PageDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

// Step Cards
const StepCard = styled.div<{ $active: boolean; $completed: boolean }>`
  background: ${props => props.theme.colors.bg.secondary};
  border: 2px solid ${props =>
    props.$completed ? '#10B981' :
    props.$active ? '#8b5cf6' :
    props.theme.colors.border.primary};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  opacity: ${props => props.$active || props.$completed ? 1 : 0.6};
  transition: all 0.3s ease;
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const StepNumber = styled.div<{ $completed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$completed ? '#10B981' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
`;

const StepTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  flex: 1;
`;

const StepContent = styled.div``;

// Form Elements
const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 8px;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  padding-right: 44px;
  background: ${props => props.theme.colors.bg.tertiary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 10px;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.muted};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const PrimaryButton = styled.button<{ $loading?: boolean }>`
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    ${props => props.$loading && css`animation: ${spin} 1s linear infinite;`}
  }
`;

const DisconnectButton = styled.button<{ $loading?: boolean }>`
  padding: 10px 20px;
  background: transparent;
  color: #EF4444;
  border: 1px solid #EF4444;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    ${props => props.$loading && css`animation: ${spin} 1s linear infinite;`}
  }
`;

// Platform Checkboxes
const PlatformList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PlatformItem = styled.label<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: ${props => props.$connected
    ? 'rgba(16, 185, 129, 0.1)'
    : props.theme.colors.bg.tertiary};
  border: 1px solid ${props => props.$connected
    ? '#10B981'
    : props.theme.colors.border.primary};
  border-radius: 12px;
  cursor: ${props => props.$connected ? 'default' : 'pointer'};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.$connected ? '#10B981' : '#8b5cf6'};
  }
`;

const PlatformIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const PlatformInfo = styled.div`
  flex: 1;
`;

const PlatformName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const PlatformStatus = styled.div<{ $connected: boolean }>`
  font-size: 12px;
  color: ${props => props.$connected ? '#10B981' : props.theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: #8b5cf6;
`;

// Status Messages
const StatusMessage = styled.div<{ $type: 'info' | 'success' | 'error' | 'warning' }>`
  padding: 16px;
  border-radius: 10px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;

  ${props => props.$type === 'info' && `
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #8b5cf6;
  `}

  ${props => props.$type === 'success' && `
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10B981;
  `}

  ${props => props.$type === 'error' && `
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #EF4444;
  `}

  ${props => props.$type === 'warning' && `
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #F59E0B;
  `}

  svg {
    flex-shrink: 0;
  }
`;

const TwoFAInput = styled.input`
  width: 180px;
  padding: 16px;
  background: ${props => props.theme.colors.bg.tertiary};
  border: 2px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 8px;
  color: ${props => props.theme.colors.text.primary};
  margin: 16px auto;
  display: block;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const ConnectedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 20px;
  color: #10B981;
  font-size: 13px;
  font-weight: 500;

  svg {
    font-size: 14px;
  }
`;

// Agent Steps Progress
const AgentStepsContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: ${props => props.theme.colors.bg.tertiary};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border.primary};
`;

const AgentStepItem = styled.div<{ $status: 'pending' | 'active' | 'completed' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

const StepIndicator = styled.div<{ $status: 'pending' | 'active' | 'completed' | 'error' }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;

  ${props => props.$status === 'pending' && `
    background: ${props.theme.colors.bg.secondary};
    border: 2px solid ${props.theme.colors.border.primary};
    color: ${props.theme.colors.text.muted};
  `}

  ${props => props.$status === 'active' && `
    background: rgba(139, 92, 246, 0.2);
    border: 2px solid #8b5cf6;
    color: #8b5cf6;
  `}

  ${props => props.$status === 'completed' && `
    background: #10B981;
    border: 2px solid #10B981;
    color: white;
  `}

  ${props => props.$status === 'error' && `
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid #EF4444;
    color: #EF4444;
  `}

  svg {
    ${props => props.$status === 'active' && css`animation: ${spin} 1s linear infinite;`}
  }
`;

const StepLabel = styled.span<{ $status: 'pending' | 'active' | 'completed' | 'error' }>`
  font-size: 14px;
  color: ${props =>
    props.$status === 'completed' ? '#10B981' :
    props.$status === 'active' ? props.theme.colors.text.primary :
    props.$status === 'error' ? '#EF4444' :
    props.theme.colors.text.muted
  };
  font-weight: ${props => props.$status === 'active' ? '500' : '400'};
`;

// 2FA Phone Animation
const PhoneWaitingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
`;

const PhoneIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  margin-bottom: 16px;
  animation: ${phoneVibrate} 0.5s ease-in-out infinite;
`;

const PhoneText = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 8px 0;
  font-weight: 500;
`;

const PhoneSubtext = styled.p`
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

// ============================================
// COMPONENT
// ============================================

const BrowserIntegrations: React.FC = () => {
  const { currentProject } = useProject();

  // Realtime channel ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // State
  const [platforms, setPlatforms] = useState<BrowserPlatform[]>([]);
  const [logins, setLogins] = useState<BrowserLogin[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<string>('google');
  const [dynamicApiPort, setDynamicApiPort] = useState<number | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);

  // Load data
  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      loadLogins();
    }
  }, [currentProject?.id]);

  // ============================================
  // REALTIME SUBSCRIPTION - Auto-update UI when database changes
  // ============================================
  useEffect(() => {
    if (!currentProject?.id) return;

    // Cleanup previous channel if exists
    if (channelRef.current) {
      console.log('[Realtime] Removing previous channel');
      supabase.removeChannel(channelRef.current);
    }

    console.log('[Realtime] Setting up subscription for project:', currentProject.id);

    const channel = supabase
      .channel(`browser-logins-${currentProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'browser_logins',
          filter: `projeto_id=eq.${currentProject.id}`
        },
        (payload) => {
          console.log('[Realtime] Change detected:', payload.eventType, payload);

          const newRecord = payload.new as BrowserLogin;
          const oldRecord = payload.old as BrowserLogin;

          switch (payload.eventType) {
            case 'INSERT':
              setLogins(prev => {
                // Avoid duplicates
                if (prev.some(l => l.id === newRecord.id)) return prev;
                return [...prev, newRecord];
              });
              break;

            case 'UPDATE':
              setLogins(prev => prev.map(login =>
                login.id === newRecord.id ? newRecord : login
              ));
              // If login became connected, update status
              if (newRecord.is_connected && !oldRecord?.is_connected) {
                console.log('[Realtime] Login connected:', newRecord.platform_name);
                setLoginStatus('success');
                if (newRecord.platform_name === 'google') {
                  setStatusMessage('Connected to Google & YouTube!');
                  // Update steps if they exist
                  setAgentSteps(prev => prev.map(step => ({
                    ...step,
                    status: 'completed' as const
                  })));
                } else {
                  setStatusMessage(`${newRecord.platform_name} connected!`);
                }
              }
              break;

            case 'DELETE':
              setLogins(prev => prev.filter(login => login.id !== oldRecord?.id));
              break;
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to browser_logins');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error:', err);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or project change
    return () => {
      console.log('[Realtime] Cleanup - removing channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentProject?.id]);

  const loadPlatforms = async () => {
    console.log('[BrowserIntegrations] loadPlatforms called');
    const { data, error } = await supabase
      .from('browser_platforms')
      .select('*')
      .eq('is_active', true)
      .order('id');

    console.log('[BrowserIntegrations] loadPlatforms result:', { data, error });
    if (error) {
      console.error('[BrowserIntegrations] loadPlatforms error:', error);
    }
    if (data) {
      console.log('[BrowserIntegrations] Setting platforms:', data.length, 'items');
      setPlatforms(data);
    }
  };

  const loadLogins = async () => {
    if (!currentProject?.id) return;

    const { data } = await supabase
      .from('browser_logins')
      .select('*')
      .eq('projeto_id', currentProject.id)
      .eq('is_active', true);

    if (data) setLogins(data);
  };

  // Check if Google is connected
  const googleLogin = logins.find(l => l.platform_name === 'google' && l.is_connected);
  const youtubeLogin = logins.find(l => l.platform_name === 'youtube' && l.is_connected);
  const isGoogleConnected = !!googleLogin;
  const isYoutubeConnected = !!youtubeLogin;

  // Update step status
  const updateStep = (stepId: string, status: AgentStep['status']) => {
    setAgentSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status } : step
    ));
  };

  // Get container API port
  const checkContainerStatus = useCallback(async (): Promise<number | null> => {
    if (!currentProject?.id) return null;

    try {
      const headers: Record<string, string> = {};
      if (BROWSER_MCP_API_KEY) headers['X-API-Key'] = BROWSER_MCP_API_KEY;

      const response = await fetch(
        getOrchestratorUrl(`containers/${currentProject.id}`),
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const apiPort = data.mcpPort || data.apiPort || 0;
        setDynamicApiPort(apiPort);
        return apiPort;
      }
      return null;
    } catch (err) {
      console.error('[BrowserIntegrations] Container check error:', err);
      return null;
    }
  }, [currentProject?.id]);

  // Send task to agent
  const sendTask = async (task: string): Promise<string> => {
    const apiPort = await checkContainerStatus();
    if (!apiPort) throw new Error('Browser container not available');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (BROWSER_MCP_API_KEY) headers['X-API-Key'] = BROWSER_MCP_API_KEY;

    const url = getVpsUrl(apiPort, 'agent/task');
    console.log('[BrowserIntegrations] Sending task to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        task,
        projectId: currentProject?.id?.toString(),
        model: 'claude-sonnet-4-20250514',
        maxIterations: 50,
        verbose: false,
      }),
    });

    const result = await response.json();
    return result.result || result.output?.result || result.message || '';
  };

  // Replace template variables
  const fillPromptTemplate = (template: string, vars: Record<string, string>): string => {
    let filled = template;
    for (const [key, value] of Object.entries(vars)) {
      filled = filled.replace(new RegExp(`\{\{${key}\}\}`, 'g'), value);
    }
    return filled;
  };

  // Save YouTube login record
  const saveYoutubeLogin = async () => {
    if (!currentProject?.id || !googleLogin) return;

    await supabase
      .from('browser_logins')
      .upsert({
        projeto_id: currentProject.id,
        platform_name: 'youtube',
        login_email: googleLogin.login_email,
        uses_google_sso: true,
        google_login_id: googleLogin.id,
        is_connected: true,
        connected_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'projeto_id,platform_name,login_email',
      });
  };

  // Handle Google login - NEW: Uses SQL Function for background execution
  // Login continues even if user leaves the page!
  const handleGoogleLogin = async () => {
    if (!currentProject?.id || !email || !password) return;

    // Initialize steps for UI feedback
    setAgentSteps([
      { id: 'dispatch', label: 'Starting login in background...', status: 'active' },
      { id: 'agent', label: 'Browser agent executing login', status: 'pending' },
      { id: 'youtube', label: 'Connecting YouTube via SSO', status: 'pending' },
    ]);

    setLoginStatus('connecting');
    setStatusMessage('');

    try {
      console.log('[BrowserIntegrations] Calling browser_execute_login RPC...');

      // Call SQL Function (fire-and-forget) - returns immediately
      // The login continues in background via Edge Function -> Agent
      const { data, error } = await supabase.rpc('browser_execute_login', {
        p_project_id: currentProject.id,
        p_platform_name: 'google',
        p_email: email,
        p_password: password
      });

      console.log('[BrowserIntegrations] RPC result:', data, error);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to start login');
      }

      // Login dispatched to background - update UI
      updateStep('dispatch', 'completed');
      updateStep('agent', 'active');

      setStatusMessage('Login started in background. You can leave this page - UI will update automatically when complete.');

      // Note: The UI will automatically update via Realtime subscription
      // when browser_logins.is_connected changes to true
      // See useEffect with 'postgres_changes' subscription above

      console.log('[BrowserIntegrations] Login dispatched. Task ID:', data.task_id);

    } catch (error: any) {
      console.error('[BrowserIntegrations] Login error:', error);
      setAgentSteps(prev => prev.map(step =>
        step.id === 'dispatch' ? { ...step, status: 'error' as const } : step
      ));
      setLoginStatus('error');
      setStatusMessage(error.message || 'Connection failed');
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!currentProject?.id || !isGoogleConnected) return;

    setLoginStatus('disconnecting');
    setStatusMessage('Disconnecting...');

    try {
      console.log('[BrowserIntegrations] All platforms:', JSON.stringify(platforms, null, 2));
      const googlePlatform = platforms.find(p => p.platform_name === 'google');
      console.log('[BrowserIntegrations] Google platform found:', JSON.stringify(googlePlatform, null, 2));
      console.log('[BrowserIntegrations] logout_prompt exists:', !!googlePlatform?.logout_prompt);
      if (!googlePlatform?.logout_prompt) {
        throw new Error('Logout prompt not configured');
      }

      const result = await sendTask(googlePlatform.logout_prompt);
      console.log('[BrowserIntegrations] Logout result:', result);

      if (result.includes('LOGOUT_SUCCESS') || result.includes('SUCCESS') || result.includes('LOGGED_OUT')) {
        // Update Google as disconnected
        await supabase
          .from('browser_logins')
          .update({
            is_connected: false,
            connected_at: null,
          })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', 'google')
          .eq('is_active', true);

        // Also disconnect YouTube
        await supabase
          .from('browser_logins')
          .update({
            is_connected: false,
            connected_at: null,
          })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', 'youtube')
          .eq('is_active', true);

        setLoginStatus('idle');
        setStatusMessage('');
        setEmail('');
        setPassword('');
        setAgentSteps([]);
        await loadLogins();
      } else {
        setLoginStatus('error');
        setStatusMessage('Failed to disconnect. Please try again.');
      }
    } catch (error: any) {
      console.error('[BrowserIntegrations] Disconnect error:', error);
      setLoginStatus('error');
      setStatusMessage(error.message || 'Disconnect failed');
    }
  };

  // Update login status in database
  const updateLoginStatus = async (platformName: string, connected: boolean, error?: string) => {
    if (!currentProject?.id) return;

    await supabase
      .from('browser_logins')
      .update({
        is_connected: connected,
        connected_at: connected ? new Date().toISOString() : null,
        last_error: error || null,
        last_error_at: error ? new Date().toISOString() : null,
        consecutive_failures: connected ? 0 : undefined,
      })
      .eq('projeto_id', currentProject.id)
      .eq('platform_name', platformName)
      .eq('is_active', true);
  };

  // Poll for 2FA completion
  const startPolling2FA = () => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes

    const poll = async () => {
      if (loginStatus !== '2fa_phone') return;

      try {
        const googlePlatform = platforms.find(p => p.platform_name === 'google');
        if (!googlePlatform?.twofa_phone_prompt) return;

        const result = await sendTask(googlePlatform.twofa_phone_prompt);

        if (result.includes('LOGIN_SUCCESS') || result.includes('GOOGLE:SUCCESS')) {
          updateStep('login', 'completed');
          updateStep('youtube', 'active');
          await updateLoginStatus('google', true);
          await saveYoutubeLogin();
          updateStep('youtube', 'completed');
          setLoginStatus('success');
          setStatusMessage('Connected to Google & YouTube!');
          await loadLogins();
          return;
        } else if (result.includes('DENIED')) {
          updateStep('login', 'error');
          setLoginStatus('error');
          setStatusMessage('Login request was denied on your phone');
          return;
        }

        // Still waiting
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          updateStep('login', 'error');
          setLoginStatus('error');
          setStatusMessage('2FA timeout. Please try again.');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    setTimeout(poll, 5000);
  };

  // Submit 2FA code
  const handleSubmit2FACode = async () => {
    if (!twoFACode || twoFACode.length !== 6) return;

    setLoginStatus('connecting');
    setStatusMessage('Verifying code...');

    try {
      const googlePlatform = platforms.find(p => p.platform_name === 'google');
      if (!googlePlatform?.twofa_code_prompt) return;

      const prompt = fillPromptTemplate(googlePlatform.twofa_code_prompt, {
        code: twoFACode,
      });

      const result = await sendTask(prompt);

      if (result.includes('LOGIN_SUCCESS') || result.includes('GOOGLE:SUCCESS')) {
        updateStep('login', 'completed');
        updateStep('youtube', 'active');
        await updateLoginStatus('google', true);
        await saveYoutubeLogin();
        updateStep('youtube', 'completed');
        setLoginStatus('success');
        setStatusMessage('Connected to Google & YouTube!');
      } else if (result.includes('INVALID_CODE')) {
        setLoginStatus('2fa_code');
        setStatusMessage('Invalid code. Please try again.');
      } else {
        updateStep('login', 'error');
        setLoginStatus('error');
        setStatusMessage('Verification failed');
      }

      await loadLogins();
    } catch (error: any) {
      setLoginStatus('error');
      setStatusMessage(error.message || 'Verification failed');
    }

    setTwoFACode('');
  };

  // Connect other platforms using Google SSO
  const handleConnectPlatforms = async () => {
    if (selectedPlatforms.length === 0) return;

    for (const platformName of selectedPlatforms) {
      setCurrentPlatform(platformName);
      setLoginStatus('connecting');
      setStatusMessage(`Connecting to ${platformName}...`);

      try {
        const platform = platforms.find(p => p.platform_name === platformName);
        if (!platform) continue;

        // Save login record
        await supabase
          .from('browser_logins')
          .upsert({
            projeto_id: currentProject?.id,
            platform_name: platformName,
            login_email: googleLogin?.login_email,
            uses_google_sso: true,
            google_login_id: googleLogin?.id,
            is_connected: false,
            is_active: true,
          }, {
            onConflict: 'projeto_id,platform_name,login_email',
          });

        // Check if already logged in
        if (platform.check_logged_prompt) {
          const checkResult = await sendTask(platform.check_logged_prompt);
          if (checkResult.includes('ALREADY_LOGGED')) {
            await updateLoginStatus(platformName, true);
            continue;
          }
        }

        // Execute login
        const result = await sendTask(platform.login_prompt);

        if (result.includes('LOGIN_SUCCESS') || result.includes('ALREADY_LOGGED')) {
          await updateLoginStatus(platformName, true);
        } else if (result.includes('GOOGLE_LOGIN_REQUIRED')) {
          await updateLoginStatus(platformName, false, 'Google session expired');
        } else {
          const errorMsg = result.split('ERROR:')[1]?.trim() || 'Connection failed';
          await updateLoginStatus(platformName, false, errorMsg);
        }
      } catch (error: any) {
        await updateLoginStatus(platformName, false, error.message);
      }
    }

    setLoginStatus('success');
    setStatusMessage('Platforms connected!');
    setSelectedPlatforms([]);
    await loadLogins();
  };

  // Toggle platform selection
  const togglePlatform = (name: string) => {
    const login = logins.find(l => l.platform_name === name);
    if (login?.is_connected) return; // Already connected

    setSelectedPlatforms(prev =>
      prev.includes(name)
        ? prev.filter(p => p !== name)
        : [...prev, name]
    );
  };

  // Render icon
  const renderIcon = (iconName: string) => {
    const IconComponent = ICONS[iconName];
    return IconComponent ? <IconComponent /> : <FaPlug />;
  };

  // Filter platforms that support Google SSO (excluding Google and YouTube)
  const ssoPlatforms = platforms.filter(p =>
    p.supports_google_sso &&
    p.platform_name !== 'google' &&
    p.platform_name !== 'youtube'
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <FaPlug size={28} />
          Browser Integrations
        </PageTitle>
        <PageDescription>
          Connect your accounts for automated actions via browser
        </PageDescription>
      </PageHeader>

      {/* Step 1: Google Login */}
      <StepCard $active={!isGoogleConnected} $completed={isGoogleConnected}>
        <StepHeader>
          <StepNumber $completed={isGoogleConnected}>
            {isGoogleConnected ? <FaCheck size={16} /> : '1'}
          </StepNumber>
          <StepTitle>Google Account</StepTitle>
          {isGoogleConnected && (
            <ConnectedBadge>
              <FaCheck /> Connected
            </ConnectedBadge>
          )}
        </StepHeader>

        <StepContent>
          {isGoogleConnected ? (
            <>
              {/* Connected State */}
              <PlatformList>
                <PlatformItem $connected={true}>
                  <PlatformIcon $color="#EA4335">
                    <FaGoogle />
                  </PlatformIcon>
                  <PlatformInfo>
                    <PlatformName>Google</PlatformName>
                    <PlatformStatus $connected={true}>
                      <FaCheck size={10} /> {googleLogin?.login_email}
                    </PlatformStatus>
                  </PlatformInfo>
                </PlatformItem>

                <PlatformItem $connected={isYoutubeConnected}>
                  <PlatformIcon $color="#FF0000">
                    <FaYoutube />
                  </PlatformIcon>
                  <PlatformInfo>
                    <PlatformName>YouTube</PlatformName>
                    <PlatformStatus $connected={isYoutubeConnected}>
                      {isYoutubeConnected ? (
                        <>
                          <FaCheck size={10} /> Connected via Google SSO
                        </>
                      ) : (
                        'Will connect automatically'
                      )}
                    </PlatformStatus>
                  </PlatformInfo>
                </PlatformItem>
              </PlatformList>

              <DisconnectButton
                onClick={handleDisconnect}
                disabled={loginStatus === 'disconnecting'}
                $loading={loginStatus === 'disconnecting'}
                style={{ marginTop: '20px' }}
              >
                {loginStatus === 'disconnecting' ? (
                  <>
                    <FaSpinner /> Disconnecting...
                  </>
                ) : (
                  <>
                    <FaSignOutAlt /> Disconnect Account
                  </>
                )}
              </DisconnectButton>
            </>
          ) : (
            <>
              {/* Login Form */}
              {loginStatus !== '2fa_phone' && loginStatus !== '2fa_code' && (
                <>
                  <FormGroup>
                    <FormLabel>
                      <FaEnvelope style={{ marginRight: 6 }} />
                      Google Email
                    </FormLabel>
                    <FormInput
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loginStatus === 'connecting'}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      <FaLock style={{ marginRight: 6 }} />
                      Password
                    </FormLabel>
                    <InputWrapper>
                      <FormInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loginStatus === 'connecting'}
                      />
                      <PasswordToggle
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </PasswordToggle>
                    </InputWrapper>
                  </FormGroup>

                  {/* Agent Steps Progress */}
                  {agentSteps.length > 0 && loginStatus === 'connecting' && (
                    <AgentStepsContainer>
                      {agentSteps.map(step => (
                        <AgentStepItem key={step.id} $status={step.status}>
                          <StepIndicator $status={step.status}>
                            {step.status === 'completed' ? <FaCheck size={12} /> :
                             step.status === 'active' ? <FaSpinner size={12} /> :
                             step.status === 'error' ? <FaTimes size={12} /> :
                             null}
                          </StepIndicator>
                          <StepLabel $status={step.status}>{step.label}</StepLabel>
                        </AgentStepItem>
                      ))}
                    </AgentStepsContainer>
                  )}

                  <PrimaryButton
                    onClick={handleGoogleLogin}
                    disabled={!email || !password || loginStatus === 'connecting'}
                    $loading={loginStatus === 'connecting'}
                  >
                    {loginStatus === 'connecting' ? (
                      <>
                        <FaSpinner /> Connecting...
                      </>
                    ) : (
                      <>
                        <FaGoogle /> Connect Google Account
                      </>
                    )}
                  </PrimaryButton>
                </>
              )}

              {/* 2FA Phone Waiting */}
              {loginStatus === '2fa_phone' && (
                <PhoneWaitingContainer>
                  <PhoneIcon>
                    <FaMobileAlt />
                  </PhoneIcon>
                  <PhoneText>Approve login on your phone</PhoneText>
                  <PhoneSubtext>
                    Open the Google app on your phone and tap Yes to approve
                  </PhoneSubtext>
                  <StatusMessage $type="info" style={{ marginTop: 20 }}>
                    <FaSpinner className="spin" />
                    Waiting for approval... This may take up to 2 minutes
                  </StatusMessage>
                </PhoneWaitingContainer>
              )}

              {/* 2FA Code Input */}
              {loginStatus === '2fa_code' && (
                <div style={{ textAlign: 'center' }}>
                  <PhoneText>Enter verification code</PhoneText>
                  <PhoneSubtext>
                    Check your email or phone for the 6-digit code
                  </PhoneSubtext>
                  <TwoFAInput
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  />
                  <PrimaryButton
                    onClick={handleSubmit2FACode}
                    disabled={twoFACode.length !== 6}
                    style={{ maxWidth: 200, margin: '0 auto' }}
                  >
                    Verify Code
                  </PrimaryButton>
                </div>
              )}
            </>
          )}

          {/* Status Messages */}
          {statusMessage && loginStatus !== 'connecting' && loginStatus !== '2fa_phone' && (
            <StatusMessage
              $type={
                loginStatus === 'success' ? 'success' :
                loginStatus === 'error' ? 'error' :
                'info'
              }
            >
              {loginStatus === 'success' ? <FaCheck /> :
               loginStatus === 'error' ? <FaTimes /> :
               <FaSpinner />}
              {statusMessage}
            </StatusMessage>
          )}
        </StepContent>
      </StepCard>

      {/* Step 2: Other Platforms */}
      <StepCard $active={isGoogleConnected} $completed={false}>
        <StepHeader>
          <StepNumber $completed={false}>2</StepNumber>
          <StepTitle>Other Platforms</StepTitle>
        </StepHeader>

        <StepContent>
          {!isGoogleConnected ? (
            <StatusMessage $type="info">
              <FaLock />
              Connect your Google account first to enable other platforms
            </StatusMessage>
          ) : ssoPlatforms.length === 0 ? (
            <StatusMessage $type="info">
              <FaCheck />
              No additional platforms available yet
            </StatusMessage>
          ) : (
            <>
              <PlatformList>
                {ssoPlatforms.map(platform => {
                  const login = logins.find(l => l.platform_name === platform.platform_name);
                  const isConnected = login?.is_connected || false;
                  const isSelected = selectedPlatforms.includes(platform.platform_name);

                  return (
                    <PlatformItem
                      key={platform.id}
                      $connected={isConnected}
                      onClick={() => !isConnected && togglePlatform(platform.platform_name)}
                    >
                      <PlatformIcon $color={platform.brand_color}>
                        {renderIcon(platform.icon_name)}
                      </PlatformIcon>
                      <PlatformInfo>
                        <PlatformName>{platform.display_name}</PlatformName>
                        <PlatformStatus $connected={isConnected}>
                          {isConnected ? (
                            <>
                              <FaCheck size={10} /> Connected via Google SSO
                            </>
                          ) : login?.last_error ? (
                            <>
                              <FaTimes size={10} /> {login.last_error}
                            </>
                          ) : (
                            'Click to select'
                          )}
                        </PlatformStatus>
                      </PlatformInfo>
                      {!isConnected && (
                        <Checkbox
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlatform(platform.platform_name)}
                        />
                      )}
                    </PlatformItem>
                  );
                })}
              </PlatformList>

              {selectedPlatforms.length > 0 && (
                <PrimaryButton
                  onClick={handleConnectPlatforms}
                  disabled={loginStatus === 'connecting'}
                  $loading={loginStatus === 'connecting'}
                  style={{ marginTop: 20 }}
                >
                  {loginStatus === 'connecting' ? (
                    <>
                      <FaSpinner /> Connecting {currentPlatform}...
                    </>
                  ) : (
                    <>
                      <FaPlug /> Connect {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
                    </>
                  )}
                </PrimaryButton>
              )}
            </>
          )}
        </StepContent>
      </StepCard>
    </PageContainer>
  );
};

export default BrowserIntegrations;
