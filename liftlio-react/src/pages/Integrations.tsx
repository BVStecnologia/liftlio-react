import React from 'react';
import styled from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaYoutube, FaReddit, FaLinkedin, FaFacebook, FaTwitter, FaInstagram, FaPlug, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
`;

const IntegrationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const IntegrationCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const IntegrationHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`;

const IntegrationIcon = styled.div<{ bgColor: string }>`
  width: 40px;
  height: 40px;
  background-color: ${props => props.bgColor};
  border-radius: ${props => props.theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  
  svg {
    color: white;
    font-size: 1.2rem;
  }
`;

const IntegrationName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.lg};
`;

const IntegrationStatus = styled.div<{ status: 'connected' | 'pending' | 'disconnected' }>`
  margin-left: auto;
  font-size: ${props => props.theme.fontSizes.sm};
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
  margin-bottom: 15px;
  line-height: 1.4;
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
  padding: 8px 16px;
  border-radius: ${props => props.theme.radius.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  
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
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Sample data for integrations
const integrations = [
  {
    id: 'youtube',
    name: 'Youtube',
    description: 'Monitor YouTube videos and comments. Engage with your audience by responding to comments.',
    icon: FaYoutube,
    bgColor: '#FF0000',
    status: 'connected' as const
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Track Reddit posts and comments mentioning your product. Engage with communities directly.',
    icon: FaReddit,
    bgColor: '#FF4500',
    status: 'pending' as const
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Monitor LinkedIn posts and comments. Engage with professional audience.',
    icon: FaLinkedin,
    bgColor: '#0077B5',
    status: 'pending' as const
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Track Facebook posts and comments. Engage with users on the largest social network.',
    icon: FaFacebook,
    bgColor: '#1877F2',
    status: 'disconnected' as const
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Monitor tweets and mentions. Engage with users through real-time conversations.',
    icon: FaTwitter,
    bgColor: '#1DA1F2',
    status: 'disconnected' as const
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Track Instagram posts and comments. Engage with visual-focused audience.',
    icon: FaInstagram,
    bgColor: '#E4405F',
    status: 'disconnected' as const
  }
];

const Integrations: React.FC = () => {
  const renderIcon = (IconComponent: React.ComponentType) => {
    return <IconComponent />;
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <div>
        <PageTitle>Integrations</PageTitle>
        
        <IntegrationsGrid>
          {integrations.map(integration => (
            <IntegrationCard key={integration.id}>
              <IntegrationHeader>
                <IntegrationIcon bgColor={integration.bgColor}>
                  {renderIcon(integration.icon)}
                </IntegrationIcon>
                <IntegrationName>{integration.name}</IntegrationName>
                <IntegrationStatus status={integration.status}>
                  {integration.status === 'connected' && renderIcon(FaCheck)}
                  {integration.status === 'pending' && renderIcon(FaExclamationTriangle)}
                  {integration.status}
                </IntegrationStatus>
              </IntegrationHeader>
              
              <IntegrationDescription>
                {integration.description}
              </IntegrationDescription>
              
              {integration.status === 'connected' && (
                <ActionButton variant="danger">Disconnect</ActionButton>
              )}
              
              {integration.status === 'pending' && (
                <ActionButton variant="primary">Complete setup</ActionButton>
              )}
              
              {integration.status === 'disconnected' && (
                <ActionButton variant="primary">Connect</ActionButton>
              )}
            </IntegrationCard>
          ))}
        </IntegrationsGrid>
        
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            {renderIcon(FaPlug)}
            <h2 style={{ marginLeft: '10px' }}>Available API Connections</h2>
          </div>
          
          <p>
            Integrate with other platforms and services using our API. Create custom connections to enhance your monitoring capabilities.
          </p>
          
          <div style={{ marginTop: '20px' }}>
            <ActionButton variant="secondary">View API Documentation</ActionButton>
          </div>
        </Card>
      </div>
    </IconContext.Provider>
  );
};

export default Integrations;