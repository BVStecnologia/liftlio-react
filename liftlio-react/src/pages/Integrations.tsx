import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaYoutube, FaReddit, FaLinkedin, FaFacebook, FaTwitter, FaInstagram, 
         FaPlug, FaCheck, FaExclamationTriangle, FaLock, FaShieldAlt, 
         FaArrowRight, FaTimes, FaClock } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabaseClient';
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
  border: 1px solid ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => `${props.theme.colors.primary}33`};
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
  background-color: ${props => props.active ? props.theme.colors.primary : 'white'};
  color: ${props => props.active ? 'white' : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? 'transparent' : props.theme.colors.lightGrey};
  border-radius: 20px;
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
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
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.md};
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
    background: linear-gradient(135deg, transparent 50%, rgba(245, 245, 255, 0.5) 50%);
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
  border: 2px solid white;
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
  color: ${props => props.theme.colors.darkGrey};
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
  background-color: ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
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
        return props.theme.colors.primary;
      case 'secondary':
        return 'transparent';
      case 'danger':
        return props.theme.colors.error;
      default:
        return props.theme.colors.primary;
    }
  }};
  color: ${props => props.variant === 'secondary' ? props.theme.colors.primary : 'white'};
  border: ${props => props.variant === 'secondary' ? `1px solid ${props.theme.colors.primary}` : 'none'};
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
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-top: 4px solid ${props => props.theme.colors.primary};
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
  background: ${props => props.theme.colors.gradient.primary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const APICardDescription = styled.p`
  color: ${props => props.theme.colors.darkGrey};
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
  background-color: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px;
  position: relative;
  animation: ${fadeIn} 0.4s ease;
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
  color: ${props => props.theme.colors.darkGrey};
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
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ModalInfo = styled.div`
  background-color: ${props => `${props.theme.colors.primary}15`};
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
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload"
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
    
    // Verificar status das integrações periodicamente
    const checkInterval = setInterval(() => {
      if (currentProject?.id) {
        console.log('Verificação periódica das integrações...');
        fetchIntegrations();
      }
    }, 300000); // Verificar a cada 5 minutos (aumentado de 1 minuto)
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [currentProject?.id]);

  // Helper functions
  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };

  // Load project integrations
  useEffect(() => {
    if (currentProject?.id) {
      fetchIntegrations();
    } else {
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
    
    // O processamento do código de autorização agora é feito pelo componente OAuthHandler global
    
    // Não precisamos mais monitorar janelas popup, pois estamos redirecionando na mesma página
    
    // Não precisamos mais de limpeza de intervalos para o popup
    return () => {};
  }, [currentProject?.id]);

  // Fetch integrations from Supabase
  const fetchIntegrations = async () => {
    if (!currentProject?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', currentProject.id);
        
      if (error) throw error;
      
      // Map the integration data
      const integrationData: Integration[] = (data || []).map((item: any) => ({
        id: item['Tipo de integração'] || '',
        status: item.ativo ? 'connected' : 'disconnected',
        token: item['Token'] || '',
        refreshToken: item['Refresh token'] || '',
        expiresAt: item['expira em'] || 0,
        lastUpdated: item['Ultima atualização'] || null,
        failureCount: item['falhas_consecutivas'] || 0 // Novo campo para contar falhas
      }));
      
      // Verificar ativamente todas as integrações
      for (const integration of integrationData) {
        if (integration.id === 'youtube' && integration.status === 'connected' && integration.token) {
          // Verificar se o token do YouTube realmente funciona
          console.log('Verificando token do YouTube...');
          try {
            // Fazer uma chamada real à API do YouTube para testar
            const isValid = await testYouTubeTokenAPI(integration.token);
            
            if (!isValid) {
              console.log('Token do YouTube falhou no teste, incrementando contador de falhas');
              
              // Incrementar contador de falhas
              const failureCount = (integration.failureCount || 0) + 1;
              
              // Só desativar após 3 falhas consecutivas
              if (failureCount >= 3) {
                console.log('Token do YouTube falhou 3 vezes consecutivas, desativando integração');
                // Atualizar no banco de dados
                await supabase
                  .from('Integrações')
                  .update({ 
                    'ativo': false,
                    'falhas_consecutivas': 0 // Resetar contador ao desativar
                  })
                  .eq('PROJETO id', currentProject.id)
                  .eq('Tipo de integração', 'youtube');
                  
                // Atualizar localmente
                integration.status = 'disconnected' as const;
              } else {
                // Apenas incrementar contador de falhas
                await supabase
                  .from('Integrações')
                  .update({ 'falhas_consecutivas': failureCount })
                  .eq('PROJETO id', currentProject.id)
                  .eq('Tipo de integração', 'youtube');
                
                integration.failureCount = failureCount;
                console.log(`Falha ${failureCount}/3 - Mantendo integração ativa por enquanto`);
              }
            } else {
              console.log('Token do YouTube válido, resetando contador de falhas');
              // Resetar contador de falhas se o teste foi bem-sucedido
              if ((integration.failureCount || 0) > 0) {
                await supabase
                  .from('Integrações')
                  .update({ 'falhas_consecutivas': 0 })
                  .eq('PROJETO id', currentProject.id)
                  .eq('Tipo de integração', 'youtube');
                  
                integration.failureCount = 0;
              }
            }
          } catch (testError) {
            console.error('Erro ao testar token do YouTube:', testError);
            // Não desativar automaticamente por erros de teste
            // Erros podem ser temporários de rede ou API, não da validade do token
            console.warn('Erro ao testar token, mantendo integração ativa por segurança');
          }
        }
        
        // Verificar e atualizar tokens expirados
        if (integration.status === 'connected' && integration.expiresAt && integration.refreshToken) {
          // Obter a hora da última atualização para verificar se o token expirou
          const lastUpdated = integration.lastUpdated ? new Date(integration.lastUpdated) : null;
          
          // Se não temos lastUpdated, atualizamos o token
          // Ou se lastUpdated + expires_in está a menos de 5 minutos de expirar
          // expiresAt é em segundos e representa a duração, não o timestamp de expiração
          // Por isso calculamos: tempo desde a última atualização + 5 minutos (300s) >= expiresAt
          const timeSinceLastUpdate = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : 0;
          const shouldRefresh = !lastUpdated || (timeSinceLastUpdate + 300 >= integration.expiresAt);
          
          if (shouldRefresh) { // Se o token expira em menos de 5 minutos
            try {
              await refreshToken(integration);
            } catch (refreshError) {
              console.error(`Error refreshing token for ${integration.id}:`, refreshError);
              
              // Incrementar contador de falhas em vez de desativar imediatamente
              const failureCount = (integration.failureCount || 0) + 1;
              
              // Só desativar após 3 falhas consecutivas de refresh
              if (failureCount >= 3) {
                console.log(`Falhas de refresh de token para ${integration.id} atingiram limite (${failureCount}), desativando`);
                await supabase
                  .from('Integrações')
                  .update({ 
                    'ativo': false,
                    'falhas_consecutivas': 0 // Resetar contador
                  })
                  .eq('PROJETO id', currentProject.id)
                  .eq('Tipo de integração', integration.id);
                  
                integration.status = 'disconnected' as const;
              } else {
                // Apenas incrementar contador
                await supabase
                  .from('Integrações')
                  .update({ 'falhas_consecutivas': failureCount })
                  .eq('PROJETO id', currentProject.id)
                  .eq('Tipo de integração', integration.id);
                  
                console.log(`Falha de refresh ${failureCount}/3 para ${integration.id} - Mantendo integração ativa por enquanto`);
              }
            }
          }
        }
      }
      
      setUserIntegrations(integrationData);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para testar efetivamente o token do YouTube com a API
  const testYouTubeTokenAPI = async (token: string): Promise<boolean> => {
    // Implementar sistema de retentativas
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // Fazer uma chamada leve à API do YouTube
        console.log(`Tentativa ${retryCount + 1}/${maxRetries + 1} de validação do token do YouTube`);
        const response = await fetch(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.log(`Tentativa ${retryCount + 1}/${maxRetries + 1} - Erro na API do YouTube:`, errorData);
            
            // Só considerar inválido se for erro específico de autenticação
            if (response.status === 401) {
              console.log('Erro 401 - Token inválido ou expirado');
              return false;
            }
            else if (response.status === 403 && 
                    (errorData.error?.errors?.[0]?.reason === 'authError' || 
                     errorData.error?.errors?.[0]?.reason === 'forbidden')) {
              console.log('Erro 403 - Problema de autorização');
              return false;
            }
            else if (response.status === 429) {
              // Rate limiting - aguardar e tentar novamente
              console.log('Erro 429 - Rate limiting, aguardando...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
              continue;
            } else {
              // Outros códigos (500, etc) - considerar como erro temporário
              console.log(`Erro ${response.status} - Considerando temporário`);
              if (retryCount < maxRetries) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
              return true; // Manter integração ativa em caso de dúvida
            }
          } catch (parseError) {
            console.error('Erro ao processar resposta da API:', parseError);
            // Se não conseguir analisar a resposta, tentar novamente
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            return true; // Em caso de erro de parse, manter token válido
          }
        }
        
        const data = await response.json();
        return data.items && data.items.length > 0;
      } catch (error) {
        console.error(`Tentativa ${retryCount + 1}/${maxRetries + 1} - Erro temporário:`, error);
        // Erro de rede - tentar novamente
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return true; // Após todas as tentativas, manter token como válido
      }
    }
    
    return true; // Em caso de múltiplas falhas não conclusivas, manter integração ativa
  };
  
  // Function to refresh an expired token
  const refreshToken = async (integration: Integration) => {
    if (!integration.refreshToken || !currentProject?.id) return;
    
    try {
      // Endpoint for refreshing tokens
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      
      // Create form data for token refresh request
      const formData = new URLSearchParams();
      formData.append('client_id', GOOGLE_CLIENT_ID);
      formData.append('refresh_token', integration.refreshToken);
      formData.append('grant_type', 'refresh_token');
      
      // Using client secret - Note: In production, this should be done server-side for security
      formData.append('client_secret', GOOGLE_CLIENT_SECRET);
      
      // Make the token refresh request
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
      
      // Parse the response
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      // Armazenar o tempo de expiração diretamente em segundos
      const expiresAt = tokenData.expires_in; // Valor em segundos (ex: 3599)
      
      // Update the integration in Supabase
      const { error } = await supabase
        .from('Integrações')
        .update({
          "Token": tokenData.access_token,
          "expira em": expiresAt,
          "Ultima atualização": new Date().toISOString(),
          "ativo": true
        })
        .eq('PROJETO id', currentProject.id)
        .eq('Tipo de integração', integration.id);
        
      if (error) throw error;
      
      console.log(`${integration.id} token refreshed successfully`);
      
    } catch (error) {
      console.error(`Error refreshing token for ${integration.id}:`, error);
      
      // If the refresh token is invalid, mark the integration as disconnected
      if (error instanceof Error && 
          (error.message.includes('invalid_grant') || error.message.includes('Token has been expired or revoked'))) {
        
        const { error: updateError } = await supabase
          .from('Integrações')
          .update({ "ativo": false })
          .eq('PROJETO id', currentProject.id)
          .eq('Tipo de integração', integration.id);
          
        if (updateError) {
          console.error('Error marking integration as inactive:', updateError);
        }
      }
      
      throw error;
    }
  };

  // O processamento do código de autorização agora é feito pelo componente OAuthHandler global

  // Start OAuth flow for YouTube
  const initiateOAuth = () => {
    if (!currentProject?.id) {
      alert('Please select a project first');
      return;
    }
    
    // Removido verificação de 'recentIntegration'
    
    // Removido setIsAuthenticating(true) para evitar problemas de renderização durante o redirecionamento OAuth
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
    if (!currentProject?.id) return null;
    
    try {
      // Get the YouTube integration
      const youtubeIntegration = userIntegrations.find(
        integration => integration.id === 'youtube' && integration.status === 'connected'
      );
      
      if (!youtubeIntegration) {
        throw new Error('YouTube is not connected');
      }
      
      // Verificar se o token expirou ou está prestes a expirar
      const lastUpdated = youtubeIntegration.lastUpdated ? new Date(youtubeIntegration.lastUpdated) : null;
      
      // Se não temos lastUpdated, consideramos que o token está expirado
      // Caso contrário, verificamos se o tempo desde a última atualização + 5 min está dentro do tempo de expiração
      const timeFromLastUpdate = lastUpdated ? Math.floor(Date.now() / 1000) - Math.floor(lastUpdated.getTime() / 1000) : Infinity;
      const isExpiringSoon = !lastUpdated || (timeFromLastUpdate + 300 >= (youtubeIntegration.expiresAt || 0));
      
      // Se o token é válido e não está prestes a expirar, testar antes de retornar
      if (!isExpiringSoon) { // Ainda tem mais de 5 minutos restantes
        // Verificar se o token realmente funciona
        const isValid = await testYouTubeTokenAPI(youtubeIntegration.token || '');
        
        if (isValid) {
          return youtubeIntegration.token || null;
        } else {
          // Token é inválido mesmo não estando expirado
          console.log('Token teoricamente válido falhou no teste com a API');
          
          // Incrementar contador de falhas em vez de desativar imediatamente
          const failureCount = (youtubeIntegration.failureCount || 0) + 1;
          
          // Só desativar após 3 falhas consecutivas
          if (failureCount >= 3) {
            console.log('Token falhou 3 vezes consecutivas, desativando integração');
            // Atualizar no banco de dados
            await supabase
              .from('Integrações')
              .update({ 
                'ativo': false,
                'falhas_consecutivas': 0 // Resetar contador
              })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
              
            throw new Error('YouTube token is invalid after 3 consecutive failures');
          } else {
            // Apenas incrementar contador
            await supabase
              .from('Integrações')
              .update({ 'falhas_consecutivas': failureCount })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
              
            console.log(`Falha ${failureCount}/3 - Tentando usar o token mesmo assim`);
            // Permitir o uso do token pelo menos uma vez
            return youtubeIntegration.token || null;
          }
        }
      }
      
      // If token is expired or about to expire, refresh it
      if (youtubeIntegration.refreshToken) {
        await refreshToken(youtubeIntegration);
        
        // Get the updated integration data
        const { data, error } = await supabase
          .from('Integrações')
          .select('*')
          .eq('PROJETO id', currentProject.id)
          .eq('Tipo de integração', 'youtube')
          .single();
          
        if (error) throw error;
        
        // Verificar se o token renovado funciona
        const newToken = data['Token'] || null;
        if (newToken) {
          const isValid = await testYouTubeTokenAPI(newToken);
          if (!isValid) {
            // Incrementar contador de falhas em vez de desativar imediatamente
            const failureCount = (data['falhas_consecutivas'] || 0) + 1;
            
            // Só desativar após 3 falhas consecutivas
            if (failureCount >= 3) {
              console.log('Token renovado falhou 3 vezes, desativando integração');
              await supabase
                .from('Integrações')
                .update({ 
                  'ativo': false,
                  'falhas_consecutivas': 0 // Resetar contador
                })
                .eq('PROJETO id', currentProject.id)
                .eq('Tipo de integração', 'youtube');
                
              throw new Error('Refreshed YouTube token is invalid after 3 failures');
            } else {
              // Apenas incrementar contador
              await supabase
                .from('Integrações')
                .update({ 'falhas_consecutivas': failureCount })
                .eq('PROJETO id', currentProject.id)
                .eq('Tipo de integração', 'youtube');
                
              console.log(`Falha ${failureCount}/3 - Tentando usar o token renovado mesmo assim`);
              // Tentar usar o token renovado mesmo após falha
              return newToken;
            }
          } else {
            // Resetar contador em caso de sucesso
            await supabase
              .from('Integrações')
              .update({ 'falhas_consecutivas': 0 })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
          }
        }
        
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting valid YouTube token:', error);
      
      // Forçar atualização das integrações
      setTimeout(() => fetchIntegrations(), 500);
      
      return null;
    }
  };
  
  // Test YouTube API connection
  const testYouTubeConnection = async () => {
    try {
      const token = await getValidYouTubeToken();
      
      if (!token) {
        throw new Error('Could not get a valid YouTube token');
      }
      
      // Sistema de retentativas para testes manuais
      const maxRetries = 2;
      let retryCount = 0;
      let success = false;
      let errorMessage = '';
      
      while (retryCount <= maxRetries && !success) {
        try {
          console.log(`Teste de conexão: Tentativa ${retryCount + 1}/${maxRetries + 1}`);
          
          // Make a simple call to get the authenticated user's channel
          const response = await fetch(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.error || 'Unknown error';
            
            // Verificar se é erro de autenticação (401) ou autorização (403)
            if (response.status === 401 || 
                (response.status === 403 && 
                 (errorData.error?.errors?.[0]?.reason === 'authError' || 
                  errorData.error?.errors?.[0]?.reason === 'forbidden'))) {
              
              console.log(`Erro de autenticação definitivo: ${response.status}`);
              break; // Sair do loop em caso de erro definitivo
            } 
            else if (response.status === 429) {
              // Rate limiting, aguardar mais tempo
              await new Promise(resolve => setTimeout(resolve, 3000));
              retryCount++;
              continue;
            }
            else {
              // Erros 500 ou outros temporários, tentar novamente
              console.log(`Erro temporário (${response.status}), tentando novamente após pausa`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              retryCount++;
              continue;
            }
          }
          
          // Se chegou aqui, a requisição foi bem-sucedida
          const data = await response.json();
          const channelName = data.items[0]?.snippet?.title || 'Unknown Channel';
          
          // Confirmar que a conexão está ativa no banco e resetar contador
          if (currentProject?.id) {
            await supabase
              .from('Integrações')
              .update({ 
                'ativo': true,
                'falhas_consecutivas': 0 
              })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
          }
          
          alert(`Successfully connected to YouTube channel: ${channelName}`);
          success = true;
          return true;
        } catch (retryError) {
          console.error(`Erro na tentativa ${retryCount + 1}:`, retryError);
          errorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
          
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            break;
          }
        }
      }
      
      if (!success) {
        // Só atualizar o status após esgotar todas as tentativas
        // Incrementar contador em vez de desativar imediatamente
        const youtubeIntegration = userIntegrations.find(i => i.id === 'youtube');
        if (youtubeIntegration && currentProject?.id) {
          const failureCount = (youtubeIntegration.failureCount || 0) + 1;
          
          // Só desativar após 3 falhas consecutivas
          if (failureCount >= 3) {
            console.log('Teste manual falhou 3 vezes, desativando integração');
            await supabase
              .from('Integrações')
              .update({ 
                'ativo': false,
                'falhas_consecutivas': 0 
              })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
              
            // Atualizar o estado
            const updatedIntegrations = userIntegrations.map(integration => 
              integration.id === 'youtube' 
                ? {...integration, status: 'disconnected' as const} 
                : integration
            );
            setUserIntegrations(updatedIntegrations);
          } else {
            // Apenas incrementar contador
            await supabase
              .from('Integrações')
              .update({ 'falhas_consecutivas': failureCount })
              .eq('PROJETO id', currentProject.id)
              .eq('Tipo de integração', 'youtube');
              
            console.log(`Falha ${failureCount}/3 - Mantendo integração ativa por enquanto`);
          }
        }
        
        throw new Error(`YouTube API request failed: ${errorMessage}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error testing YouTube connection:', error);
      alert(`YouTube connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Forçar atualização da lista de integrações após falha
      await fetchIntegrations();
      
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
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center'
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
