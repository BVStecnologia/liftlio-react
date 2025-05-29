import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaYoutube, FaReddit, FaLinkedin, FaFacebook, FaTwitter, FaInstagram, 
         FaPlug, FaCheck, FaExclamationTriangle, FaLock, FaShieldAlt, 
         FaArrowRight, FaTimes, FaClock } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import LoadingDataIndicator from '../components/LoadingDataIndicator';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

// Styles
const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  &::after {
    content: '';
    display: block;
    height: 4px;
    width: 60px;
    background: ${props => props.theme.colors.gradient.primary};
    margin-left: 15px;
    border-radius: 2px;
  }
`;

const SearchContainer = styled.div`
  margin-bottom: 25px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 20px;
  font-size: ${props => props.theme.fontSizes.md};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white'};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => `${props.theme.colors.primary}33`};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const Categories = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
`;

const CategoryTag = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background-color: ${props => {
    if (props.active) return props.theme.colors.primary;
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white';
  }};
  color: ${props => {
    if (props.active) return 'white';
    return props.theme.colors.text.primary;
  }};
  border: 1px solid ${props => {
    if (props.active) return 'transparent';
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.lightGrey;
  }};
  border-radius: 20px;
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => {
      if (props.active) return props.theme.colors.primary;
      return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.lightGrey;
    }};
    transform: translateY(-2px);
  }
`;

const IntegrationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
`;

const IntegrationCard = styled.div<{ status: string }>`
  display: flex;
  flex-direction: column;
  padding: 25px;
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(30, 30, 35, 0.95)' : props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.name === 'dark' ? '0 4px 15px rgba(0, 0, 0, 0.3)' : props.theme.shadows.md};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease forwards;
  
  ${props => props.status === 'connected' && css`
    border-left: 4px solid ${props.theme.colors.success};
  `}
  
  ${props => props.status === 'pending' && css`
    border-left: 4px solid ${props.theme.colors.warning};
  `}
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, transparent 50%, ${props => 
      props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(245, 245, 255, 0.5)'} 50%);
    pointer-events: none;
  }
`;

const IntegrationHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const IntegrationIconContainer = styled.div`
  position: relative;
`;

const IntegrationIcon = styled.div<{ bgColor: string }>`
  width: 50px;
  height: 50px;
  background-color: ${props => props.bgColor};
  border-radius: ${props => props.theme.radius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  svg {
    color: white;
    font-size: 1.4rem;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
  }
`;

const StatusBadge = styled.div<{ status: 'connected' | 'pending' | 'disconnected' }>`
  position: absolute;
  bottom: -5px;
  right: 13px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => {
    switch (props.status) {
      case 'connected': return props.theme.colors.success;
      case 'pending': return props.theme.colors.warning;
      default: return props.theme.colors.lightGrey;
    }
  }};
  border: 2px solid ${props => props.theme.name === 'dark' ? 'rgba(30, 30, 35, 0.95)' : 'white'};
  font-size: 10px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const IntegrationNameContainer = styled.div`
  flex: 1;
`;

const IntegrationName = styled.div`
  font-weight: ${props => props.theme.fontWeights.bold};
  font-size: ${props => props.theme.fontSizes.lg};
  margin-bottom: 5px;
`;

const IntegrationStatus = styled.div<{ status: 'connected' | 'pending' | 'disconnected' }>`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => {
    switch (props.status) {
      case 'connected':
        return props.theme.colors.success;
      case 'pending':
        return props.theme.colors.warning;
      case 'disconnected':
        return props.theme.colors.darkGrey;
      default:
        return props.theme.colors.darkGrey;
    }
  }};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 5px;
  }
`;

const IntegrationDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-bottom: 20px;
  line-height: 1.5;
  flex-grow: 1;
`;

const IntegrationFeatures = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const FeatureTag = styled.span`
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.text.secondary};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: ${props => props.theme.fontSizes.xs};
  display: inline-flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  background-color: ${props => {
    switch (props.variant) {
      case 'primary':
        return props.theme.name === 'dark' ? 'rgba(94, 53, 177, 0.9)' : props.theme.colors.primary;
      case 'secondary':
        return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
      case 'danger':
        return props.theme.colors.error;
      default:
        return props.theme.colors.primary;
    }
  }};
  color: ${props => {
    if (props.variant === 'secondary') {
      return props.theme.name === 'dark' ? props.theme.colors.text.primary : props.theme.colors.primary;
    }
    return 'white';
  }};
  border: ${props => {
    if (props.variant === 'secondary') {
      return props.theme.name === 'dark' 
        ? '1px solid rgba(255, 255, 255, 0.2)' 
        : `1px solid ${props.theme.colors.primary}`;
    }
    return 'none';
  }};
  padding: 10px 18px;
  border-radius: ${props => props.theme.radius.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: rotate(30deg);
    transition: all 0.3s ease;
    opacity: 0;
  }
  
  &:hover {
    background-color: ${props => {
      switch (props.variant) {
        case 'primary':
          return props.theme.colors.primary;
        case 'secondary':
          return `${props.theme.colors.primary}15`;
        case 'danger':
          return '#d32f2f';
        default:
          return props.theme.colors.primary;
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    
    &::after {
      animation: ${shimmer} 1.5s ease forwards;
      opacity: 1;
    }
    
    svg {
      transform: translateX(3px);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    margin-left: 8px;
    transition: transform 0.3s ease;
  }
`;

const APICard = styled(Card)`
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(35, 35, 40, 0.95) 100%)'
    : 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'};
  border-top: 4px solid ${props => props.theme.colors.primary};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
`;

const APICardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const APICardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
`;

const APICardIconWrapper = styled.div`
  background: ${props => props.theme.colors.gradient.primary};
  width: 48px;
  height: 48px;
  border-radius: ${props => props.theme.radius.circle};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px ${props => `${props.theme.colors.primary}33`};
  animation: ${floatAnimation} 3s ease-in-out infinite;
  
  svg {
    color: white;
    font-size: 1.5rem;
  }
`;

const APICardTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
    : props.theme.colors.gradient.primary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const APICardDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  margin-bottom: 10px;
`;

const APICardActions = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 10px;
`;

// Modal overlay
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'white'};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px;
  position: relative;
  animation: ${fadeIn} 0.4s ease;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  color: ${props => props.theme.colors.text.primary};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalIconWrapper = styled.div<{ bgColor: string }>`
  width: 60px;
  height: 60px;
  background-color: ${props => props.bgColor};
  border-radius: ${props => props.theme.radius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  
  svg {
    color: white;
    font-size: 2rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0;
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: ${props => props.theme.colors.text.secondary};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.error};
    transform: rotate(90deg);
  }
`;

const ModalBody = styled.div`
  margin-bottom: 25px;
`;

const ModalText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ModalInfo = styled.div`
  background-color: ${props => props.theme.name === 'dark' 
    ? 'rgba(94, 53, 177, 0.1)' 
    : `${props.theme.colors.primary}15`};
  border-left: 4px solid ${props => props.theme.colors.primary};
  padding: 15px;
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 20px;
`;

const ModalInfoTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${props => props.theme.colors.primary};
  }
`;

const Checkbox = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  margin-right: 10px;
  margin-top: 3px;
`;

const CheckboxLabel = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 15px;
`;

const ModalButton = styled(ActionButton)`
  width: auto;
`;

// Constants for OAuth
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.REACT_APP_GOOGLE_CLIENT_SECRET || "";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/youtube.force-ssl"
];

// YouTube API endpoints
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Integration data
const integrations = [
  {
    id: 'youtube',
    name: 'Youtube',
    description: 'Monitor YouTube videos and comments. Engage with your audience by responding to comments.',
    icon: FaYoutube,
    bgColor: '#FF0000',
    status: 'disconnected' as const, // Will be set dynamically
    features: ['Comments', 'Mentions', 'Analytics'],
    available: true
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Track Reddit posts and comments mentioning your product. Engage with communities directly.',
    icon: FaReddit,
    bgColor: '#FF4500',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Subreddits'],
    available: false,
    comingSoon: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Monitor LinkedIn posts and comments. Engage with professional audience.',
    icon: FaLinkedin,
    bgColor: '#0077B5',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Company Pages'],
    available: false,
    comingSoon: true
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Track Facebook posts and comments. Engage with users on the largest social network.',
    icon: FaFacebook,
    bgColor: '#1877F2',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Pages', 'Groups'],
    available: false,
    comingSoon: true
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Monitor tweets and mentions. Engage with users through real-time conversations.',
    icon: FaTwitter,
    bgColor: '#1DA1F2',
    status: 'disconnected' as const,
    features: ['Tweets', 'Mentions', 'Direct Messages'],
    available: false,
    comingSoon: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Track Instagram posts and comments. Engage with visual-focused audience.',
    icon: FaInstagram,
    bgColor: '#E4405F',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Stories'],
    available: false,
    comingSoon: true
  }
];

const categories = ['All', 'Connected', 'Available Soon'];

// Interface for integration data
interface Integration {
  id: string;
  status: 'connected' | 'pending' | 'disconnected';
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  lastUpdated?: string;
  failureCount?: number; // Contador de falhas consecutivas
}

const Integrations: React.FC = () => {
  const { currentProject } = useProject();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [userIntegrations, setUserIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removemos o estado authWindow pois não vamos mais usar popup
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Verificar que os URIs de redirecionamento estão corretamente configurados no startup
  useEffect(() => {
    // Detectar ambiente
    const isProduction = window.location.hostname === 'liftlio.fly.dev';
    const redirectUri = isProduction 
      ? 'https://liftlio.fly.dev' 
      : 'http://localhost:3000';
      
    console.log('----------------------');
    console.log('CONFIGURAÇÃO OAUTH:');
    console.log('Ambiente: ' + (isProduction ? 'Produção' : 'Desenvolvimento'));
    console.log('URI de redirecionamento usado: ' + redirectUri);
    console.log('Certifique-se de que o URI acima está configurado no Google Cloud Console');
    console.log('----------------------');
    
    // Carregamento de integrações é feito diretamente sem chamar a função RPC
    if (currentProject?.id) {
      fetchIntegrations();
    }
  }, [currentProject?.id]);

  // Helper functions
  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };

  // Load project integrations para casos especiais (sem projeto atual)
  useEffect(() => {
    if (!currentProject?.id) {
      // Tentar carregar o primeiro projeto disponível se não houver projeto selecionado
      // Isso é útil especialmente durante o fluxo de onboarding
      fetchProjects().then(projects => {
        if (projects && projects.length > 0) {
          // Selecionar o primeiro projeto automaticamente
          const firstProject = projects[0];
          localStorage.setItem('currentProjectId', firstProject.id.toString());
          window.location.reload(); // Recarregar a página para atualizar o contexto
        } else {
          setUserIntegrations([]);
          setIsLoading(false);
        }
      });
    }
    
    // Verificar se há uma mensagem de sucesso de integração
    const successFlag = localStorage.getItem('integrationSuccess') === 'true';
    if (successFlag) {
      setShowSuccessMessage(true);
      localStorage.removeItem('integrationSuccess');
      
      // Auto-ocultar mensagem após 5 segundos
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentProject?.id]);

  // Fetch integrations from Supabase
  const fetchIntegrations = async () => {
    if (!currentProject?.id) return;
    
    setIsLoading(true);
    try {
      // Buscar os dados atuais da integração
      const { data, error } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', currentProject.id);
        
      if (error) throw error;
      
      // Map the integration data - o status já vem validado da função RPC
      const integrationData: Integration[] = (data || []).map((item: any) => ({
        id: item['Tipo de integração'] || '',
        status: item.ativo ? 'connected' : 'disconnected',
        token: item['Token'] || '',
        refreshToken: item['Refresh token'] || '',
        expiresAt: item['expira em'] || 0,
        lastUpdated: item['Ultima atualização'] || null,
        failureCount: item['falhas_consecutivas'] || 0
      }));
      
      setUserIntegrations(integrationData);
      console.log('Status das integrações carregado com sucesso.');
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  

  // Start OAuth flow for YouTube
  const initiateOAuth = () => {
    if (!currentProject?.id) {
      alert('Please select a project first');
      return;
    }
    
    // Use the redirect URI that is configured in Google Cloud
    // Importante: Este URI deve corresponder EXATAMENTE ao configurado no Google Cloud Console
    
    // Determinar o URI de redirecionamento correto com base no ambiente
    const isProduction = window.location.hostname === 'liftlio.fly.dev';
    const redirectUri = isProduction 
      ? 'https://liftlio.fly.dev' 
      : 'http://localhost:3000';
      
    console.log('Ambiente detectado no iniciateOAuth:', isProduction ? 'Produção' : 'Desenvolvimento');
    
    // Log para debug - verificar o URI exato que estamos usando
    console.log('Using redirect URI:', redirectUri);
    
    const scope = GOOGLE_SCOPES.join(' ');
    
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    oauthUrl.searchParams.append('redirect_uri', redirectUri);
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('scope', scope);
    oauthUrl.searchParams.append('access_type', 'offline');
    oauthUrl.searchParams.append('prompt', 'consent');
    oauthUrl.searchParams.append('state', currentProject?.id?.toString() || ''); // Add project ID to state parameter
    
    // Redirecionar na mesma janela em vez de abrir um popup
    window.location.href = oauthUrl.toString();
  };

  // Disconnect a specific integration
  const disconnectIntegration = async (integrationType: string) => {
    if (!currentProject?.id) return;
    
    try {
      const { error } = await supabase
        .from('Integrações')
        .delete()
        .eq('PROJETO id', currentProject.id)
        .eq('Tipo de integração', integrationType);
        
      if (error) throw error;
      
      // Refresh the list
      fetchIntegrations();
      
    } catch (error) {
      console.error(`Error disconnecting ${integrationType}:`, error);
      alert(`Failed to disconnect ${integrationType}. Please try again.`);
    }
  };
  
  // Get a valid access token for YouTube API operations
  const getValidYouTubeToken = async (): Promise<string | null> => {
    try {
      // Agora usamos uma abordagem direta para buscar token válido
      // Verificamos apenas se existe uma integração ativa diretamente
      const { data, error } = await supabase
        .from('Integrações')
        .select('Token, ativo')
        .eq('Tipo de integração', 'youtube')
        .eq('ativo', true)
        .single();
        
      if (error) {
        console.error('Erro ao buscar token do YouTube:', error);
        return null;
      }
      
      // Se a integração está ativa, retornar o token
      if (data && data.ativo) {
        return data.Token || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting valid YouTube token:', error);
      return null;
    }
  };
  
  // Test YouTube API connection - Verificação direta das integrações
  const testYouTubeConnection = async () => {
    try {
      console.log('Testando conexão com YouTube');
      
      // Buscar o status atualizado
      await fetchIntegrations();
      
      // Verificar se a integração está ativa
      const youtubeIntegration = userIntegrations.find(i => i.id === 'youtube');
      
      if (youtubeIntegration && youtubeIntegration.status === 'connected') {
        alert('Conexão com YouTube testada com sucesso!');
        return true;
      } else {
        throw new Error('Integração com YouTube não está disponível');
      }
    } catch (error) {
      console.error('Error testing YouTube connection:', error);
      alert(`Falha no teste de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  };

  // Combine the static integration data with user's integration status
  const combinedIntegrations = integrations.map(integration => {
    const userIntegration = userIntegrations.find(ui => ui.id === integration.id);
    
    if (userIntegration) {
      return {
        ...integration,
        status: userIntegration.status
      };
    }
    
    return integration;
  });

  // Filter integrations based on search and category
  const filteredIntegrations = combinedIntegrations.filter(integration => {
    // Filter by category
    if (activeCategory === 'Connected' && integration.status !== 'connected') return false;
    if (activeCategory === 'Available Soon' && integration.available !== false) return false;
    if (activeCategory === 'Social Media' && !['youtube', 'facebook', 'twitter', 'instagram'].includes(integration.id)) return false;
    
    // Filter by search term
    if (searchTerm && !integration.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !integration.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  const handleConnect = (integration: any) => {
    if (!currentProject?.id) {
      // Verificar se viemos do onboarding e tentar carregar o primeiro projeto disponível
      if (userIntegrations.length === 0) {
        fetchProjects().then(projects => {
          if (projects && projects.length > 0) {
            // Selecionar o primeiro projeto disponível
            const firstProject = projects[0];
            setProjectAndContinue(firstProject, integration);
          } else {
            alert('Please select a project first');
          }
        });
      } else {
        alert('Please select a project first');
      }
      return;
    }
    
    if (!integration.available) {
      alert(`${integration.name} integration is coming soon!`);
      return;
    }
    
    setSelectedIntegration(integration);
    setModalOpen(true);
  };
  
  // Função auxiliar para buscar todos os projetos disponíveis
  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('Projeto')
        .select('*')
        .eq('user', user.email);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error loading projects:", error);
      return [];
    }
  };
  
  // Função para selecionar um projeto e continuar com a conexão
  const setProjectAndContinue = (project: any, integration: any) => {
    // Atualizar o projeto atual no ProjectContext
    if (project?.id) {
      localStorage.setItem('currentProjectId', project.id.toString());
      window.location.reload(); // Recarregar a página para atualizar o contexto do projeto
    }
  };

  const handleAuthorize = () => {
    if (selectedIntegration && selectedIntegration.id === 'youtube') {
      // Close the modal
      setModalOpen(false);
      
      // Start OAuth process
      initiateOAuth();
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setConfirmCheckbox(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      handleCloseModal();
    }
  };

  useEffect(() => {
    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalOpen]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return renderIcon(FaCheck);
      case 'pending': return renderIcon(FaExclamationTriangle);
      default: return null;
    }
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <div>
        {/* Removemos o indicador de carregamento durante autenticação do YouTube 
          para evitar problemas na renderização durante o redirecionamento OAuth */}
        
        {/* Mensagem de sucesso após integração */}
        {showSuccessMessage && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: theme.name === 'dark' ? 'rgba(76, 175, 80, 0.2)' : '#4CAF50',
            color: theme.name === 'dark' ? '#4CAF50' : 'white',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            border: theme.name === 'dark' ? '1px solid rgba(76, 175, 80, 0.3)' : 'none',
            gap: '8px'
          }}>
            {renderIcon(FaCheck)} 
            YouTube integration successfully connected!
          </div>
        )}
        <PageTitle>Integrations</PageTitle>
        
        <SearchContainer>
          <SearchInput 
            placeholder="Search integrations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        
        <Categories>
          {categories.map(category => (
            <CategoryTag 
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </CategoryTag>
          ))}
        </Categories>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            Loading integrations...
          </div>
        ) : (
          <IntegrationsGrid>
            {filteredIntegrations.map((integration, index) => (
              <IntegrationCard 
                key={integration.id} 
                status={integration.status}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <IntegrationHeader>
                  <IntegrationIconContainer>
                    <IntegrationIcon bgColor={integration.bgColor}>
                      {renderIcon(integration.icon)}
                    </IntegrationIcon>
                    {integration.status === 'connected' && (
                      <StatusBadge status={integration.status}>
                        {getStatusIcon(integration.status)}
                      </StatusBadge>
                    )}
                  </IntegrationIconContainer>
                  
                  <IntegrationNameContainer>
                    <IntegrationName>{integration.name}</IntegrationName>
                    {!integration.available ? (
                      <IntegrationStatus status="pending">
                        {renderIcon(FaClock)} Available Soon
                      </IntegrationStatus>
                    ) : (
                      <IntegrationStatus status={integration.status}>
                        {integration.status === 'connected' && renderIcon(FaCheck)}
                        {integration.status === 'pending' && renderIcon(FaExclamationTriangle)}
                        {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                      </IntegrationStatus>
                    )}
                    {/* Message for disconnected YouTube integration */}
                    {integration.id === 'youtube' && integration.status !== 'connected' && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#FF5722', 
                        marginTop: '5px',
                        fontWeight: 500
                      }}>
                        Connect your YouTube account to monitor video comments
                      </div>
                    )}
                  </IntegrationNameContainer>
                </IntegrationHeader>
                
                <IntegrationDescription>
                  {integration.description}
                </IntegrationDescription>
                
                <IntegrationFeatures>
                  {integration.features.map(feature => (
                    <FeatureTag key={feature}>
                      {renderIcon(FaCheck)}
                      {feature}
                    </FeatureTag>
                  ))}
                </IntegrationFeatures>
                
                {/* Connected integration - show test and disconnect buttons */}
                {integration.status === 'connected' && (
                  <>
                    {integration.id === 'youtube' && (
                      <ActionButton 
                        variant="secondary"
                        onClick={testYouTubeConnection}
                        style={{ marginBottom: '10px' }}
                      >
                        Test Connection {renderIcon(FaCheck)}
                      </ActionButton>
                    )}
                    <ActionButton 
                      variant="danger"
                      onClick={() => disconnectIntegration(integration.id)}
                    >
                      Disconnect {renderIcon(FaTimes)}
                    </ActionButton>
                  </>
                )}
                
                {/* Available but not connected - show connect button */}
                {integration.status !== 'connected' && integration.available && (
                  <ActionButton 
                    variant="primary"
                    onClick={() => handleConnect(integration)}
                  >
                    Connect {renderIcon(FaArrowRight)}
                  </ActionButton>
                )}
                
                {/* Coming soon - disabled button */}
                {!integration.available && (
                  <ActionButton 
                    variant="secondary"
                    disabled
                  >
                    Coming Soon {renderIcon(FaClock)}
                  </ActionButton>
                )}
              </IntegrationCard>
            ))}
          </IntegrationsGrid>
        )}
        
        <APICard>
          <APICardContent>
            <APICardHeader>
              <APICardIconWrapper>
                {renderIcon(FaPlug)}
              </APICardIconWrapper>
              <APICardTitle>API Connections</APICardTitle>
            </APICardHeader>
            
            <APICardDescription>
              Integrate with other platforms and services using our API. Direct API access coming soon for custom integrations and advanced workflows.
            </APICardDescription>
            
            <APICardActions>
              <ActionButton variant="secondary" disabled>
                View Documentation {renderIcon(FaArrowRight)}
              </ActionButton>
              <ActionButton variant="primary" disabled>
                Coming Soon {renderIcon(FaClock)}
              </ActionButton>
            </APICardActions>
          </APICardContent>
        </APICard>
      </div>
      
      {modalOpen && selectedIntegration && (
        <ModalOverlay>
          <ModalContent ref={modalRef}>
            <ModalCloseButton onClick={handleCloseModal}>
              {renderIcon(FaTimes)}
            </ModalCloseButton>
            
            <ModalHeader>
              <ModalIconWrapper bgColor={selectedIntegration.bgColor}>
                {renderIcon(selectedIntegration.icon)}
              </ModalIconWrapper>
              <ModalTitle>Connect to {selectedIntegration.name}</ModalTitle>
            </ModalHeader>
            
            <ModalBody>
              <ModalText>
                By connecting your {selectedIntegration.name} account, you allow Liftlio to monitor and interact with your content according to your settings.
              </ModalText>
              
              <ModalInfo>
                <ModalInfoTitle>
                  {renderIcon(FaShieldAlt)} Important Information
                </ModalInfoTitle>
                <ModalText style={{ marginBottom: 0 }}>
                  You will be directed to {selectedIntegration.name} authorization page. Please check all the authorization boxes so that Liftlio can connect to this account.
                </ModalText>
                
                {selectedIntegration.id === 'youtube' && (
                  <ModalText style={{ marginBottom: 0 }}>
                    To enable comment posting, the YouTube account must have made at least two comments through YouTube for the API to work properly.
                  </ModalText>
                )}
              </ModalInfo>
              
              {selectedIntegration.id === 'youtube' && (
                <Checkbox onClick={() => setConfirmCheckbox(!confirmCheckbox)}>
                  <CheckboxInput 
                    type="checkbox" 
                    checked={confirmCheckbox}
                    onChange={() => setConfirmCheckbox(!confirmCheckbox)}
                  />
                  <CheckboxLabel>
                    I confirm that my YouTube account has made at least two comments
                  </CheckboxLabel>
                </Checkbox>
              )}
            </ModalBody>
            
            <ModalFooter>
              <ModalButton variant="secondary" onClick={handleCloseModal}>
                Cancel
              </ModalButton>
              
              <ModalButton 
                variant="primary"
                disabled={selectedIntegration.id === 'youtube' && !confirmCheckbox}
                onClick={handleAuthorize}
              >
                Authorize {renderIcon(FaLock)}
              </ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </IconContext.Provider>
  );
};

export default Integrations;
