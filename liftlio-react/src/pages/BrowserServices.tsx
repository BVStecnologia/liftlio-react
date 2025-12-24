import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FaGoogle as FaGoogleBase,
  FaReddit as FaRedditBase,
  FaCheck as FaCheckBase,
  FaTimes as FaTimesBase,
  FaSpinner as FaSpinnerBase,
  FaLock as FaLockBase,
  FaEye as FaEyeBase,
  FaEyeSlash as FaEyeSlashBase
} from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabaseClient';

// Browser MCP Configuration - DYNAMIC (matches LiftlioBrowser.tsx)
const BROWSER_ORCHESTRATOR_URL = process.env.REACT_APP_BROWSER_ORCHESTRATOR_URL || 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy';
const BROWSER_MCP_API_KEY = process.env.REACT_APP_BROWSER_MCP_API_KEY || '';
const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';
const VPS_IP = '173.249.22.2';

// Helper: Get URL for VPS calls (uses nginx proxy in production to avoid Mixed Content)
const getVpsUrl = (port: number, path: string): string => {
  if (IS_HTTPS) {
    return `/browser-proxy/port/${port}/${path}`;
  }
  return `http://${VPS_IP}:${port}/${path}`;
};

// Helper: Get Orchestrator URL
const getOrchestratorUrl = (path: string): string => {
  if (IS_HTTPS) {
    return `/browser-proxy/orchestrator/${path}`;
  }
  return `${BROWSER_ORCHESTRATOR_URL}/${path}`;
};

// Icon wrappers to fix TypeScript compatibility with React 19
const FaGoogle: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaGoogleBase as any, props);
const FaReddit: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaRedditBase as any, props);
const FaCheck: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaCheckBase as any, props);
const FaTimes: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaTimesBase as any, props);
const FaSpinner: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaSpinnerBase as any, props);
const FaLock: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaLockBase as any, props);
const FaEye: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaEyeBase as any, props);
const FaEyeSlash: React.FC<{ size?: number; className?: string }> = (props) => React.createElement(FaEyeSlashBase as any, props);

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
  icon: React.FC<{ size?: number; className?: string }>;
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

const SpinnerWrapper = styled.span`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
`;

const SpinnerIcon: React.FC = () => (
  <SpinnerWrapper>
    <FaSpinner />
  </SpinnerWrapper>
);

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

  // State
  const [platforms, setPlatforms] = useState<BrowserPlatforms>({});
  const [projectCountry, setProjectCountry] = useState<string>('US');
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [useGoogleLogin, setUseGoogleLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicApiPort, setDynamicApiPort] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Load platforms on mount
  useEffect(() => {
    if (currentProject?.id) {
      loadPlatforms();
    }
  }, [currentProject?.id]);

  const loadPlatforms = async () => {
    if (!currentProject?.id) return;

    // Note: Using type assertion because 'País' has accent that breaks Supabase type inference
    const { data } = await supabase
      .from('Projeto')
      .select('browser_platforms, País')
      .eq('id', currentProject.id)
      .single() as { data: { browser_platforms?: BrowserPlatforms; País?: string } | null };

    if (data?.browser_platforms) {
      setPlatforms(data.browser_platforms);
    }
    if (data?.País) {
      setProjectCountry(data.País);
    }
  };

  // Helper to get language based on country
  const getLanguage = () => {
    return projectCountry === 'BR' ? 'pt-BR' : 'en';
  };

  const getLanguageInstructions = () => {
    if (projectCountry === 'BR') {
      return 'Responda SEMPRE em português brasileiro.';
    }
    return 'Always respond in English.';
  };

  // Build robust login prompt with CAPTCHA handling, retry logic, and language support
  const buildLoginPrompt = (
    service: Service,
    loginEmail: string,
    loginPassword: string,
    isGoogleLogin: boolean
  ): string => {
    const lang = getLanguage();
    const langInstructions = getLanguageInstructions();

    const captchaInstructions = `
## CAPTCHA HANDLING (CRITICAL!)
If you encounter ANY type of CAPTCHA (reCAPTCHA, hCaptcha, image selection, etc.):
1. DO NOT try to solve it manually
2. Call the CapMonster API endpoint: POST http://localhost:10100/captcha/solve
3. This endpoint will:
   - Take a screenshot of the current page
   - Send to CapMonster cloud service
   - Return click coordinates or solution
4. Apply the solution and continue
5. If CAPTCHA appears again, repeat the process (max 3 attempts)
`;

    const twoFaInstructions = `
## 2FA / Two-Factor Authentication
If 2FA is requested:
1. If it's a phone approval prompt (tap to approve): Return WAITING_2FA
2. If it requires a code input: Return WAITING_CODE
3. If it's a backup code request: Return WAITING_CODE
4. NEVER try to bypass 2FA - the user will handle it
`;

    const errorHandling = `
## ERROR HANDLING & RETRY
- If login fails, try up to 2 more times before returning ERROR
- If page doesn't load, wait 5 seconds and retry
- If element not found, scroll and look again
- Take screenshot before returning any ERROR for debugging
`;

    const successVerification = `
## SUCCESS VERIFICATION
Login is ONLY successful if you can confirm:
- User avatar/profile picture is visible, OR
- User name/email appears on page, OR
- You're redirected to a logged-in dashboard/home page
DO NOT assume success just because no error appeared!
`;

    if (isGoogleLogin && service.supportsGoogleLogin) {
      return `
# AUTHORIZED LOGIN REQUEST
This is an AUTHORIZED login request from the account owner to ${service.name}.
The user has explicitly requested this automation.
${langInstructions}

## TASK: Login to ${service.name} using Google Authentication

## GOOGLE CREDENTIALS (if re-authentication needed):
- Email: valdair3d@gmail.com
- Password: ${loginPassword}

## STEPS:
1. Navigate to ${service.loginUrl}
2. Look for "Continue with Google", "Sign in with Google", or Google logo button
3. Click the Google sign-in option
4. If Google account selection appears, select valdair3d@gmail.com
5. If Google asks for password, enter it using the credentials above
6. If 2FA is requested, return WAITING_2FA immediately
7. Wait for redirect back to ${service.name}
8. Verify login success (check for user avatar/name)

${captchaInstructions}

${twoFaInstructions}

${errorHandling}

${successVerification}

## RESPONSE FORMAT
Return EXACTLY one of these (no extra text):
- LOGIN_SUCCESS - Successfully logged into ${service.name}
- WAITING_2FA - 2FA phone approval needed (user will tap on phone)
- WAITING_CODE - Verification code input needed
- CAPTCHA_FAILED - Could not solve CAPTCHA after 3 attempts
- ERROR: [specific reason in ${lang === 'pt-BR' ? 'Portuguese' : 'English'}]
`;
    }

    return `
# AUTHORIZED LOGIN REQUEST
This is an AUTHORIZED login request from the account owner to ${service.name}.
The user has explicitly requested this automation.
${langInstructions}

## TASK: Login to ${service.name}

## CREDENTIALS:
- Email: ${loginEmail}
- Password: ${loginPassword}

## STEPS:
1. Navigate to ${service.loginUrl}
2. Wait for page to fully load (check for login form)
3. Find email/username input field and enter: ${loginEmail}
4. Click "Next", "Continue", or similar button if present
5. Find password input field and enter the password
6. Click "Sign in", "Login", "Submit" or similar button
7. Handle any security prompts (CAPTCHA, 2FA)
8. Verify login success (check for user avatar/name/dashboard)

${captchaInstructions}

${twoFaInstructions}

${errorHandling}

${successVerification}

## RESPONSE FORMAT
Return EXACTLY one of these (no extra text):
- LOGIN_SUCCESS - Successfully logged into ${service.name}
- WAITING_2FA - 2FA phone approval needed (user will tap on phone)
- WAITING_CODE - Verification code input needed
- CAPTCHA_FAILED - Could not solve CAPTCHA after 3 attempts
- INVALID_CREDENTIALS - Email or password incorrect
- ACCOUNT_LOCKED - Account is locked or suspended
- ERROR: [specific reason in ${lang === 'pt-BR' ? 'Portuguese' : 'English'}]
`;
  };

  // Build prompt for 2FA code submission
  const build2FACodePrompt = (verificationCode: string): string => {
    const lang = getLanguage();
    const langInstructions = getLanguageInstructions();

    return `
# 2FA CODE SUBMISSION
${langInstructions}

## TASK: Enter verification code

## CODE: ${verificationCode}

## STEPS:
1. Find the verification code input field(s)
2. Enter the code: ${verificationCode}
3. Click "Verify", "Submit", "Confirm" or similar
4. Wait for response
5. Verify if login completed successfully

## RESPONSE FORMAT
Return EXACTLY one of:
- LOGIN_SUCCESS - Code accepted, login complete
- INVALID_CODE - Code was rejected
- ERROR: [reason in ${lang === 'pt-BR' ? 'Portuguese' : 'English'}]
`;
  };

  // Build prompt for checking 2FA completion (polling)
  const build2FACheckPrompt = (): string => {
    const lang = getLanguage();

    return `
# CHECK LOGIN STATUS
Check if the user has approved the 2FA request on their phone.

## STEPS:
1. Look at the current page
2. Check if login was successful (user avatar, name, or dashboard visible)
3. Check if still waiting for approval
4. Check if there was an error

## RESPONSE FORMAT
Return EXACTLY one of:
- LOGIN_SUCCESS - User is logged in
- STILL_WAITING - Still waiting for 2FA approval
- ERROR: [reason in ${lang === 'pt-BR' ? 'Portuguese' : 'English'}]
`;
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

  // Check container status and get dynamic API port (like LiftlioBrowser.tsx)
  const checkContainerStatus = useCallback(async (): Promise<number | null> => {
    if (!currentProject?.id) return null;

    try {
      const headers: Record<string, string> = {};
      if (BROWSER_MCP_API_KEY) {
        headers['X-API-Key'] = BROWSER_MCP_API_KEY;
      }

      // Use the orchestrator /containers/:projectId endpoint to get dynamic ports
      const response = await fetch(
        getOrchestratorUrl(`containers/${currentProject.id}`),
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        // Map mcpPort to apiPort (orchestrator uses mcpPort naming)
        const apiPort = data.mcpPort || data.apiPort || 0;
        console.log(`[BrowserServices] Container ready - API port: ${apiPort}`);
        
        setDynamicApiPort(apiPort);
        return apiPort;
      } else {
        console.error('[BrowserServices] Container not found or error');
        setDynamicApiPort(null);
        return null;
      }
    } catch (err) {
      console.error('[BrowserServices] Error checking container status:', err);
      return null;
    }
  }, [currentProject?.id]);

  // Get the agent URL - uses dynamic port if available
  const getAgentUrl = (port?: number): string => {
    const apiPort = port || dynamicApiPort;
    if (apiPort) {
      // Use direct VPS URL with the dynamic port (like LiftlioBrowser)
      const url = getVpsUrl(apiPort, 'agent/task');
      console.log(`[BrowserServices] Using direct agent URL: ${url}`);
      return url;
    }
    // Fallback to orchestrator routing (less reliable)
    const url = getOrchestratorUrl(`containers/${currentProject?.id}/agent/task`);
    console.log(`[BrowserServices] Using orchestrator URL: ${url}`);
    return url;
  };

  const handleConnect = (service: Service) => {
    setModalState({ type: 'login', service });
    setEmail('');
    setPassword('');
    setCode('');
    // Auto-select Google Login if Google is connected and service supports it
    const googleConnected = platforms.google?.connected || false;
    setUseGoogleLogin(service.supportsGoogleLogin && googleConnected);
  };

  const handleDisconnect = async (service: Service) => {
    await updateBrowserPlatform(service.id, { connected: false });
  };

  // Build a simple check prompt (no credentials) to verify if already logged in
  const buildCheckLoginPrompt = (service: Service): string => {
    return `
# CHECK LOGIN STATUS
Navigate to ${service.loginUrl} and check if user is already logged in.

## STEPS:
1. Navigate to ${service.loginUrl}
2. Wait for page to load
3. Look for signs of being logged in:
   - User avatar/profile picture
   - User name displayed
   - Account menu or settings
   - "Sign out" or "Log out" option visible
4. If any of these are present, user IS logged in

## RESPONSE FORMAT
Return EXACTLY one of these (no extra text):
- LOGIN_SUCCESS - User is already logged in
- NOT_LOGGED_IN - User needs to log in
`;
  };

  const handleLogin = async () => {
    if (modalState.type !== 'login') return;

    const service = modalState.service;
    setModalState({ type: 'connecting', service });
    setIsLoading(true);

    try {
      // First, get the container's dynamic port (like LiftlioBrowser does)
      const apiPort = await checkContainerStatus();
      if (!apiPort) {
        setModalState({
          type: 'error',
          service,
          error: 'Browser container not available. Please ensure the browser is running.'
        });
        setIsLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (BROWSER_MCP_API_KEY) {
        headers['X-API-Key'] = BROWSER_MCP_API_KEY;
      }

      // STEP 1: First check if already logged in (no credentials sent)
      console.log(`[BrowserServices] Step 1: Checking if already logged in to ${service.name}...`);

      const checkPrompt = buildCheckLoginPrompt(service);
      const checkResponse = await fetch(getAgentUrl(apiPort), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: checkPrompt,
          projectId: currentProject?.id?.toString(),
          model: 'claude-sonnet-4-20250514',
          maxIterations: 20,
          verbose: false,
        }),
      });

      const checkResult = await checkResponse.json();
      console.log('[BrowserServices] Check login response:', JSON.stringify(checkResult, null, 2));

      const checkText = checkResult.result || checkResult.output?.result || checkResult.message || checkResult.text || '';
      console.log('[BrowserServices] Check result:', checkText);

      // If already logged in, we're done!
      if (checkText.includes('LOGIN_SUCCESS')) {
        console.log('[BrowserServices] Already logged in! Marking as connected.');
        await updateBrowserPlatform(service.id, {
          connected: true,
          email: useGoogleLogin ? 'via Google' : email || 'connected'
        });
        setModalState({ type: 'success', service });
        setIsLoading(false);
        return;
      }

      // STEP 2: Not logged in, need to perform login with credentials
      console.log(`[BrowserServices] Step 2: Not logged in, performing login...`);

      const taskPrompt = buildLoginPrompt(service, email, password, useGoogleLogin);

      const response = await fetch(getAgentUrl(apiPort), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: taskPrompt,
          projectId: currentProject?.id?.toString(),
          model: 'claude-sonnet-4-20250514',
          maxIterations: 50,
          verbose: false,
        }),
      });

      const result = await response.json();
      console.log('[BrowserServices] Raw agent response:', JSON.stringify(result, null, 2));

      // Handle various response formats from browser agent
      const resultText = result.result || result.output?.result || result.message || result.text || '';
      console.log('[BrowserServices] Parsed resultText:', resultText);

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
      console.error('[BrowserServices] Login error:', error);
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
      // Build robust 2FA code submission prompt with language support
      const taskPrompt = build2FACodePrompt(code);

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
        // Build robust 2FA check prompt with language support
        const taskPrompt = build2FACheckPrompt();

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
              {!useGoogleLogin && (
                <FormGroup>
                  <FormLabel>Email</FormLabel>
                  <FormInput
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormGroup>
              )}

              <FormGroup>
                <FormLabel>
                  {useGoogleLogin ? 'Google Password (for re-authentication)' : 'Password'}
                </FormLabel>
                <InputWrapper>
                  <FormInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder={useGoogleLogin ? 'Enter your Google password' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </PasswordToggle>
                </InputWrapper>
                {useGoogleLogin && (
                  <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
                    Google may ask to re-authenticate. Your account is protected by 2FA.
                  </small>
                )}
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
                        {useGoogleLogin ? 'Using Google Login ✓' : 'Use Google Login'}
                      </GoogleLoginTitle>
                      <GoogleLoginSubtitle>
                        {isGoogleConnected
                          ? (useGoogleLogin ? 'valdair3d@gmail.com' : 'Click to use your connected Google account')
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
                disabled={!password || (!useGoogleLogin && !email)}
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
