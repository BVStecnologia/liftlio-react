import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaYoutube, FaReddit, FaLinkedin, FaFacebook, FaTwitter, FaInstagram, 
         FaPlug, FaCheck, FaExclamationTriangle, FaLock, FaShieldAlt, 
         FaArrowRight, FaTimes, FaSync } from 'react-icons/fa';
import { IconComponent, renderIcon } from '../utils/IconHelper';

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
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
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
    background-color: ${props => props.active ? props.theme.colors.secondary : props.theme.colors.lightGrey};
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
          return props.theme.colors.secondary;
        case 'secondary':
          return 'rgba(94, 53, 177, 0.1)';
        case 'danger':
          return '#d32f2f';
        default:
          return props.theme.colors.secondary;
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
  box-shadow: 0 4px 10px rgba(94, 53, 177, 0.2);
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
  background-color: rgba(94, 53, 177, 0.1);
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

// Dados com recursos adicionais
const integrations = [
  {
    id: 'youtube',
    name: 'Youtube',
    description: 'Monitor YouTube videos and comments. Engage with your audience by responding to comments.',
    icon: FaYoutube,
    bgColor: '#FF0000',
    status: 'connected' as const,
    features: ['Comments', 'Mentions', 'Analytics']
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Track Reddit posts and comments mentioning your product. Engage with communities directly.',
    icon: FaReddit,
    bgColor: '#FF4500',
    status: 'pending' as const,
    features: ['Posts', 'Comments', 'Subreddits']
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Monitor LinkedIn posts and comments. Engage with professional audience.',
    icon: FaLinkedin,
    bgColor: '#0077B5',
    status: 'pending' as const,
    features: ['Posts', 'Comments', 'Company Pages']
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Track Facebook posts and comments. Engage with users on the largest social network.',
    icon: FaFacebook,
    bgColor: '#1877F2',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Pages', 'Groups']
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Monitor tweets and mentions. Engage with users through real-time conversations.',
    icon: FaTwitter,
    bgColor: '#1DA1F2',
    status: 'disconnected' as const,
    features: ['Tweets', 'Mentions', 'Direct Messages']
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Track Instagram posts and comments. Engage with visual-focused audience.',
    icon: FaInstagram,
    bgColor: '#E4405F',
    status: 'disconnected' as const,
    features: ['Posts', 'Comments', 'Stories']
  }
];

const categories = ['All', 'Connected', 'Pending', 'Social Media', 'Analytics', 'Commerce'];

const Integrations: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };

  const filteredIntegrations = integrations.filter(integration => {
    // Filtro por categoria
    if (activeCategory === 'Connected' && integration.status !== 'connected') return false;
    if (activeCategory === 'Pending' && integration.status !== 'pending') return false;
    if (activeCategory === 'Social Media' && !['youtube', 'facebook', 'twitter', 'instagram'].includes(integration.id)) return false;
    
    // Filtro por busca
    if (searchTerm && !integration.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !integration.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  const handleConnect = (integration: any) => {
    setSelectedIntegration(integration);
    setModalOpen(true);
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
                  <StatusBadge status={integration.status}>
                    {getStatusIcon(integration.status)}
                  </StatusBadge>
                </IntegrationIconContainer>
                
                <IntegrationNameContainer>
                  <IntegrationName>{integration.name}</IntegrationName>
                  <IntegrationStatus status={integration.status}>
                    {integration.status === 'connected' && renderIcon(FaCheck)}
                    {integration.status === 'pending' && renderIcon(FaExclamationTriangle)}
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </IntegrationStatus>
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
              
              {integration.status === 'connected' && (
                <ActionButton variant="danger">
                  Disconnect {renderIcon(FaTimes)}
                </ActionButton>
              )}
              
              {integration.status === 'pending' && (
                <ActionButton 
                  variant="primary"
                  onClick={() => handleConnect(integration)}
                >
                  Complete Setup {renderIcon(FaArrowRight)}
                </ActionButton>
              )}
              
              {integration.status === 'disconnected' && (
                <ActionButton 
                  variant="primary"
                  onClick={() => handleConnect(integration)}
                >
                  Connect {renderIcon(FaArrowRight)}
                </ActionButton>
              )}
            </IntegrationCard>
          ))}
        </IntegrationsGrid>
        
        <APICard>
          <APICardContent>
            <APICardHeader>
              <APICardIconWrapper>
                {renderIcon(FaPlug)}
              </APICardIconWrapper>
              <APICardTitle>Available API Connections</APICardTitle>
            </APICardHeader>
            
            <APICardDescription>
              Integrate with other platforms and services using our API. Create custom connections to enhance your monitoring capabilities and client interactions.
            </APICardDescription>
            
            <APICardActions>
              <ActionButton variant="secondary">
                View API Documentation {renderIcon(FaArrowRight)}
              </ActionButton>
              <ActionButton variant="primary">
                Create New Connection {renderIcon(FaPlug)}
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
              <ModalTitle>Connect {selectedIntegration.name}</ModalTitle>
            </ModalHeader>
            
            <ModalBody>
              <ModalText>
                By connecting your {selectedIntegration.name} account, you allow Sales Advocate to monitor and interact with your content according to your settings.
              </ModalText>
              
              <ModalInfo>
                <ModalInfoTitle>
                  {renderIcon(FaShieldAlt)} Important Information
                </ModalInfoTitle>
                <ModalText style={{ marginBottom: 0 }}>
                  You will be directed to {selectedIntegration.name} authorization. Check all the authorization boxes so that Sales Advocate can connect to this account.
                </ModalText>
                
                {selectedIntegration.id === 'youtube' && (
                  <ModalText style={{ marginBottom: 0 }}>
                    To enable comment posting, the YouTube account must have made at least two comments through YouTube for the API to work.
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