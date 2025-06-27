import React from 'react';
import styled from 'styled-components';
import { FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { IconComponent } from '../utils/IconHelper';

const BannerContainer = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 64px; // Below header
  left: 0;
  right: 0;
  z-index: 800;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.95) 0%, rgba(255, 183, 77, 0.95) 100%)' 
    : 'linear-gradient(90deg, rgba(255, 152, 0, 0.98) 0%, rgba(255, 183, 77, 0.98) 100%)'};
  color: #FFFFFF;
  padding: 12px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(${props => props.visible ? '0' : '-100%'});
  transition: transform 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  
  @media (max-width: 768px) {
    top: 60px;
    padding: 10px 16px;
    font-size: ${props => props.theme.fontSizes.xs};
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1200px;
  
  svg {
    font-size: 20px;
    flex-shrink: 0;
  }
`;

const BannerText = styled.div`
  strong {
    font-weight: ${props => props.theme.fontWeights.semiBold};
  }
`;

const SubscriptionWarningBanner: React.FC = () => {
  const { subscription } = useAuth();
  
  // Only show if subscription is cancelled but still has access
  const showBanner = subscription?.has_active_subscription && 
                     subscription?.is_cancelled_with_access;
  
  if (!showBanner) return null;
  
  const accessUntilDate = subscription?.subscription?.next_billing_date 
    ? new Date(subscription.subscription.next_billing_date).toLocaleDateString()
    : 'end of billing period';
  
  return (
    <BannerContainer visible={true}>
      <BannerContent>
        <IconComponent icon={FaInfoCircle} />
        <BannerText>
          Your subscription has been cancelled. You have access until <strong>{accessUntilDate}</strong>. 
          {' '}Consider reactivating to continue using Liftlio without interruption.
        </BannerText>
      </BannerContent>
    </BannerContainer>
  );
};

export default SubscriptionWarningBanner;