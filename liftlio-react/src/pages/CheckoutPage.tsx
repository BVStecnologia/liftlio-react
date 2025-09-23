import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { renderIcon } from '../utils/IconHelper';
import * as FaIcons from 'react-icons/fa';
import * as HiIcons from 'react-icons/hi';
import SquarePaymentForm from '../components/SquarePaymentForm';
import SuccessModal from '../components/SuccessModal';
import LoadingDataIndicator from '../components/LoadingDataIndicator';

const translations = {
  en: {
    title: 'Complete Your Purchase',
    subtitle: 'Start growing your brand with Liftlio',
    selectedPlan: 'Selected Plan',
    changePlan: 'Change plan',
    plans: {
      starter: {
        name: 'Starter',
        description: 'Perfect to get started',
        price: '$49',
        period: '/month',
        features: [
          '75 brand mentions monthly',
          'in high-engagement discussions',
          '10 Liftlio AI questions per month',
          'Trending topics monitoring'
        ]
      },
      growth: {
        name: 'Growth',
        description: 'Most popular',
        price: '$99',
        period: '/month',
        badge: '⭐ Most Popular',
        features: [
          '200 brand mentions per month',
          'with advanced targeting',
          'Detailed analytics',
          'Approval workflows',
          '30 Liftlio AI questions per month',
          'Trending topics monitoring'
        ]
      },
      scale: {
        name: 'Scale',
        description: 'For large teams',
        price: '$199',
        period: '/month',
        features: [
          '450 brand mentions per month',
          'with full customization',
          '100 Liftlio AI questions per month',
          'Trending topics monitoring'
        ]
      }
    },
    payment: {
      title: 'Payment Information',
      cardNumber: 'Card Number',
      cardNumberPlaceholder: '1234 5678 9012 3456',
      expiry: 'Expiry Date',
      expiryPlaceholder: 'MM/YY',
      cvc: 'CVC',
      cvcPlaceholder: '123',
      name: 'Cardholder Name',
      namePlaceholder: 'John Doe',
      email: 'Email',
      emailPlaceholder: 'john@example.com'
    },
    security: {
      secure: 'Your payment information is secure',
      encryption: '256-bit SSL encryption',
      processed: 'Processed by Square',
      guarantee: '30-day money-back guarantee'
    },
    cta: {
      subscribe: 'Subscribe Now',
      processing: 'Processing...',
      cancel: 'Cancel anytime'
    },
    total: 'Total',
    back: 'Back to plans'
  },
  pt: {
    title: 'Complete sua Compra',
    subtitle: 'Comece a crescer sua marca com o Liftlio',
    selectedPlan: 'Plano Selecionado',
    changePlan: 'Trocar plano',
    plans: {
      starter: {
        name: 'Inicial',
        description: 'Perfeito para começar',
        price: '$49',
        period: '/mês',
        features: [
          '75 menções à marca mensalmente',
          'em discussões de alto engajamento',
          '10 perguntas sobre IA da Liftlio por mês',
          'Monitoramento de tópicos em alta'
        ]
      },
      growth: {
        name: 'Crescimento',
        description: 'Mais popular',
        price: '$99',
        period: '/mês',
        badge: '⭐ Mais Popular',
        features: [
          '200 menções de marca por mês',
          'com segmentação avançada',
          'Análises detalhadas',
          'Fluxos de trabalho de aprovação',
          '30 perguntas sobre IA da Liftlio por mês',
          'Monitoramento de tópicos em alta'
        ]
      },
      scale: {
        name: 'Escala',
        description: 'Para grandes equipes',
        price: '$199',
        period: '/mês',
        features: [
          '450 menções à marca por mês',
          'com personalização completa',
          '100 perguntas sobre IA da Liftlio por mês',
          'Análises detalhadas',
          'Fluxos de trabalho de aprovação',
          'Monitoramento de tópicos em alta'
        ]
      }
    },
    payment: {
      title: 'Informações de Pagamento',
      cardNumber: 'Número do Cartão',
      cardNumberPlaceholder: '1234 5678 9012 3456',
      expiry: 'Validade',
      expiryPlaceholder: 'MM/AA',
      cvc: 'CVC',
      cvcPlaceholder: '123',
      name: 'Nome no Cartão',
      namePlaceholder: 'João Silva',
      email: 'Email',
      emailPlaceholder: 'joao@exemplo.com'
    },
    security: {
      secure: 'Suas informações de pagamento estão seguras',
      encryption: 'Criptografia SSL de 256 bits',
      processed: 'Processado pelo Square',
      guarantee: 'Garantia de reembolso de 30 dias'
    },
    cta: {
      subscribe: 'Assinar Agora',
      processing: 'Processando...',
      cancel: 'Cancele a qualquer momento'
    },
    total: 'Total',
    back: 'Voltar aos planos'
  }
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  padding: 40px 20px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
  position: relative;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.textSecondary};
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const PlanSection = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
`;

const PaymentSection = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PlanCard = styled.div<{ isSelected?: boolean }>`
  background: ${props => props.isSelected ? props.theme.colors.primaryAlpha : 'transparent'};
  border: 2px solid ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.borderLight};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const PlanHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PlanName = styled.h3`
  font-size: 20px;
  font-weight: 600;
`;

const PlanPrice = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: ${props => props.theme.colors.primary};
  
  span {
    font-size: 16px;
    font-weight: 400;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const PlanFeature = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  
  svg {
    color: ${props => props.theme.colors.success};
    flex-shrink: 0;
  }
`;

const Badge = styled.div`
  position: absolute;
  top: -12px;
  right: 24px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  padding: 4px 16px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text.secondary};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 8px;
  font-size: 16px;
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primaryAlpha};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
`;

const SecurityInfo = styled.div`
  background: ${props => `${props.theme.colors.success}15`};
  border: 1px solid ${props => props.theme.colors.success};
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
`;

const SecurityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
  
  &:last-child {
    margin-bottom: 0;
  }
  
  svg {
    color: ${props => props.theme.colors.success};
  }
`;

const TotalSection = styled.div`
  border-top: 1px solid ${props => props.theme.colors.borderLight};
  padding-top: 24px;
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TotalLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
`;

const TotalPrice = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: ${props => props.theme.colors.primary};
  
  span {
    font-size: 16px;
    font-weight: 400;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const CTAButton = styled.button`
  width: 100%;
  padding: 16px 32px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 24px;

  &:hover {
    text-decoration: underline;
  }
`;

const LogoutButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 8px;
  padding: 10px 20px;
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.colors.primaryAlpha};
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkSubscription, subscription, checkingSubscription, signOut } = useAuth();
  const { theme } = useTheme();
  const t = translations.en; // Always use English
  
  // Verificar se está em desenvolvimento
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Get selected plan from navigation state or default to growth
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'scale'>(
    location.state?.plan || 'growth'
  );
  const [loading, setLoading] = useState(false);
  const [useSquareSDK] = useState(true); // Ativar Square SDK
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    plan: string;
    amount: string;
    nextBilling: string;
  } | null>(null);
  const [allowAutoRedirect, setAllowAutoRedirect] = useState(true);
  
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [user, navigate]);
  
  // Verificar se já tem assinatura ativa
  useEffect(() => {
    if (subscription?.has_active_subscription && allowAutoRedirect) {
      // Se já tem assinatura, redireciona para o dashboard
      navigate('/dashboard');
    }
  }, [subscription, navigate, allowAutoRedirect]);
  
  const handlePlanSelect = (plan: 'starter' | 'growth' | 'scale') => {
    setSelectedPlan(plan);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useSquareSDK) {
      // Com Square SDK, precisamos clicar no botão invisível do Square primeiro
      // Tenta várias formas de encontrar o botão do Square
      const squareButton = document.querySelector('#sq-creditcard') as HTMLButtonElement ||
                          document.querySelector('.sq-creditcard') as HTMLButtonElement ||
                          document.querySelector('[data-square-form="true"] button[type="submit"]') as HTMLButtonElement ||
                          document.querySelector('.sq-payment-form button') as HTMLButtonElement;
      
      if (squareButton) {
        console.log('Acionando tokenização do Square...');
        squareButton.click();
        // O token será recebido via handleCardTokenized
        // e então o pagamento será processado automaticamente
        return;
      } else {
        console.error('Botão do Square não encontrado');
        alert('Erro ao processar pagamento. Por favor, tente novamente.');
        return;
      }
    }
    
    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      // TODO: Integrate with Edge Function
      console.log('Payment processed for plan:', selectedPlan);
      console.log('Card token:', cardToken);
      alert(`Pagamento simulado!\nPlano: ${selectedPlan}\nToken: ${cardToken || 'Manual input'}`);
    }, 2000);
  };
  
  const handleCardTokenized = async (token: string) => {
    console.log('=== INÍCIO DO CHECKOUT ===');
    console.log('Card tokenized:', token);
    console.log('Selected plan:', selectedPlan);
    console.log('Is development:', isDevelopment);
    
    setCardToken(token);
    
    // Processar pagamento automaticamente após tokenização
    setLoading(true);
    
    try {
      // Mapear planos para IDs da Edge Function
      const planMapping: Record<string, string> = {
        'starter': 'Plan-1',
        'growth': 'Plan-2',
        'scale': 'Plan-3'
      };
      
      // Sempre em dev quando em localhost
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      const checkoutData = {
        paymentToken: token,
        planId: planMapping[selectedPlan],
        isDev
      };
      
      console.log('Enviando para Edge Function:', checkoutData);
      
      // Importar função de Edge Function
      const { callEdgeFunction } = await import('../lib/supabaseClient');
      
      // Chamar Edge Function
      const data = await callEdgeFunction('create-checkout', checkoutData);
      
      console.log('Resposta da Edge Function:', data);
      
      // Verificar se houve erro (status 429 ou success false)
      if (data.status === 429 || data.success === false) {
        console.error('=== ERRO NO CHECKOUT ===');
        console.error('Erro:', data.error || data.message || 'Erro desconhecido');
        console.error('Dados completos:', data);
        
        // Mensagem de erro mais específica
        const errorMessage = data.error || data.message || 'Erro desconhecido';
        alert(`Error processing payment:\n${errorMessage}\n\nPlease check your information and try again.`);
        setLoading(false);
        return;
      }
      
      console.log('Checkout criado com sucesso:', data);
      
      // Mostrar resumo do sucesso
      if (data?.success) {
        const summary = data.summary;
        
        // Configurar dados do modal
        setSuccessData({
          plan: summary.plan,
          amount: summary.amount,
          nextBilling: summary.nextBilling
        });
        
        // Desabilitar redirecionamento automático antes de mostrar modal
        setAllowAutoRedirect(false);
        
        // Mostrar modal de sucesso
        setShowSuccessModal(true);
        setLoading(false);
        
        // Forçar atualização da assinatura imediatamente
        console.log('Forçando verificação de assinatura após pagamento...');
        await checkSubscription(true); // Force check = true
      } else {
        throw new Error('Resposta inválida da Edge Function');
      }
      
    } catch (err) {
      console.error('Erro no checkout:', err);
      alert('Error creating subscription. Please try again.');
      setLoading(false);
    }
  };
  
  const getPriceValue = (plan: 'starter' | 'growth' | 'scale') => {
    const prices = {
      starter: 49,
      growth: 99,
      scale: 199
    };
    return prices[plan];
  };
  
  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    // Forçar verificação mais uma vez antes de redirecionar
    await checkSubscription(true);
    // Redirecionar para o dashboard
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  if (!user || checkingSubscription) {
    return (
      <Container>
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <LoadingDataIndicator />
        </div>
      </Container>
    );
  }
  
  return (
    <Container>
      <Content>
        <Header>
          <LogoutButton onClick={handleLogout}>
            {renderIcon(FaIcons.FaSignOutAlt)}
            Logout
          </LogoutButton>
          <Title>{t.title}</Title>
          <Subtitle>{t.subtitle}</Subtitle>
        </Header>
        
        <MainContent>
          <PlanSection>
            <BackButton onClick={() => navigate(-1)}>
              ← {t.back}
            </BackButton>
            
            <SectionTitle>
              {renderIcon(HiIcons.HiSparkles)}
              {t.selectedPlan}
            </SectionTitle>
            
            {(['starter', 'growth', 'scale'] as const).map((plan) => (
              <PlanCard
                key={plan}
                isSelected={selectedPlan === plan}
                onClick={() => handlePlanSelect(plan)}
              >
                {plan === 'growth' && <Badge>{t.plans.growth.badge}</Badge>}
                <PlanHeader>
                  <div>
                    <PlanName>{t.plans[plan].name}</PlanName>
                    <div style={{ fontSize: '14px', color: theme.colors.textSecondary }}>
                      {t.plans[plan].description}
                    </div>
                  </div>
                  <PlanPrice>
                    {t.plans[plan].price}<span>{t.plans[plan].period}</span>
                  </PlanPrice>
                </PlanHeader>
                <PlanFeatures>
                  {t.plans[plan].features.map((feature, index) => (
                    <PlanFeature key={index}>
                      {renderIcon(FaIcons.FaCheck)}
                      {feature}
                    </PlanFeature>
                  ))}
                  <PlanFeature>
                    {renderIcon(FaIcons.FaCheck)}
                    <span style={{ fontWeight: 600, color: theme.colors.primary }}>
                      Liftlio Analytics included
                    </span>
                  </PlanFeature>
                </PlanFeatures>
              </PlanCard>
            ))}
          </PlanSection>
          
          <PaymentSection>
            <SectionTitle>
              {renderIcon(FaIcons.FaCreditCard)}
              {t.payment.title}
            </SectionTitle>
            
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>{t.payment.email}</Label>
                <Input
                  type="email"
                  placeholder={t.payment.emailPlaceholder}
                  defaultValue={user.email}
                  required
                />
              </FormGroup>
              
              {useSquareSDK ? (
                <>
                  <SquarePaymentForm
                    onCardTokenized={handleCardTokenized}
                    isLoading={loading}
                  />
                  {isDevelopment && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: theme.colors.primaryAlpha, 
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: theme.colors.text.secondary
                    }}>
                      <strong>Test mode:</strong><br/>
                      Use card: 4111 1111 1111 1111, Date: any future, CVV: 111
                    </div>
                  )}
                </>
              ) : (
                <>
                  <FormGroup>
                    <Label>{t.payment.cardNumber}</Label>
                    <Input
                      type="text"
                      placeholder={t.payment.cardNumberPlaceholder}
                      required
                    />
                  </FormGroup>
                  
                  <FormRow>
                    <FormGroup>
                      <Label>{t.payment.expiry}</Label>
                      <Input
                        type="text"
                        placeholder={t.payment.expiryPlaceholder}
                        required
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>{t.payment.cvc}</Label>
                      <Input
                        type="text"
                        placeholder={t.payment.cvcPlaceholder}
                        required
                      />
                    </FormGroup>
                  </FormRow>
                  
                  <FormGroup>
                    <Label>{t.payment.name}</Label>
                    <Input
                      type="text"
                      placeholder={t.payment.namePlaceholder}
                      required
                    />
                  </FormGroup>
                </>
              )}
              
              <SecurityInfo>
                <SecurityItem>
                  {renderIcon(FaIcons.FaLock)}
                  {t.security.secure}
                </SecurityItem>
                <SecurityItem>
                  {renderIcon(FaIcons.FaShieldAlt)}
                  {t.security.encryption}
                </SecurityItem>
                <SecurityItem>
                  {renderIcon(FaIcons.FaCreditCard)}
                  {t.security.processed}
                </SecurityItem>
              </SecurityInfo>
              
              <TotalSection>
                <TotalLabel>{t.total}</TotalLabel>
                <TotalPrice>
                  ${getPriceValue(selectedPlan)}
                  <span>/month</span>
                </TotalPrice>
              </TotalSection>
              
              {!useSquareSDK && (
                <CTAButton type="submit" disabled={loading}>
                  {renderIcon(FaIcons.FaLock)}
                  {loading ? t.cta.processing : t.cta.subscribe}
                </CTAButton>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: theme.colors.textSecondary }}>
                {t.cta.cancel}
              </div>
            </form>
          </PaymentSection>
        </MainContent>
      </Content>
      
      {/* Modal de Sucesso */}
      {successData && (
        <SuccessModal
          show={showSuccessModal}
          onClose={handleSuccessModalClose}
          planName={successData.plan}
          amount={successData.amount}
          nextBilling={successData.nextBilling}
        />
      )}
    </Container>
  );
};

export default CheckoutPage;