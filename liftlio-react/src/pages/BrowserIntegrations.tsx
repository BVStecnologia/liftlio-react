import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
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
  FaPlug as FaPlugBase
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

type LoginStatus = 'idle' | 'connecting' | '2fa_phone' | '2fa_code' | 'success' | 'error';

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
    ${props => props.$loading && `animation: ${spin} 1s linear infinite;`}
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
    animation: ${pulse} 2s ease-in-out infinite;
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

// ============================================
// COMPONENT
// ============================================

const BrowserIntegrations: React.FC = () => {
  const { currentProject } = useProject();

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

  // Load data
  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      loadLogins();
    }
  }, [currentProject?.id]);

  const loadPlatforms = async () => {
    const { data } = await supabase
      .from('browser_platforms')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (data) setPlatforms(data);
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
      filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return filled;
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    if (!currentProject?.id || !email || !password) return;

    setLoginStatus('connecting');
    setStatusMessage('Connecting to Google...');

    try {
      // 1. Save credentials to database
      const { data: loginData, error: saveError } = await supabase
        .from('browser_logins')
        .upsert({
          projeto_id: currentProject.id,
          platform_name: 'google',
          login_email: email,
          login_password: password,
          uses_google_sso: false,
          is_connected: false,
          is_active: true,
        }, {
          onConflict: 'projeto_id,platform_name,login_email',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // 2. Get platform prompts
      const googlePlatform = platforms.find(p => p.platform_name === 'google');
      if (!googlePlatform) throw new Error('Google platform not configured');

      // 3. First check if already logged in
      const checkPrompt = googlePlatform.check_logged_prompt;
      const checkResult = await sendTask(checkPrompt);
      console.log('[BrowserIntegrations] Check result:', checkResult);

      if (checkResult.includes('ALREADY_LOGGED')) {
        // Already logged in!
        await updateLoginStatus('google', true);
        setLoginStatus('success');
        setStatusMessage('Already logged in to Google!');
        await loadLogins();
        return;
      }

      // 4. Not logged in, execute login
      const loginPrompt = fillPromptTemplate(googlePlatform.login_prompt, {
        email,
        password,
      });

      const loginResult = await sendTask(loginPrompt);
      console.log('[BrowserIntegrations] Login result:', loginResult);

      // 5. Handle response
      if (loginResult.includes('LOGIN_SUCCESS')) {
        await updateLoginStatus('google', true);
        setLoginStatus('success');
        setStatusMessage('Successfully connected to Google!');
      } else if (loginResult.includes('WAITING_2FA')) {
        setLoginStatus('2fa_phone');
        setStatusMessage('Approve the login on your phone');
        startPolling2FA();
      } else if (loginResult.includes('WAITING_CODE')) {
        setLoginStatus('2fa_code');
        setStatusMessage('Enter the verification code');
      } else if (loginResult.includes('INVALID_CREDENTIALS')) {
        setLoginStatus('error');
        setStatusMessage('Invalid email or password');
      } else if (loginResult.includes('CAPTCHA_FAILED')) {
        setLoginStatus('error');
        setStatusMessage('Could not solve CAPTCHA. Please try again later.');
      } else if (loginResult.includes('ACCOUNT_LOCKED')) {
        setLoginStatus('error');
        setStatusMessage('Account is locked. Please recover your account.');
      } else if (loginResult.includes('ERROR:')) {
        const errorMsg = loginResult.split('ERROR:')[1]?.trim() || 'Unknown error';
        setLoginStatus('error');
        setStatusMessage(errorMsg);
      } else {
        setLoginStatus('error');
        setStatusMessage('Unexpected response from agent');
      }

      await loadLogins();
    } catch (error: any) {
      console.error('[BrowserIntegrations] Login error:', error);
      setLoginStatus('error');
      setStatusMessage(error.message || 'Connection failed');
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

        if (result.includes('LOGIN_SUCCESS')) {
          await updateLoginStatus('google', true);
          setLoginStatus('success');
          setStatusMessage('Successfully connected to Google!');
          await loadLogins();
          return;
        } else if (result.includes('DENIED')) {
          setLoginStatus('error');
          setStatusMessage('Login request was denied');
          return;
        }

        // Still waiting
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
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

      if (result.includes('LOGIN_SUCCESS')) {
        await updateLoginStatus('google', true);
        setLoginStatus('success');
        setStatusMessage('Successfully connected to Google!');
      } else if (result.includes('INVALID_CODE')) {
        setLoginStatus('2fa_code');
        setStatusMessage('Invalid code. Please try again.');
      } else {
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

  // Filter platforms that support Google SSO (excluding Google itself)
  const ssoPlatforms = platforms.filter(p => p.supports_google_sso && p.platform_name !== 'google');

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <FaPlug />
          Browser Integrations
        </PageTitle>
        <PageDescription>
          Connect your accounts to enable browser automation
        </PageDescription>
      </PageHeader>

      {/* Step 1: Google Login */}
      <StepCard $active={!isGoogleConnected} $completed={isGoogleConnected}>
        <StepHeader>
          <StepNumber $completed={isGoogleConnected}>
            {isGoogleConnected ? <FaCheck /> : '1'}
          </StepNumber>
          <StepTitle>Connect Google Account</StepTitle>
          {isGoogleConnected && (
            <ConnectedBadge>
              <FaCheck /> Connected
            </ConnectedBadge>
          )}
        </StepHeader>

        <StepContent>
          {isGoogleConnected ? (
            <PlatformItem $connected={true}>
              <PlatformIcon $color="#4285F4">
                <FaGoogle />
              </PlatformIcon>
              <PlatformInfo>
                <PlatformName>Google</PlatformName>
                <PlatformStatus $connected={true}>
                  <FaCheck /> {googleLogin?.login_email}
                </PlatformStatus>
              </PlatformInfo>
            </PlatformItem>
          ) : (
            <>
              <FormGroup>
                <FormLabel>Email</FormLabel>
                <FormInput
                  type="email"
                  placeholder="your@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginStatus === 'connecting'}
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
                    disabled={loginStatus === 'connecting'}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </PasswordToggle>
                </InputWrapper>
              </FormGroup>

              {loginStatus === '2fa_code' && (
                <FormGroup>
                  <FormLabel>Verification Code</FormLabel>
                  <TwoFAInput
                    type="text"
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                </FormGroup>
              )}

              <PrimaryButton
                onClick={loginStatus === '2fa_code' ? handleSubmit2FACode : handleGoogleLogin}
                disabled={
                  loginStatus === 'connecting' ||
                  loginStatus === '2fa_phone' ||
                  (!email || !password) && loginStatus !== '2fa_code'
                }
                $loading={loginStatus === 'connecting'}
              >
                {loginStatus === 'connecting' ? (
                  <>
                    <FaSpinner /> Connecting...
                  </>
                ) : loginStatus === '2fa_code' ? (
                  <>
                    <FaLock /> Verify Code
                  </>
                ) : (
                  <>
                    <FaGoogle /> Connect Google
                  </>
                )}
              </PrimaryButton>

              {statusMessage && (
                <StatusMessage
                  $type={
                    loginStatus === 'success' ? 'success' :
                    loginStatus === 'error' ? 'error' :
                    loginStatus === '2fa_phone' || loginStatus === '2fa_code' ? 'warning' :
                    'info'
                  }
                >
                  {loginStatus === 'connecting' && <FaSpinner />}
                  {loginStatus === '2fa_phone' && <FaLock />}
                  {loginStatus === '2fa_code' && <FaLock />}
                  {loginStatus === 'success' && <FaCheck />}
                  {loginStatus === 'error' && <FaTimes />}
                  {statusMessage}
                </StatusMessage>
              )}
            </>
          )}
        </StepContent>
      </StepCard>

      {/* Step 2: Other Platforms */}
      <StepCard $active={isGoogleConnected} $completed={false}>
        <StepHeader>
          <StepNumber $completed={false}>2</StepNumber>
          <StepTitle>Connect Other Platforms</StepTitle>
        </StepHeader>

        <StepContent>
          {!isGoogleConnected ? (
            <StatusMessage $type="info">
              <FaLock />
              Connect Google first to enable other platforms
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
                      key={platform.platform_name}
                      $connected={isConnected}
                      onClick={() => togglePlatform(platform.platform_name)}
                    >
                      <PlatformIcon $color={platform.brand_color}>
                        {renderIcon(platform.icon_name)}
                      </PlatformIcon>
                      <PlatformInfo>
                        <PlatformName>{platform.display_name}</PlatformName>
                        <PlatformStatus $connected={isConnected}>
                          {isConnected ? (
                            <><FaCheck /> Connected via Google</>
                          ) : (
                            <>Uses Google Account</>
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
                      {isConnected && <FaCheck style={{ color: '#10B981' }} />}
                    </PlatformItem>
                  );
                })}
              </PlatformList>

              {selectedPlatforms.length > 0 && (
                <PrimaryButton
                  onClick={handleConnectPlatforms}
                  disabled={loginStatus === 'connecting'}
                  $loading={loginStatus === 'connecting'}
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
