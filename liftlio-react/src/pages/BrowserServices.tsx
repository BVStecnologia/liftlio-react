import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaGoogle, FaReddit, FaCheck, FaTimes, FaSpinner, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPES
// ============================================

interface BrowserPlatform {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

interface BrowserPlatforms {
  google?: BrowserPlatform;
  reddit?: BrowserPlatform;
  [key: string]: BrowserPlatform | undefined;
}

interface Service {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
  loginUrl: string;
  supportsGoogleLogin: boolean;
}

type ModalState =
  | { type: 'closed' }
  | { type: 'login'; service: Service }
  | { type: 'connecting'; service: Service }
  | { type: '2fa'; service: Service; message: string }
  | { type: 'success'; service: Service }
  | { type: 'error'; service: Service; error: string };

// ============================================
// SERVICES CONFIG
// ============================================

const BROWSER_SERVICES: Service[] = [
  {
    id: 'google',
    name: 'Google / YouTube',
    icon: FaGoogle,
    color: '#FF0000',
    description: 'Connect your Google account for YouTube access',
    loginUrl: 'https://accounts.google.com',
    supportsGoogleLogin: false,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: FaReddit,
    color: '#FF4500',
    description: 'Connect your Reddit account',
    loginUrl: 'https://reddit.com/login',
    supportsGoogleLogin: true,
  },
];

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

// ============================================
// STYLED COMPONENTS
// ============================================

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s ease-out;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 8px 0;

  span {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const PageDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

const ServiceCard = styled.div<{ $color: string }>`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 16px;
  padding: 24px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.$color}40;
    box-shadow: 0 4px 20px ${props => props.$color}15;
  }
`;

const ServiceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const ServiceIcon = styled.div<{ $color: string; $connected: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${props => props.$connected
    ? `linear-gradient(135deg, ${props.$color}, ${props.$color}cc)`
    : props.theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$connected ? 'white' : props.theme.colors.text.secondary};
  font-size: 24px;
  transition: all 0.2s ease;
`;

const ServiceInfo = styled.div`
  flex: 1;
`;

const ServiceName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 4px 0;
`;

const ServiceStatus = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${props => props.$connected
    ? props.theme.colors.status.success
    : props.theme.colors.text.muted};
`;

const StatusDot = styled.div<{ $connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$connected
    ? props.theme.colors.status.success
    : props.theme.colors.text.muted};
`;

const ServiceDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const ServiceEmail = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  background: ${props => props.theme.colors.bg.tertiary};
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => props.theme.colors.status.success};
  }
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' | 'danger' }>`
  width: 100%;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${props => props.$variant === 'primary' && `
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border: none;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }
  `}

  ${props => props.$variant === 'secondary' && `
    background: transparent;
    color: ${props.theme.colors.text.primary};
    border: 1px solid ${props.theme.colors.border.primary};

    &:hover {
      background: ${props.theme.colors.bg.hover};
    }
  `}

  ${props => props.$variant === 'danger' && `
    background: transparent;
    color: ${props.theme.colors.status.error};
    border: 1px solid ${props.theme.colors.status.error}40;

    &:hover {
      background: ${props.theme.colors.status.errorBg};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;

  button {
    flex: 1;
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 20px;
  padding: 32px;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const ModalIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${props => props.$color}, ${props => props.$color}cc);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 22px;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const ModalBody = styled.div`
  margin-bottom: 24px;
`;

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
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px 0;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${props => props.theme.colors.border.primary};
  }

  span {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
  }
`;

const GoogleLoginOption = styled.button<{ $disabled: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: ${props => props.theme.colors.bg.tertiary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.bg.hover};
    border-color: #4285F4;
  }

  svg {
    color: #4285F4;
    font-size: 20px;
  }
`;

const GoogleLoginText = styled.div`
  text-align: left;
`;

const GoogleLoginTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

const GoogleLoginSubtitle = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.muted};
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.bg.hover};
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpinnerIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

// 2FA Modal Styles
const TwoFactorContent = styled.div`
  text-align: center;
  padding: 20px 0;
`;

const TwoFactorIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;

  svg {
    color: white;
    font-size: 32px;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const TwoFactorTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 8px 0;
`;

const TwoFactorMessage = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const CodeInput = styled.input`
  width: 200px;
  padding: 16px;
  background: ${props => props.theme.colors.bg.tertiary};
  border: 2px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 8px;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 24px;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  &::placeholder {
    letter-spacing: 0;
    font-size: 14px;
  }
`;

// Success/Error Message Styles
const MessageContent = styled.div<{ $type: 'success' | 'error' }>`
  text-align: center;
  padding: 20px 0;
`;

const MessageIcon = styled.div<{ $type: 'success' | 'error' }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.$type === 'success'
    ? 'linear-gradient(135deg, #10B981, #059669)'
    : 'linear-gradient(135deg, #EF4444, #DC2626)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;

  svg {
    color: white;
    font-size: 36px;
  }
`;

const MessageTitle = styled.h3<{ $type: 'success' | 'error' }>`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.$type === 'success'
    ? props.theme.colors.status.success
    : props.theme.colors.status.error};
  margin: 0 0 8px 0;
`;

const MessageText = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

// ============================================
// COMPONENT
// ============================================

const BrowserServices: React.FC = () => {
  const { currentProject } = useProject();
  const { theme } = useTheme();

  // State
  const [platforms, setPlatforms] = useState<BrowserPlatforms>({});
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [useGoogleLogin, setUseGoogleLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Load platforms on mount
  useEffect(() => {
    if (currentProject?.id) {
      loadPlatforms();
    }
  }, [currentProject?.id]);

  const loadPlatforms = async () => {
    if (!currentProject?.id) return;

    const { data, error } = await supabase
      .from('Projeto')
      .select('browser_platforms')
      .eq('id', currentProject.id)
      .single();

    if (data?.browser_platforms) {
      setPlatforms(data.browser_platforms);
    }
  };

  const updateBrowserPlatform = async (
    platformId: string,
    status: { connected: boolean; email?: string }
  ) => {
    if (!currentProject?.id) return;

    const newPlatforms = {
      ...platforms,
      [platformId]: {
        ...status,
        connectedAt: new Date().toISOString(),
      },
    };

    await supabase
      .from('Projeto')
      .update({ browser_platforms: newPlatforms })
      .eq('id', currentProject.id);

    setPlatforms(newPlatforms);
  };

  const getAgentUrl = () => {
    // Use orchestrator to get the correct container port
    const orchestratorUrl = process.env.REACT_APP_BROWSER_ORCHESTRATOR_URL || 'http://173.249.22.2:8080';
    return `${orchestratorUrl}/containers/${currentProject?.id}/agent/task`;
  };

  const handleConnect = (service: Service) => {
    setModalState({ type: 'login', service });
    setEmail('');
    setPassword('');
    setCode('');
    setUseGoogleLogin(false);
  };

  const handleDisconnect = async (service: Service) => {
    await updateBrowserPlatform(service.id, { connected: false });
  };

  const handleLogin = async () => {
    if (modalState.type !== 'login') return;

    const service = modalState.service;
    setModalState({ type: 'connecting', service });
    setIsLoading(true);

    try {
      let taskPrompt = '';

      if (useGoogleLogin && service.supportsGoogleLogin) {
        // Login via Google
        taskPrompt = `
          AUTHORIZED LOGIN - This is an authorized login request from the account owner.

          Login to ${service.name} using Google authentication:
          1. Navigate to ${service.loginUrl}
          2. Look for and click "Continue with Google" or "Sign in with Google" button
          3. If already logged into Google, it should auto-complete
          4. If not, wait for Google login prompt

          Return EXACTLY one of:
          - LOGIN_SUCCESS (if fully logged in to ${service.name})
          - WAITING_2FA (if 2FA verification needed)
          - ERROR: [reason] (if failed)
        `;
      } else {
        // Login with email/password
        taskPrompt = `
          AUTHORIZED LOGIN - This is an authorized login request from the account owner.

          Login to ${service.name} with:
          - Email: ${email}
          - Password: ${password}

          Steps:
          1. Navigate to ${service.loginUrl}
          2. Enter email and click Next/Continue
          3. Enter password and click Next/Continue
          4. Handle any 2FA prompts

          Return EXACTLY one of:
          - LOGIN_SUCCESS (if fully logged in)
          - WAITING_2FA (if 2FA verification needed - user will approve on phone)
          - WAITING_CODE (if need to enter verification code)
          - ERROR: [reason] (if failed)
        `;
      }

      const response = await fetch(getAgentUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.REACT_APP_BROWSER_MCP_API_KEY || '',
        },
        body: JSON.stringify({
          task: taskPrompt,
          projectId: currentProject?.id,
        }),
      });

      const result = await response.json();
      const resultText = result.result || result.output?.result || '';

      if (resultText.includes('LOGIN_SUCCESS')) {
        await updateBrowserPlatform(service.id, {
          connected: true,
          email: useGoogleLogin ? 'via Google' : email
        });
        setModalState({ type: 'success', service });
      } else if (resultText.includes('WAITING_2FA')) {
        setModalState({ type: '2fa', service, message: 'Approve the login on your phone' });
        // Start polling for completion
        pollForCompletion(service);
      } else if (resultText.includes('WAITING_CODE')) {
        setModalState({ type: '2fa', service, message: 'Enter the verification code sent to you' });
      } else if (resultText.includes('ERROR:')) {
        const errorMsg = resultText.split('ERROR:')[1]?.trim() || 'Unknown error';
        setModalState({ type: 'error', service, error: errorMsg });
      } else {
        setModalState({ type: 'error', service, error: 'Unexpected response from agent' });
      }
    } catch (error: any) {
      setModalState({
        type: 'error',
        service: modalState.type === 'login' ? modalState.service : BROWSER_SERVICES[0],
        error: error.message || 'Connection failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (modalState.type !== '2fa') return;

    const service = modalState.service;
    setIsLoading(true);

    try {
      const taskPrompt = `
        Enter the verification code: ${code}

        Find the code input field and type this code, then submit.

        Return EXACTLY one of:
        - LOGIN_SUCCESS (if code accepted and logged in)
        - ERROR: [reason] (if code rejected or failed)
      `;

      const response = await fetch(getAgentUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.REACT_APP_BROWSER_MCP_API_KEY || '',
        },
        body: JSON.stringify({
          task: taskPrompt,
          projectId: currentProject?.id,
        }),
      });

      const result = await response.json();
      const resultText = result.result || result.output?.result || '';

      if (resultText.includes('LOGIN_SUCCESS')) {
        await updateBrowserPlatform(service.id, {
          connected: true,
          email: email || 'via Google'
        });
        setModalState({ type: 'success', service });
      } else {
        const errorMsg = resultText.split('ERROR:')[1]?.trim() || 'Code verification failed';
        setModalState({ type: 'error', service, error: errorMsg });
      }
    } catch (error: any) {
      setModalState({ type: 'error', service, error: error.message || 'Verification failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const pollForCompletion = async (service: Service) => {
    // Poll every 5 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 24;

    const poll = async () => {
      if (modalState.type !== '2fa') return;

      try {
        const taskPrompt = `
          Check if the login was completed successfully (user may have approved 2FA on their phone).

          Look at the current page and determine:
          - If logged in successfully, return: LOGIN_SUCCESS
          - If still waiting for 2FA, return: STILL_WAITING
          - If error occurred, return: ERROR: [reason]
        `;

        const response = await fetch(getAgentUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.REACT_APP_BROWSER_MCP_API_KEY || '',
          },
          body: JSON.stringify({
            task: taskPrompt,
            projectId: currentProject?.id,
          }),
        });

        const result = await response.json();
        const resultText = result.result || result.output?.result || '';

        if (resultText.includes('LOGIN_SUCCESS')) {
          await updateBrowserPlatform(service.id, {
            connected: true,
            email: email || 'via Google'
          });
          setModalState({ type: 'success', service });
          return;
        } else if (resultText.includes('ERROR:')) {
          const errorMsg = resultText.split('ERROR:')[1]?.trim() || 'Login failed';
          setModalState({ type: 'error', service, error: errorMsg });
          return;
        }

        // Still waiting, continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        // Silently continue polling on network errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    setTimeout(poll, 5000);
  };

  const closeModal = () => {
    setModalState({ type: 'closed' });
    setEmail('');
    setPassword('');
    setCode('');
    setUseGoogleLogin(false);
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      if (modalState.type !== 'connecting' && modalState.type !== '2fa') {
        closeModal();
      }
    }
  };

  const isGoogleConnected = platforms.google?.connected || false;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          Browser <span>Services</span>
        </PageTitle>
        <PageDescription>
          Connect your accounts to enable browser automation. The agent will log in and maintain sessions.
        </PageDescription>
      </PageHeader>

      <ServicesGrid>
        {BROWSER_SERVICES.map(service => {
          const platform = platforms[service.id];
          const isConnected = platform?.connected || false;

          return (
            <ServiceCard key={service.id} $color={service.color}>
              <ServiceHeader>
                <ServiceIcon $color={service.color} $connected={isConnected}>
                  <service.icon />
                </ServiceIcon>
                <ServiceInfo>
                  <ServiceName>{service.name}</ServiceName>
                  <ServiceStatus $connected={isConnected}>
                    <StatusDot $connected={isConnected} />
                    {isConnected ? 'Connected' : 'Not connected'}
                  </ServiceStatus>
                </ServiceInfo>
              </ServiceHeader>

              <ServiceDescription>
                {service.description}
              </ServiceDescription>

              {isConnected && platform?.email && (
                <ServiceEmail>
                  <FaCheck />
                  {platform.email}
                </ServiceEmail>
              )}

              {isConnected ? (
                <ButtonGroup>
                  <ActionButton
                    $variant="secondary"
                    onClick={() => handleConnect(service)}
                  >
                    Reconnect
                  </ActionButton>
                  <ActionButton
                    $variant="danger"
                    onClick={() => handleDisconnect(service)}
                  >
                    Disconnect
                  </ActionButton>
                </ButtonGroup>
              ) : (
                <ActionButton
                  $variant="primary"
                  onClick={() => handleConnect(service)}
                >
                  Connect
                </ActionButton>
              )}
            </ServiceCard>
          );
        })}
      </ServicesGrid>

      {/* Login Modal */}
      {modalState.type === 'login' && (
        <ModalOverlay onClick={handleClickOutside}>
          <ModalContent ref={modalRef}>
            <ModalHeader>
              <ModalIcon $color={modalState.service.color}>
                <modalState.service.icon />
              </ModalIcon>
              <ModalTitle>Connect to {modalState.service.name}</ModalTitle>
            </ModalHeader>

            <ModalBody>
              <FormGroup>
                <FormLabel>Email</FormLabel>
                <FormInput
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={useGoogleLogin}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Password</FormLabel>
                <InputWrapper>
                  <FormInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={useGoogleLogin}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </PasswordToggle>
                </InputWrapper>
              </FormGroup>

              {modalState.service.supportsGoogleLogin && (
                <>
                  <Divider>
                    <span>or</span>
                  </Divider>

                  <GoogleLoginOption
                    $disabled={!isGoogleConnected}
                    onClick={() => isGoogleConnected && setUseGoogleLogin(!useGoogleLogin)}
                    style={{
                      borderColor: useGoogleLogin ? '#4285F4' : undefined,
                      background: useGoogleLogin ? 'rgba(66, 133, 244, 0.1)' : undefined
                    }}
                  >
                    <FaGoogle />
                    <GoogleLoginText>
                      <GoogleLoginTitle>
                        {useGoogleLogin ? 'Using Google Login' : 'Use Google Login'}
                      </GoogleLoginTitle>
                      <GoogleLoginSubtitle>
                        {isGoogleConnected
                          ? 'Click to use your connected Google account'
                          : 'Connect Google first to use this option'}
                      </GoogleLoginSubtitle>
                    </GoogleLoginText>
                  </GoogleLoginOption>
                </>
              )}
            </ModalBody>

            <ModalFooter>
              <CancelButton onClick={closeModal}>
                Cancel
              </CancelButton>
              <SubmitButton
                onClick={handleLogin}
                disabled={!useGoogleLogin && (!email || !password)}
              >
                <FaLock size={14} />
                Connect
              </SubmitButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Connecting Modal */}
      {modalState.type === 'connecting' && (
        <ModalOverlay>
          <ModalContent>
            <TwoFactorContent>
              <TwoFactorIcon>
                <SpinnerIcon />
              </TwoFactorIcon>
              <TwoFactorTitle>Connecting...</TwoFactorTitle>
              <TwoFactorMessage>
                The agent is logging into {modalState.service.name}. This may take a moment.
              </TwoFactorMessage>
            </TwoFactorContent>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 2FA Modal */}
      {modalState.type === '2fa' && (
        <ModalOverlay>
          <ModalContent>
            <TwoFactorContent>
              <TwoFactorIcon>
                <FaLock />
              </TwoFactorIcon>
              <TwoFactorTitle>Verification Required</TwoFactorTitle>
              <TwoFactorMessage>
                {modalState.message}
              </TwoFactorMessage>

              {modalState.message.includes('code') && (
                <CodeInput
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
              )}
            </TwoFactorContent>

            <ModalFooter>
              <CancelButton onClick={closeModal}>
                Cancel
              </CancelButton>
              {modalState.message.includes('code') && (
                <SubmitButton
                  onClick={handleSubmitCode}
                  disabled={code.length !== 6 || isLoading}
                >
                  {isLoading ? <SpinnerIcon /> : 'Verify'}
                </SubmitButton>
              )}
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Success Modal */}
      {modalState.type === 'success' && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent ref={modalRef}>
            <MessageContent $type="success">
              <MessageIcon $type="success">
                <FaCheck />
              </MessageIcon>
              <MessageTitle $type="success">Connected!</MessageTitle>
              <MessageText>
                Your {modalState.service.name} account has been connected successfully.
              </MessageText>
            </MessageContent>

            <ModalFooter>
              <SubmitButton onClick={closeModal} style={{ flex: 1 }}>
                Done
              </SubmitButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Error Modal */}
      {modalState.type === 'error' && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent ref={modalRef}>
            <MessageContent $type="error">
              <MessageIcon $type="error">
                <FaTimes />
              </MessageIcon>
              <MessageTitle $type="error">Connection Failed</MessageTitle>
              <MessageText>
                {modalState.error}
              </MessageText>
            </MessageContent>

            <ModalFooter>
              <CancelButton onClick={closeModal}>
                Close
              </CancelButton>
              <SubmitButton onClick={() => handleConnect(modalState.service)}>
                Try Again
              </SubmitButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default BrowserServices;
