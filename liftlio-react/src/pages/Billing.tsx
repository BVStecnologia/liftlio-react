import React, { useState, useEffect, ReactElement } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { IconType } from 'react-icons';
import { 
  FaCreditCard, FaCrown, FaCalendarAlt, FaCheck, FaInfoCircle,
  FaPlus, FaTimes, FaCheckCircle
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { callRPC, callEdgeFunction } from '../lib/supabaseClient';

// Helper function to render icons safely
const renderIcon = (Icon: IconType | undefined): ReactElement | null => {
  if (!Icon) return null;
  // @ts-ignore - workaround to handle IconType correctly
  return <Icon />;
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

// Styled Components
const PageContainer = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  position: relative;
  
  &::after {
    content: '';
    display: block;
    width: 60px;
    height: 4px;
    background: ${props => props.theme.colors.gradient.primary};
    margin-top: 8px;
    border-radius: 2px;
  }
`;

const ContentContainer = styled.div`
  display: grid;
  gap: 30px;
`;

// Subscription Section Components
const SubscriptionSection = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? `linear-gradient(135deg, rgba(94, 53, 177, 0.1) 0%, rgba(94, 53, 177, 0.05) 100%)`
    : `linear-gradient(135deg, rgba(94, 53, 177, 0.05) 0%, rgba(94, 53, 177, 0.02) 100%)`};
  border-radius: ${props => props.theme.radius.lg};
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(94, 53, 177, 0.3)' 
    : 'rgba(94, 53, 177, 0.1)'};
`;

const SubscriptionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const SubscriptionTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const SubscriptionBadge = styled.div<{ status: 'active' | 'inactive' | 'trial' | 'cancelled' }>`
  padding: 6px 16px;
  border-radius: 20px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return css`
          background: ${props.theme.name === 'dark' 
            ? 'rgba(76, 175, 80, 0.2)' 
            : 'rgba(76, 175, 80, 0.1)'};
          color: #4CAF50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        `;
      case 'trial':
        return css`
          background: ${props.theme.name === 'dark' 
            ? 'rgba(33, 150, 243, 0.2)' 
            : 'rgba(33, 150, 243, 0.1)'};
          color: #2196F3;
          border: 1px solid rgba(33, 150, 243, 0.3);
        `;
      case 'cancelled':
        return css`
          background: ${props.theme.name === 'dark' 
            ? 'rgba(255, 152, 0, 0.2)' 
            : 'rgba(255, 152, 0, 0.1)'};
          color: #FF9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        `;
      default:
        return css`
          background: ${props.theme.name === 'dark' 
            ? 'rgba(158, 158, 158, 0.2)' 
            : 'rgba(158, 158, 158, 0.1)'};
          color: #9E9E9E;
          border: 1px solid rgba(158, 158, 158, 0.3);
        `;
    }
  }}
`;

const SubscriptionDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const SubscriptionItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SubscriptionLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const SubscriptionValue = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SubscriptionActions = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.1)'};
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const CancelledWarning = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 152, 0, 0.15)' 
    : 'rgba(255, 152, 0, 0.1)'};
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: ${props => props.theme.radius.md};
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${props => props.theme.name === 'dark' ? '#FFB74D' : '#F57C00'};
  font-size: ${props => props.theme.fontSizes.sm};
  
  svg {
    font-size: 18px;
    flex-shrink: 0;
  }
`;

// Payment Cards Section Components
const PaymentCardsSection = styled.div`
  margin-top: 30px;
`;

const PaymentCardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`;

const PaymentCard = styled.div<{ isDefault?: boolean; isSubscriptionCard?: boolean; isClickable?: boolean }>`
  background: ${props => props.isDefault 
    ? props.theme.name === 'dark' 
      ? 'rgba(94, 53, 177, 0.15)' 
      : 'rgba(94, 53, 177, 0.08)'
    : props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.02)'
  };
  border: 1px solid ${props => props.isDefault
    ? 'rgba(94, 53, 177, 0.3)'
    : props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)'
  };
  border-radius: ${props => props.theme.radius.md};
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  cursor: ${props => props.isClickable ? 'pointer' : 'default'};
  
  ${props => props.isClickable && css`
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: rgba(94, 53, 177, 0.5);
    }
  `}
`;

const CardInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CardBrand = styled.div`
  font-size: 24px;
`;

const CardDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CardNumber = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text.primary};
`;

const CardExpiry = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardBadges = styled.div`
  display: flex;
  gap: 8px;
`;

const CardBadge = styled.div<{ variant: 'default' | 'primary' }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  
  ${props => props.variant === 'default' && css`
    background: rgba(94, 53, 177, 0.2);
    color: #6B46C1;
  `}
  
  ${props => props.variant === 'primary' && css`
    background: ${props.theme.name === 'dark' 
      ? 'rgba(158, 158, 158, 0.2)' 
      : 'rgba(158, 158, 158, 0.1)'};
    color: #9E9E9E;
  `}
`;

const SetDefaultIcon = styled.div<{ isHovered?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.isHovered 
    ? 'rgba(94, 53, 177, 0.2)' 
    : 'transparent'};
  color: ${props => props.isHovered 
    ? '#6B46C1' 
    : props.theme.colors.text.secondary};
  transition: all 0.2s ease;
  
  svg {
    font-size: 16px;
  }
`;

// Action Button Component
const ActionButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' && css`
    background: ${props.theme.colors.gradient.primary};
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(94, 53, 177, 0.3);
    }
  `}
  
  ${props => props.variant === 'secondary' && css`
    background: ${props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.05)'};
    color: ${props.theme.colors.text.primary};
    
    &:hover:not(:disabled) {
      background: ${props.theme.name === 'dark' 
        ? 'rgba(255, 255, 255, 0.15)' 
        : 'rgba(0, 0, 0, 0.08)'};
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Modal Components
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.radius.lg};
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
    transform: rotate(90deg);
  }
`;

// Main Billing Component
const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { subscription, checkSubscription } = useAuth();
  const { language } = useLanguage();
  
  // State for subscription management
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(false);
  
  // State for payment cards
  const [userCards, setUserCards] = useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Load payment cards
  useEffect(() => {
    loadPaymentCards();
  }, []);

  const loadPaymentCards = async () => {
    try {
      setIsLoadingCards(true);
      console.log('Loading payment cards...');
      const result = await callRPC('get_user_cards', {});
      console.log('Payment methods result:', result);
      
      if (result.error) {
        console.error('Error loading cards:', result.error);
        return;
      }
      
      // Handle different response formats
      let cards = [];
      if (Array.isArray(result)) {
        cards = result;
      } else if (result && typeof result === 'object') {
        if (result.data) {
          cards = result.data;
        } else if (result.cards) {
          cards = result.cards;
        }
      }
      
      console.log('Cards to display:', cards);
      setUserCards(cards || []);
    } catch (error) {
      console.error('Error loading payment cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleToggleSubscription = async () => {
    setIsTogglingSubscription(true);
    
    try {
      const data = await callRPC('toggle_user_subscription', {});
      
      if (data.success) {
        if (data.action === 'cancelled') {
          alert(`Subscription cancelled. You have access until ${new Date(data.active_until).toLocaleDateString()}`);
        } else {
          alert('Subscription reactivated! It will renew automatically.');
        }
        // Reload subscription data
        await checkSubscription(true);
        // Reload payment cards
        await loadPaymentCards();
      } else {
        alert(data.message || 'Error processing your request');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Error processing your request. Please try again.');
    } finally {
      setIsTogglingSubscription(false);
    }
  };

  const handleSetDefaultCard = async (cardId: number) => {
    try {
      setIsSettingDefault(cardId);
      
      const result = await callRPC('set_default_card', { 
        p_card_id: cardId 
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to set default payment method');
      }
      
      if (result.success) {
        // Reload cards to reflect changes
        await loadPaymentCards();
        
        // Refresh subscription if it was updated
        if (result.subscription_updated) {
          await checkSubscription(true);
        }
      } else {
        throw new Error(result.message || 'Failed to set default payment method');
      }
      
    } catch (error) {
      console.error('Error setting default card:', error);
      alert('Failed to set default payment method');
    } finally {
      setIsSettingDefault(null);
    }
  };

  const handleCardTokenized = async (token: string) => {
    console.log('Card tokenized:', token);
    setIsAddingCard(true);
    
    try {
      // Check if we're in development
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // Call edge function to save card
      const data = await callEdgeFunction('save-card', {
        paymentToken: token,
        isDev
      });
      
      if (data.success) {
        alert('Card added successfully!');
        // Reload cards list
        await loadPaymentCards();
        // Close modal
        setShowAddCardModal(false);
      } else {
        alert(data.message || 'Error adding card. Please try again.');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Error adding card. Please try again.');
    } finally {
      setIsAddingCard(false);
    }
  };

  return (
    <IconContext.Provider value={{ style: { verticalAlign: 'middle', display: 'inline-flex' } }}>
      <PageContainer>
        <PageHeader>
          <PageTitle>Billing & Subscription</PageTitle>
        </PageHeader>
        
        <ContentContainer>
          <Card>
            {/* Subscription Information */}
            <SubscriptionSection>
              <SubscriptionHeader>
                <SubscriptionTitle>
                  {renderIcon(FaCrown)}
                  Subscription Plan
                </SubscriptionTitle>
                {subscription?.has_active_subscription && (
                  <SubscriptionBadge status={
                    subscription.is_cancelled_with_access ? 'cancelled' : 
                    subscription.subscription.is_in_grace_period ? 'trial' : 
                    'active'
                  }>
                    {renderIcon(FaCheck)}
                    {subscription.is_cancelled_with_access ? 'Cancelled' : 
                     subscription.subscription.is_in_grace_period ? 'Trial' : 
                     'Active'}
                  </SubscriptionBadge>
                )}
              </SubscriptionHeader>
              
              {subscription?.has_active_subscription ? (
                <>
                  {subscription.is_cancelled_with_access && (
                    <CancelledWarning>
                      {renderIcon(FaInfoCircle)}
                      <div>
                        Your subscription has been cancelled. You have access until{' '}
                        <strong>{new Date(subscription.subscription.next_billing_date).toLocaleDateString()}</strong>
                      </div>
                    </CancelledWarning>
                  )}
                  <SubscriptionDetails>
                    <SubscriptionItem>
                      <SubscriptionLabel>Plan</SubscriptionLabel>
                      <SubscriptionValue>
                        {subscription.subscription.plan_name}
                        {subscription.subscription.plan_name === 'Starter' && ' - $49/mo'}
                        {subscription.subscription.plan_name === 'Growth' && ' - $99/mo'}
                        {subscription.subscription.plan_name === 'Scale' && ' - $199/mo'}
                      </SubscriptionValue>
                    </SubscriptionItem>
                    
                    <SubscriptionItem>
                      <SubscriptionLabel>Mentions Available</SubscriptionLabel>
                      <SubscriptionValue>
                        {subscription.mentions_available} / {subscription.subscription.mentions_limit}
                      </SubscriptionValue>
                    </SubscriptionItem>
                    
                    <SubscriptionItem>
                      <SubscriptionLabel>
                        {subscription.is_cancelled_with_access ? 'Access Until' : 'Next Billing Date'}
                      </SubscriptionLabel>
                      <SubscriptionValue>
                        {renderIcon(FaCalendarAlt)}
                        {new Date(subscription.subscription.next_billing_date).toLocaleDateString()}
                        {subscription.is_cancelled_with_access && subscription.subscription.days_until_billing === 0 && 
                          ' (No future charges)'}
                      </SubscriptionValue>
                    </SubscriptionItem>
                    
                    <SubscriptionItem>
                      <SubscriptionLabel>Environment</SubscriptionLabel>
                      <SubscriptionValue>
                        {subscription.subscription.is_production ? 'Production' : 'Development'}
                      </SubscriptionValue>
                    </SubscriptionItem>
                  </SubscriptionDetails>
                  
                  <SubscriptionActions>
                    <ActionButton 
                      variant="primary"
                      onClick={() => navigate('/checkout')}
                    >
                      {renderIcon(FaCreditCard)}
                      Upgrade Plan
                    </ActionButton>
                    
                    <ActionButton 
                      variant="secondary"
                      onClick={handleToggleSubscription}
                      disabled={isTogglingSubscription}
                    >
                      {isTogglingSubscription ? (
                        'Processing...'
                      ) : (
                        subscription.is_cancelled_with_access ? 'Reactivate Subscription' : 'Cancel Subscription'
                      )}
                    </ActionButton>
                  </SubscriptionActions>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ marginBottom: '20px', color: theme.colors.text.secondary }}>
                    You don't have an active subscription
                  </div>
                  <ActionButton 
                    variant="primary"
                    onClick={() => navigate('/checkout')}
                  >
                    {renderIcon(FaCreditCard)}
                    Subscribe Now
                  </ActionButton>
                </div>
              )}
            </SubscriptionSection>
            
            {/* Payment Methods Section */}
            <PaymentCardsSection>
              <SubscriptionTitle>
                {renderIcon(FaCreditCard)}
                Payment Methods
              </SubscriptionTitle>
              
              {isLoadingCards ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  Loading payment methods...
                </div>
              ) : userCards.length > 0 ? (
                <PaymentCardsList>
                  {userCards.map((card) => (
                    <PaymentCard 
                      key={card.id}
                      isDefault={card.is_default}
                      isSubscriptionCard={card.is_subscription_card}
                      isClickable={!card.is_default && card.is_active}
                      onClick={() => {
                        if (!card.is_default && card.is_active && !isSettingDefault) {
                          handleSetDefaultCard(card.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredCard(card.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <CardInfo>
                        <CardBrand>
                          {card.brand === 'VISA' && '💳'}
                          {card.brand === 'MASTERCARD' && '💳'}
                          {card.brand === 'AMEX' && '💳'}
                          {card.brand === 'DISCOVER' && '💳'}
                        </CardBrand>
                        <CardDetails>
                          <CardNumber>
                            {card.brand} •••• {card.last_4}
                          </CardNumber>
                          <CardExpiry>
                            Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                          </CardExpiry>
                        </CardDetails>
                      </CardInfo>
                      <CardActions>
                        <CardBadges>
                          {card.is_default && (
                            <CardBadge variant="default">Default</CardBadge>
                          )}
                          {!card.is_active && (
                            <CardBadge variant="primary">Inactive</CardBadge>
                          )}
                        </CardBadges>
                        {!card.is_default && card.is_active && (
                          <SetDefaultIcon 
                            isHovered={hoveredCard === card.id}
                            title="Click to set as default payment method"
                          >
                            {isSettingDefault === card.id ? (
                              <Spinner />
                            ) : (
                              renderIcon(FaCheckCircle)
                            )}
                          </SetDefaultIcon>
                        )}
                      </CardActions>
                    </PaymentCard>
                  ))}
                </PaymentCardsList>
              ) : (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center',
                  background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: theme.radius.md,
                  color: theme.colors.text.secondary
                }}>
                  No payment methods found
                </div>
              )}
              
              <div style={{ marginTop: '16px' }}>
                <ActionButton 
                  variant="secondary"
                  onClick={() => setShowAddCardModal(true)}
                >
                  {renderIcon(FaPlus)}
                  Add Payment Method
                </ActionButton>
              </div>
            </PaymentCardsSection>
          </Card>
        </ContentContainer>
        
        {/* Add Card Modal */}
        {showAddCardModal && (
          <Modal onClick={() => !isAddingCard && setShowAddCardModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Add Payment Method</ModalTitle>
                {!isAddingCard && (
                  <CloseButton onClick={() => setShowAddCardModal(false)}>
                    {renderIcon(FaTimes)}
                  </CloseButton>
                )}
              </ModalHeader>
              
              <div style={{ padding: '20px 0' }}>
                <p style={{ 
                  marginBottom: '20px', 
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSizes.sm,
                  lineHeight: '1.5'
                }}>
                  Add a new payment method to your account. This card can be used for future payments.
                </p>
                
                {/* Dynamically import and render SquarePaymentForm */}
                <div style={{
                  background: theme.name === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: theme.radius.md,
                  padding: '20px',
                  border: `1px solid ${theme.name === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)'}`
                }}>
                  <React.Suspense fallback={
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: theme.colors.text.secondary
                    }}>
                      Loading payment form...
                    </div>
                  }>
                    <SquarePaymentFormWrapper
                      onCardTokenized={handleCardTokenized}
                      isLoading={isAddingCard}
                      processingText={language === 'pt' ? 'Salvando cartão...' : 'Saving card...'}
                      buttonText={language === 'pt' ? 'Adicionar Cartão' : 'Add Card'}
                    />
                  </React.Suspense>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}
      </PageContainer>
    </IconContext.Provider>
  );
};

// Wrapper component to handle dynamic import of SquarePaymentForm
const SquarePaymentFormWrapper: React.FC<{
  onCardTokenized: (token: string) => void;
  isLoading: boolean;
  processingText?: string;
  buttonText?: string;
}> = ({ onCardTokenized, isLoading, processingText, buttonText }) => {
  const [SquarePaymentForm, setSquarePaymentForm] = useState<any>(null);
  
  useEffect(() => {
    import('../components/SquarePaymentForm').then(module => {
      setSquarePaymentForm(() => module.default);
    });
  }, []);
  
  if (!SquarePaymentForm) {
    return <div>Loading payment form...</div>;
  }
  
  return (
    <SquarePaymentForm
      onCardTokenized={onCardTokenized}
      isLoading={isLoading}
      processingText={processingText}
      buttonText={buttonText}
    />
  );
};

export default Billing;