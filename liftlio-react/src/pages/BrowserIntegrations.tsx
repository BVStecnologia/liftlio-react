import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
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
  FaMobileAlt as FaMobileAltBase,
  FaRobot as FaRobotBase,
  FaPaperPlane as FaPaperPlaneBase,
  FaArrowRight as FaArrowRightBase
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
const FaMobileAlt: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaMobileAltBase as any, props);
const FaRobot: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaRobotBase as any, props);
const FaPaperPlane: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaPaperPlaneBase as any, props);
const FaArrowRight: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = (props) => React.createElement(FaArrowRightBase as any, props);

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

// Chat Types
interface ChatMessage {
  id: string;
  sender: 'agent' | 'user' | 'system';
  text: string;
  timestamp: Date;
  type?: 'text' | 'input_email' | 'input_password' | 'input_code' | 'phone_wait' | 'buttons' | 'success' | 'error' | 'platform_list' | 'loading';
  buttons?: { label: string; action: string; primary?: boolean }[];
  platformIcon?: string;
}

type ChatState =
  | 'greeting'
  | 'asking_email'
  | 'asking_password'
  | 'connecting'
  | 'waiting_2fa_phone'
  | 'waiting_2fa_code'
  | 'verifying'
  | 'verifying_2fa'
  | 'platform_success'
  | 'asking_next_platform'
  | 'connecting_sso_platform'
  | 'all_done'
  | 'error';

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

const fadeInScale = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
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

const typingDots = keyframes`
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.2; }
`;

// ============================================
// STYLED COMPONENTS - CHAT UI
// ============================================

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  max-width: 700px;
  margin: 0 auto;
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border.primary};
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
`;

const AgentAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const AgentInfo = styled.div`
  flex: 1;
`;

const AgentName = styled.div`
  font-size: 18px;
  font-weight: 600;
`;

const AgentStatus = styled.div`
  font-size: 13px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const OnlineIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border.primary};
    border-radius: 3px;
  }
`;

const MessageRow = styled.div<{ $sender: 'agent' | 'user' | 'system' }>`
  display: flex;
  justify-content: ${props => props.$sender === 'user' ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const MessageBubble = styled.div<{ $sender: 'agent' | 'user' | 'system' }>`
  max-width: 80%;
  padding: 14px 18px;
  border-radius: ${props =>
    props.$sender === 'user' ? '18px 18px 4px 18px' :
    props.$sender === 'agent' ? '18px 18px 18px 4px' :
    '12px'};
  background: ${props =>
    props.$sender === 'user' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
    props.$sender === 'agent' ? props.theme.colors.bg.tertiary :
    'rgba(139, 92, 246, 0.1)'};
  color: ${props =>
    props.$sender === 'user' ? 'white' :
    props.theme.colors.text.primary};
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  ${props => props.$sender === 'system' && `
    border: 1px solid rgba(139, 92, 246, 0.3);
    text-align: center;
    font-size: 13px;
  `}
`;

const MessageTime = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text.muted};
  margin-top: 4px;
  text-align: right;
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 18px;
  background: ${props => props.theme.colors.bg.tertiary};
  border-radius: 18px 18px 18px 4px;
  width: fit-content;

  span {
    width: 8px;
    height: 8px;
    background: ${props => props.theme.colors.text.muted};
    border-radius: 50%;
    animation: ${typingDots} 1.4s infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const InputArea = styled.div`
  padding: 16px 20px;
  background: ${props => props.theme.colors.bg.primary};
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ChatInput = styled.input<{ $type?: string }>`
  flex: 1;
  padding: 14px 18px;
  background: ${props => props.theme.colors.bg.tertiary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 24px;
  font-size: 15px;
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.2s ease;

  ${props => props.$type === 'code' && `
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 6px;
    max-width: 200px;
  `}

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const PasswordToggleBtn = styled.button`
  position: absolute;
  right: 70px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.muted};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const SendButton = styled.button<{ $disabled?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.$disabled
    ? props.theme.colors.bg.tertiary
    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'};
  color: ${props => props.$disabled ? props.theme.colors.text.muted : 'white'};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  font-size: 18px;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
  }

  svg {
    animation: ${props => props.$disabled ? 'none' : 'none'};
  }
`;

// Chat Buttons
const ButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border: none;
    box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }
  ` : `
    background: transparent;
    color: ${props.theme.colors.text.primary};
    border: 1px solid ${props.theme.colors.border.primary};

    &:hover {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.05);
    }
  `}
`;

// Phone Wait Animation
const PhoneWaitContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
`;

const PhoneIcon = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 18px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  margin-bottom: 14px;
  animation: ${phoneVibrate} 0.5s ease-in-out infinite;
`;

// Platform Progress
const PlatformProgress = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const PlatformChip = styled.div<{ $connected: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.$connected
    ? 'rgba(16, 185, 129, 0.9)'
    : 'rgba(0, 0, 0, 0.4)'};
  color: ${props => props.$connected
    ? '#ffffff'
    : '#ffffff'};
  border: 2px solid ${props => props.$connected
    ? '#10B981'
    : props.$color};
  box-shadow: ${props => props.$connected
    ? '0 0 8px rgba(16, 185, 129, 0.5)'
    : `0 0 6px ${props.$color}40`};
  transition: all 0.2s ease;

  svg {
    font-size: 16px;
    color: ${props => props.$connected ? '#ffffff' : props.$color};
    filter: ${props => props.$connected ? 'none' : 'brightness(1.3)'};
  }
`;

// Success Animation
const SuccessContainer = styled.div`
  text-align: center;
  padding: 30px;
  animation: ${fadeInScale} 0.4s ease-out;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  margin: 0 auto 16px;
`;

const LoadingSpinner = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

// ============================================
// COMPONENT
// ============================================

const BrowserIntegrations: React.FC = () => {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Realtime channel ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Original State (keeping all existing logic)
  const [platforms, setPlatforms] = useState<BrowserPlatform[]>([]);
  const [logins, setLogins] = useState<BrowserLogin[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [dynamicApiPort, setDynamicApiPort] = useState<number | null>(null);

  // Chat State (NEW)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatState, setChatState] = useState<ChatState>('greeting');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPlatformIndex, setCurrentPlatformIndex] = useState(0);
  const [currentSSOPlatform, setCurrentSSOPlatform] = useState<string | null>(null);

  // Helper: Generate unique ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Helper: Add message to chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Helper: Simulate agent typing
  const agentTyping = useCallback(async (text: string, options?: Partial<ChatMessage>) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    setIsTyping(false);
    addMessage({ sender: 'agent', text, ...options });
  }, [addMessage]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load data
  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      loadLogins();
    }
  }, [currentProject?.id]);

  // Initialize chat with greeting
  useEffect(() => {
    if (platforms.length > 0 && messages.length === 0) {
      initializeChat();
    }
  }, [platforms]);

  const initializeChat = async () => {
    const activePlatforms = platforms.filter(p => p.is_active);
    const ssoPlatforms = activePlatforms.filter(p => p.supports_google_sso && p.platform_name !== 'google' && p.platform_name !== 'youtube');

    // Check if Google is already connected
    const googleLogin = logins.find(l => l.platform_name === 'google' && l.is_connected);

    if (googleLogin) {
      // Google is connected - check for other pending platforms
      const connectedPlatformNames = logins.filter(l => l.is_connected).map(l => l.platform_name);
      const pendingPlatforms = ssoPlatforms.filter(p => !connectedPlatformNames.includes(p.platform_name));

      if (pendingPlatforms.length === 0) {
        // All platforms connected!
        await agentTyping(
          `All your platforms are connected! Your data is being monitored.`,
          { type: 'success' }
        );
        await agentTyping(
          `You can go to the dashboard to see your analytics.`,
          {
            type: 'buttons',
            buttons: [
              { label: 'Go to Dashboard', action: 'go_dashboard', primary: true }
            ]
          }
        );
        setChatState('all_done');
        return;
      } else {
        // Google connected but other platforms pending
        await agentTyping(
          `Welcome back! Google and YouTube are already connected.`
        );
        await agentTyping(
          `You have ${pendingPlatforms.length} more platform${pendingPlatforms.length > 1 ? 's' : ''} to connect: ${pendingPlatforms.map(p => p.display_name).join(', ')}.`,
          { type: 'platform_list' }
        );
        await checkNextPlatform();
        return;
      }
    }

    // No Google connection - start fresh flow
    await agentTyping(
      `Hi! I'm the Liftlio assistant. I'll help you connect your accounts so we can start monitoring your videos.`
    );

    await new Promise(resolve => setTimeout(resolve, 300));

    const platformNames = ['Google/YouTube', ...ssoPlatforms.map(p => p.display_name)];
    await agentTyping(
      `I found ${platformNames.length} platform${platformNames.length > 1 ? 's' : ''} available: ${platformNames.join(', ')}.`,
      { type: 'platform_list' }
    );

    await new Promise(resolve => setTimeout(resolve, 300));

    await agentTyping(
      `Let's start with Google? It's the main account that connects all others.`,
      {
        type: 'buttons',
        buttons: [
          { label: "Let's go!", action: 'start_google', primary: true }
        ]
      }
    );

    setChatState('greeting');
  };

  // ============================================
  // REALTIME SUBSCRIPTION - Auto-update UI when database changes
  // ============================================
  useEffect(() => {
    if (!currentProject?.id) return;

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
                if (prev.some(l => l.id === newRecord.id)) return prev;
                return [...prev, newRecord];
              });
              break;

            case 'UPDATE':
              setLogins(prev => prev.map(login =>
                login.id === newRecord.id ? newRecord : login
              ));

              // Handle state transitions via chat
              if (newRecord.is_connected && !oldRecord?.is_connected) {
                handleLoginSuccess(newRecord.platform_name);
              }
              else if (newRecord.has_2fa && !oldRecord?.has_2fa) {
                handle2FADetected(newRecord.twofa_type || 'code');
              }
              else if (newRecord.last_error && !oldRecord?.last_error) {
                handleLoginError(newRecord.last_error);
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
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentProject?.id]);

  // Chat Event Handlers (triggered by Realtime)
  const handleLoginSuccess = async (platformName: string) => {
    setChatState('platform_success');

    if (platformName === 'google') {
      await agentTyping('Perfect! Google connected successfully!', { type: 'success' });
      await agentTyping('YouTube was also linked automatically via SSO.');

      // Check for more platforms
      const ssoPlatforms = platforms.filter(p =>
        p.supports_google_sso &&
        p.platform_name !== 'google' &&
        p.platform_name !== 'youtube' &&
        p.is_active
      );

      if (ssoPlatforms.length > 0) {
        await agentTyping(
          `Great! We have ${ssoPlatforms.length} more platform${ssoPlatforms.length > 1 ? 's' : ''} to connect. Want to continue?`,
          {
            type: 'buttons',
            buttons: [
              { label: 'Yes, continue', action: 'next_platform', primary: true },
              { label: 'Later', action: 'skip_platforms' }
            ]
          }
        );
        setChatState('asking_next_platform');
      } else {
        await showCompletionMessage();
      }
    } else {
      await agentTyping(`${platformName} connected successfully!`, { type: 'success' });
      await checkNextPlatform(platformName);
    }
  };

  const handle2FADetected = async (type: string) => {
    if (type === 'phone') {
      setChatState('waiting_2fa_phone');
      await agentTyping(
        'Google sent a notification to your phone. Please approve the access!',
        { type: 'phone_wait' }
      );
      await agentTyping(
        'Click the button below when approved:',
        {
          type: 'buttons',
          buttons: [
            { label: 'I approved', action: 'verify_2fa', primary: true }
          ]
        }
      );
    } else {
      setChatState('waiting_2fa_code');
      const codeType = type === 'sms' ? 'SMS' : type === 'authenticator' ? 'authenticator' : 'verification';
      await agentTyping(
        `Google needs additional verification. Enter your ${codeType} code:`
      );
    }
  };

  const handleLoginError = async (error: string) => {
    setChatState('error');
    await agentTyping(
      `Oops! There was a problem: ${error}`,
      { type: 'error' }
    );
    await agentTyping(
      'Want to try again?',
      {
        type: 'buttons',
        buttons: [
          { label: 'Try again', action: 'retry', primary: true },
          { label: 'Cancel', action: 'cancel' }
        ]
      }
    );
  };

  const checkNextPlatform = async (justConnected?: string) => {
    const ssoPlatforms = platforms.filter(p =>
      p.supports_google_sso &&
      p.platform_name !== 'google' &&
      p.platform_name !== 'youtube' &&
      p.is_active
    );

    // Include justConnected in the connected list (state might be stale)
    const connectedPlatforms = logins.filter(l => l.is_connected).map(l => l.platform_name);
    if (justConnected && !connectedPlatforms.includes(justConnected)) {
      connectedPlatforms.push(justConnected);
    }
    const pendingPlatforms = ssoPlatforms.filter(p => !connectedPlatforms.includes(p.platform_name));

    if (pendingPlatforms.length > 0) {
      const next = pendingPlatforms[0];
      await agentTyping(
        `Next: ${next.display_name}. Connect now?`,
        {
          type: 'buttons',
          buttons: [
            { label: 'Yes, connect', action: `connect_${next.platform_name}`, primary: true },
            { label: 'Skip', action: 'skip_platform' }
          ]
        }
      );
      setChatState('asking_next_platform');
    } else {
      await showCompletionMessage();
    }
  };

  const showCompletionMessage = async () => {
    setChatState('all_done');
    await agentTyping(
      'All platforms have been connected successfully!',
      { type: 'success' }
    );
    await agentTyping(
      'Your data will start appearing on the dashboard in a few minutes.',
      {
        type: 'buttons',
        buttons: [
          { label: 'Go to Dashboard', action: 'go_dashboard', primary: true }
        ]
      }
    );
  };

  // ============================================
  // ORIGINAL LOGIC (unchanged from existing file)
  // ============================================

  const loadPlatforms = async () => {
    const { data, error } = await supabase
      .from('browser_platforms')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (data) {
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

    if (data) {
      setLogins(data);

      // Check existing state
      const googleLogin = data.find(l => l.platform_name === 'google');
      if (googleLogin?.is_connected) {
        // Already connected - skip to asking for next platforms or completion
        setChatState('platform_success');
      } else if (googleLogin?.has_2fa && !googleLogin.is_connected) {
        handle2FADetected(googleLogin.twofa_type || 'code');
      }
    }
  };

  // Check if Google is connected
  const googleLogin = logins.find(l => l.platform_name === 'google' && l.is_connected);
  const isGoogleConnected = !!googleLogin;

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

  // Handle Google login via RPC
  const handleGoogleLogin = async () => {
    if (!currentProject?.id || !email || !password) return;

    setChatState('connecting');
    addMessage({ sender: 'user', text: '••••••••' }); // Masked password
    await agentTyping('Starting connection... Please wait.', { type: 'loading' });

    try {
      const { data, error } = await supabase.rpc('browser_execute_login', {
        p_project_id: currentProject.id,
        p_platform_name: 'google',
        p_email: email,
        p_password: password
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to start login');

      await agentTyping('Login started in the background. The browser is logging in now...');

    } catch (error: any) {
      handleLoginError(error.message);
    }
  };

  // Verify 2FA phone approval
  const handleVerifyLogin = async () => {
    if (!currentProject?.id) return;

    setChatState('verifying');
    addMessage({ sender: 'user', text: 'I approved on my phone' });
    await agentTyping('Verifying...', { type: 'loading' });

    try {
      const { data, error } = await supabase.rpc('browser_verify_login', {
        p_project_id: currentProject.id,
        p_platform_name: 'google'
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Verification failed');

      // UI will update via Realtime
    } catch (error: any) {
      handleLoginError(error.message);
    }
  };

  // Submit 2FA code
  const handleSubmitCode = async (code: string) => {
    if (!currentProject?.id || !code.trim()) return;

    setChatState('verifying');
    addMessage({ sender: 'user', text: code });
    await agentTyping('Verifying code...', { type: 'loading' });

    try {
      const { data, error } = await supabase.rpc('browser_submit_2fa_code', {
        p_project_id: currentProject.id,
        p_platform_name: 'google',
        p_code: code.trim()
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Code submission failed');

      setTwoFACode('');
      // UI will update via Realtime
    } catch (error: any) {
      handleLoginError(error.message);
    }
  };

  // Connect SSO platform
  const handleConnectSSOPlatform = async (platformName: string) => {
    if (!currentProject?.id || !googleLogin) return;

    setChatState('connecting_sso_platform');
    await agentTyping(`Connecting ${platformName}...`, { type: 'loading' });

    try {
      const platform = platforms.find(p => p.platform_name === platformName);
      if (!platform) throw new Error('Platform not found');

      // Save login record
      await supabase
        .from('browser_logins')
        .upsert({
          projeto_id: currentProject.id,
          platform_name: platformName,
          login_email: googleLogin.login_email,
          uses_google_sso: true,
          google_login_id: googleLogin.id,
          is_connected: false,
          is_active: true,
        }, {
          onConflict: 'projeto_id,platform_name,login_email',
        });

      // Execute login
      setCurrentSSOPlatform(platformName);
      const result = await sendTask(platform.login_prompt);

      // Detect 2FA type from agent response
      const lowerResult = result.toLowerCase();

      // Check for number matching 2FA (e.g., "tap 42", "toque em 42", "number 42")
      const numberMatch = result.match(/(?:tap|toque|número|number|digite|enter|select|escolha)\s*(?:em|on|o)?\s*(\d{1,3})/i);
      const matchingNumber = numberMatch ? numberMatch[1] : null;

      // Check for code entry 2FA (SMS, authenticator)
      const needsCode = lowerResult.includes('enter code') ||
        lowerResult.includes('digite o código') ||
        lowerResult.includes('verification code') ||
        lowerResult.includes('código de verificação') ||
        lowerResult.includes('sms code') ||
        lowerResult.includes('authenticator') ||
        lowerResult.includes('6-digit') ||
        lowerResult.includes('6 digit');

      // Check for phone approval 2FA (tap yes, approve)
      const needsPhoneApproval = lowerResult.includes('2fa') ||
        lowerResult.includes('verificação') ||
        lowerResult.includes('verification') ||
        lowerResult.includes('approve') ||
        lowerResult.includes('notification') ||
        lowerResult.includes('notificação') ||
        lowerResult.includes('confirm') ||
        lowerResult.includes('two-step') ||
        lowerResult.includes('tap yes') ||
        lowerResult.includes('toque sim');

      if (result.includes('LOGIN_SUCCESS') || result.includes('ALREADY_LOGGED')) {
        await supabase
          .from('browser_logins')
          .update({
            is_connected: true,
            connected_at: new Date().toISOString(),
          })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', platformName)
          .eq('is_active', true);

        setCurrentSSOPlatform(null);
        handleLoginSuccess(platformName);
      } else if (matchingNumber) {
        // Number matching 2FA - show the number to tap
        await supabase
          .from('browser_logins')
          .update({ has_2fa: true })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', platformName)
          .eq('is_active', true);

        setChatState('waiting_2fa_phone');
        await agentTyping(`Google is asking for verification. On your phone, tap the number **${matchingNumber}**`, { type: 'phone_wait' });
        await agentTyping('Click below after tapping the number:', {
          type: 'buttons',
          buttons: [{ label: `I tapped ${matchingNumber}`, action: 'verify_sso_2fa', primary: true }]
        });
      } else if (needsCode) {
        // Code entry 2FA - show code input
        await supabase
          .from('browser_logins')
          .update({ has_2fa: true, twofa_type: 'code' })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', platformName)
          .eq('is_active', true);

        setChatState('waiting_2fa_code');
        await agentTyping('Google is asking for a verification code. Please enter the code from your SMS or Authenticator app:');
      } else if (needsPhoneApproval) {
        // Phone tap 2FA - just approve
        await supabase
          .from('browser_logins')
          .update({ has_2fa: true })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', platformName)
          .eq('is_active', true);

        setChatState('waiting_2fa_phone');
        await agentTyping(`Google sent a security notification to your phone. Tap "Yes" to approve the sign-in for ${platformName}.`, { type: 'phone_wait' });
        await agentTyping('Click below when you have approved:', {
          type: 'buttons',
          buttons: [{ label: 'I approved on my phone', action: 'verify_sso_2fa', primary: true }]
        });
      } else {
        setCurrentSSOPlatform(null);
        throw new Error(result || 'Connection failed');
      }
    } catch (error: any) {
      handleLoginError(error.message);
    }
  };

  // Verify SSO 2FA (after user approves on phone)
  const handleVerifySSOLogin = async () => {
    if (!currentProject?.id || !currentSSOPlatform) return;

    setChatState('verifying_2fa');
    await agentTyping('Checking if you approved...', { type: 'loading' });

    try {
      const platform = platforms.find(p => p.platform_name === currentSSOPlatform);
      if (!platform) throw new Error('Platform not found');

      // Re-execute login to continue after 2FA approval
      const result = await sendTask(platform.login_prompt);

      if (result.includes('LOGIN_SUCCESS') || result.includes('ALREADY_LOGGED')) {
        await supabase
          .from('browser_logins')
          .update({
            is_connected: true,
            connected_at: new Date().toISOString(),
          })
          .eq('projeto_id', currentProject.id)
          .eq('platform_name', currentSSOPlatform)
          .eq('is_active', true);

        const platformName = currentSSOPlatform;
        setCurrentSSOPlatform(null);
        handleLoginSuccess(platformName);
      } else {
        // Still waiting or failed
        await agentTyping("It seems the approval wasn't completed yet. Please check your phone and approve the Google notification.", { type: 'phone_wait' });
        await agentTyping('Click below when done:', {
          type: 'buttons',
          buttons: [{ label: 'I approved on my phone', action: 'verify_sso_2fa', primary: true }]
        });
      }
    } catch (error: any) {
      setCurrentSSOPlatform(null);
      handleLoginError(error.message);
    }
  };

  // Handle button clicks from chat
  const handleButtonAction = async (action: string) => {
    switch (action) {
      case 'start_google':
        setChatState('asking_email');
        await agentTyping('What is your Google account email?');
        break;

      case 'verify_2fa':
        handleVerifyLogin();
        break;

      case 'verify_sso_2fa':
        handleVerifySSOLogin();
        break;

      case 'next_platform':
        await checkNextPlatform();
        break;

      case 'skip_platform':
      case 'skip_platforms':
        await showCompletionMessage();
        break;

      case 'retry':
        setChatState('asking_email');
        setEmail('');
        setPassword('');
        await agentTyping("Ok, let's try again. What is your Google account email?");
        break;

      case 'cancel':
        navigate('/dashboard');
        break;

      case 'go_dashboard':
        navigate('/dashboard');
        break;

      default:
        if (action.startsWith('connect_')) {
          const platformName = action.replace('connect_', '');
          handleConnectSSOPlatform(platformName);
        }
    }
  };

  // Handle input submission
  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const value = inputValue.trim();
    setInputValue('');

    switch (chatState) {
      case 'asking_email':
        setEmail(value);
        addMessage({ sender: 'user', text: value });
        setChatState('asking_password');
        await agentTyping('Perfect! Now I need your password:');
        break;

      case 'asking_password':
        setPassword(value);
        handleGoogleLogin();
        break;

      case 'waiting_2fa_code':
        handleSubmitCode(value);
        break;
    }
  };

  // Get input placeholder
  const getPlaceholder = () => {
    switch (chatState) {
      case 'asking_email':
        return 'Enter your email...';
      case 'asking_password':
        return 'Enter your password...';
      case 'waiting_2fa_code':
        return 'Enter the code...';
      default:
        return 'Type your message...';
    }
  };

  // Get input type
  const getInputType = () => {
    if (chatState === 'asking_password' && !showPassword) return 'password';
    if (chatState === 'waiting_2fa_code') return 'tel';
    return 'text';
  };

  // Check if input should be disabled
  const isInputDisabled = ['connecting', 'verifying', 'platform_success', 'all_done', 'greeting', 'waiting_2fa_phone', 'asking_next_platform'].includes(chatState);

  // Render icon
  const renderIcon = (iconName: string) => {
    const IconComponent = ICONS[iconName];
    return IconComponent ? <IconComponent /> : <FaPlug />;
  };

  // Connected platforms for progress display
  const connectedPlatforms = logins.filter(l => l.is_connected);

  // ============================================
  // RENDER
  // ============================================

  return (
    <ChatContainer>
      <ChatHeader>
        <AgentAvatar>
          <FaRobot />
        </AgentAvatar>
        <AgentInfo>
          <AgentName>Liftlio Assistant</AgentName>
          <AgentStatus>
            <OnlineIndicator />
            Online
          </AgentStatus>
        </AgentInfo>
        {platforms.filter(p => p.is_active).length > 0 && (
          <PlatformProgress>
            {platforms.filter(p => p.is_active).map((platform, index) => {
              const isConnected = connectedPlatforms.some(l => l.platform_name === platform.platform_name);
              const isCurrent = index === currentPlatformIndex;
              return (
                <PlatformChip
                  key={platform.platform_name}
                  $connected={isConnected}
                  $color={platform.brand_color || '#8b5cf6'}
                  style={isCurrent && !isConnected ? {
                    animation: 'pulse 2s infinite',
                    boxShadow: `0 0 10px ${platform.brand_color}50`
                  } : undefined}
                  title={isConnected ? `${platform.display_name}: Connected` : `${platform.display_name}: Pending`}
                >
                  {renderIcon(platform.icon_name)}
                  {isConnected ? <FaCheck size={10} /> : null}
                </PlatformChip>
              );
            })}
          </PlatformProgress>
        )}
      </ChatHeader>

      <MessagesContainer>
        {messages.map(message => (
          <MessageRow key={message.id} $sender={message.sender}>
            <div>
              <MessageBubble $sender={message.sender}>
                {message.type === 'phone_wait' ? (
                  <PhoneWaitContainer>
                    <PhoneIcon>
                      <FaMobileAlt />
                    </PhoneIcon>
                    <div>{message.text}</div>
                  </PhoneWaitContainer>
                ) : message.type === 'success' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaCheck style={{ color: '#10B981' }} />
                    {message.text}
                  </div>
                ) : message.type === 'error' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaTimes style={{ color: '#EF4444' }} />
                    {message.text}
                  </div>
                ) : message.type === 'loading' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LoadingSpinner />
                    {message.text}
                  </div>
                ) : (
                  message.text
                )}

                {message.buttons && (
                  <ButtonsContainer>
                    {message.buttons.map((btn, i) => (
                      <ActionButton
                        key={i}
                        $primary={btn.primary}
                        onClick={() => handleButtonAction(btn.action)}
                      >
                        {btn.label}
                        {btn.primary && <FaArrowRight size={12} />}
                      </ActionButton>
                    ))}
                  </ButtonsContainer>
                )}
              </MessageBubble>
              <MessageTime>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </MessageTime>
            </div>
          </MessageRow>
        ))}

        {isTyping && (
          <MessageRow $sender="agent">
            <TypingIndicator>
              <span />
              <span />
              <span />
            </TypingIndicator>
          </MessageRow>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputArea>
        <InputWrapper>
          <ChatInput
            type={getInputType()}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            $type={chatState === 'waiting_2fa_code' ? 'code' : undefined}
          />
          {chatState === 'asking_password' && (
            <PasswordToggleBtn
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'relative', right: 60 }}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </PasswordToggleBtn>
          )}
          <SendButton
            onClick={handleSubmit}
            $disabled={isInputDisabled || !inputValue.trim()}
            disabled={isInputDisabled || !inputValue.trim()}
          >
            <FaPaperPlane />
          </SendButton>
        </InputWrapper>
      </InputArea>
    </ChatContainer>
  );
};

export default BrowserIntegrations;

