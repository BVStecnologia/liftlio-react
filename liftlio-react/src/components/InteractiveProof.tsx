import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaArrowRight, FaSpinner, FaYoutube, FaUser, FaRobot, FaChartLine, FaSearch, FaComments, FaBrain, FaGlobe, FaInfoCircle } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';
import { callEdgeFunction } from '../lib/supabaseClient';

const translations = {
  en: {
    title: "See Liftlio in action with your product",
    subtitle: "Free trial. No signup. See a real simulation now.",
    placeholder: "Enter your website URL...",
    tooltip: "For best results, use a page with detailed content about your product or service. Landing pages with clear value propositions work best!",
    button: "Show Me How Liftlio Works",
    loading: "Analyzing your market...",
    loadingSteps: [
      "Reading your website content...",
      "Understanding your product...",
      "Analyzing your market niche...",
      "Searching YouTube discussions...",
      "Finding potential customers...",
      "Identifying pain points...",
      "Generating personalized response...",
      "Finalizing simulation..."
    ],
    error: "Error generating simulation. Please try again.",
    errors: {
      invalidUrl: "Please enter a valid URL (e.g., https://example.com)",
      unreachable: "Unable to access this website. Please check the URL and try again.",
      generic: "Error generating simulation. Please try again."
    },
    videoFound: "Video Found",
    leadComment: "Potential Customer Comment",
    liftlioResponse: "Liftlio's Response",
    metrics: {
      leadScore: "Lead Score",
      sentiment: "Sentiment",
      relevance: "Relevance"
    }
  },
  pt: {
    title: "Veja o Liftlio em ação com seu produto",
    subtitle: "Teste grátis. Sem cadastro. Veja uma simulação real agora.",
    placeholder: "Digite a URL do seu site...",
    tooltip: "Para melhores resultados, use uma página com conteúdo detalhado sobre seu produto ou serviço. Landing pages com propostas de valor claras funcionam melhor!",
    button: "Mostre Como o Liftlio Funciona",
    loading: "Analisando seu mercado...",
    loadingSteps: [
      "Lendo o conteúdo do seu site...",
      "Entendendo seu produto...",
      "Analisando seu nicho de mercado...",
      "Buscando discussões no YouTube...",
      "Encontrando clientes potenciais...",
      "Identificando pontos de dor...",
      "Gerando resposta personalizada...",
      "Finalizando simulação..."
    ],
    error: "Erro ao gerar simulação. Por favor, tente novamente.",
    errors: {
      invalidUrl: "Por favor, insira uma URL válida (ex: https://exemplo.com)",
      unreachable: "Não foi possível acessar este site. Verifique a URL e tente novamente.",
      generic: "Erro ao gerar simulação. Por favor, tente novamente."
    },
    videoFound: "Vídeo Encontrado",
    leadComment: "Comentário de Cliente Potencial",
    liftlioResponse: "Resposta do Liftlio",
    metrics: {
      leadScore: "Pontuação de Lead",
      sentiment: "Sentimento",
      relevance: "Relevância"
    }
  }
};

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.3; }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const wave = keyframes`
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  30% {
    transform: scale(1.3);
    opacity: 1;
  }
`;

const Container = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.background};
  position: relative;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const Content = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 24px;
  letter-spacing: -1px;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 48px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  position: relative;
  
  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const InputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const TooltipIcon = styled.div`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.textSecondary};
  cursor: help;
  transition: color 0.3s ease;
  font-size: 18px;
  z-index: 1;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const Tooltip = styled.div<{ show: boolean }>`
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 8px;
  padding: 12px 16px;
  max-width: 300px;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text.primary};
  box-shadow: 0 4px 20px ${props => props.theme.colors.shadowMedium};
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transform: translateY(${props => props.show ? '0' : '10px'});
  transition: all 0.3s ease;
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    right: 20px;
    border: 8px solid transparent;
    border-top-color: ${props => props.theme.colors.cardBg};
  }
  
  @media (max-width: 640px) {
    right: auto;
    left: 0;
    
    &::after {
      right: auto;
      left: 20px;
    }
  }
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 16px 48px 16px 24px;
  font-size: 16px;
  border: 2px solid ${props => props.hasError ? '#ff4444' : props.theme.colors.borderLight};
  border-radius: 8px;
  background: ${props => props.theme.colors.cardBg};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ff4444' : props.theme.colors.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const Button = styled.button`
  padding: 16px 32px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  .fa-spin {
    animation: ${spin} 1s linear infinite;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.primaryAlpha};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

const LoadingContainer = styled.div`
  padding: 60px;
  text-align: center;
  position: relative;
  background: ${props => props.theme.colors.cardBg};
  border-radius: 16px;
  margin: 40px auto;
  max-width: 600px;
  box-shadow: 0 10px 40px ${props => props.theme.colors.shadowMedium};
  
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(45deg, #4F46E5, #7C3AED, #EC4899, #4F46E5);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    background-size: 300% 300%;
    animation: gradientMove 3s ease infinite;
  }
  
  @keyframes gradientMove {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const LoadingText = styled.div`
  font-size: 18px;
  color: ${props => props.theme.colors.text.primary};
  margin-top: 20px;
  animation: ${fadeIn} 0.5s ease-out;
  min-height: 24px;
  position: relative;
  z-index: 1;
`;

const LoadingProgress = styled.div`
  width: 100%;
  max-width: 400px;
  height: 6px;
  background: ${props => props.theme.colors.borderLight};
  border-radius: 3px;
  margin: 20px auto;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
`;

const LoadingProgressBar = styled.div<{ progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.progress}%;
  background: ${props => props.theme.colors.gradient.landing};
  transition: width 0.8s ease-out;
  border-radius: 2px;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.4));
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-40px); }
    100% { transform: translateX(40px); }
  }
`;

const LoadingDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
`;

const LoadingDot = styled.div<{ delay: number }>`
  width: 20px;
  height: 20px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 50%;
  animation: ${wave} 1.5s infinite;
  animation-delay: ${props => props.delay}s;
`;

const LoadingIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
  animation: ${slideIn} 0.5s ease-out;
  color: ${props => props.theme.colors.primary};
  position: relative;
  z-index: 1;
  
  svg {
    animation: ${spin} 2s linear infinite;
  }
`;

const LoadingStepIcon = styled.div<{ isActive: boolean }>`
  font-size: 24px;
  color: ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.textSecondary};
  transition: all 0.3s ease;
  transform: ${props => props.isActive ? 'scale(1.2)' : 'scale(1)'};
  margin-right: 12px;
  display: inline-block;
`;

const SimulationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Card = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 24px;
  text-align: left;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const VideoInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const VideoTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  flex: 1;
`;

const VideoStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const CommentText = styled.div`
  font-size: 16px;
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.6;
  padding: 16px;
  background: ${props => props.theme.colors.metricCardBg};
  border-radius: 8px;
  margin-bottom: 12px;
`;

const MetricsRow = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 12px;
`;

const Metric = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MetricLabel = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
`;

const MetricValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

const ResponseText = styled(CommentText)`
  border-left: 4px solid ${props => props.theme.colors.primary};
`;

const JustificationText = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  margin-top: 8px;
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  padding: 16px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
`;

const InteractiveProof: React.FC = () => {
  const { language } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const t = translations[language as keyof typeof translations];

  const normalizeUrl = (inputUrl: string): string => {
    let normalizedUrl = inputUrl.trim();
    
    // Add https:// if no protocol is specified
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    return normalizedUrl;
  };

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      // Check if it has a valid domain
      return urlObj.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Normalize URL (add protocol if missing)
    const normalizedUrl = normalizeUrl(url);
    
    // Validate normalized URL
    if (!validateUrl(normalizedUrl)) {
      setError(t.errors.invalidUrl);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(0);

    try {
      // Start loading animation
      let currentStep = 0;
      const totalSteps = t.loadingSteps.length;
      const minStepTime = 800; // Minimum time per step
      const maxStepTime = 1500; // Maximum time per step
      
      const stepInterval = setInterval(() => {
        if (currentStep < totalSteps - 1) {
          currentStep++;
          setLoadingStep(currentStep);
        }
      }, Math.floor(Math.random() * (maxStepTime - minStepTime) + minStepTime));

      // Call edge function
      const startTime = Date.now();
      const response = await callEdgeFunction('analyze-url', {
        url: normalizedUrl,
        language: language
      });
      
      // Ensure minimum loading time for better UX
      const elapsedTime = Date.now() - startTime;
      const minimumLoadingTime = totalSteps * minStepTime;
      
      if (elapsedTime < minimumLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
      }
      
      // Complete all remaining steps quickly
      for (let i = currentStep; i < totalSteps; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      clearInterval(stepInterval);
      
      if (response.success && response.simulation) {
        setResult(response);
      } else {
        // Handle specific error types
        const errorMessage = response.error || '';
        if (errorMessage.includes('Jina AI error') || errorMessage.includes('fetch')) {
          setError(t.errors.unreachable);
        } else {
          setError(t.errors.generic);
        }
      }
    } catch (err) {
      console.error('Error calling edge function:', err);
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(num);
  };

  return (
    <Container>
      <Content>
        <Title>{t.title}</Title>
        <Subtitle>{t.subtitle}</Subtitle>
        
        <form onSubmit={handleSubmit}>
          <InputContainer>
            <InputWrapper>
              <Input
                type="text"
                placeholder={t.placeholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null); // Clear error when user types
                }}
                required
                disabled={loading}
                hasError={!!error}
              />
              <TooltipIcon 
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
              >
                {renderIcon(FaInfoCircle)}
              </TooltipIcon>
              <Tooltip show={showTooltip}>
                {t.tooltip}
              </Tooltip>
            </InputWrapper>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="fa-spin">{renderIcon(FaSpinner)}</span>
                  {t.loading}
                </>
              ) : (
                <>
                  {t.button}
                  {renderIcon(FaArrowRight)}
                </>
              )}
            </Button>
          </InputContainer>
        </form>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        {loading && (
          <LoadingContainer>
            <LoadingDots>
              <LoadingDot delay={0} />
              <LoadingDot delay={0.2} />
              <LoadingDot delay={0.4} />
            </LoadingDots>
            
            <LoadingIcon>
              {loadingStep === 0 && renderIcon(FaGlobe)}
              {loadingStep === 1 && renderIcon(FaSearch)}
              {loadingStep === 2 && renderIcon(FaBrain)}
              {loadingStep === 3 && renderIcon(FaYoutube)}
              {loadingStep === 4 && renderIcon(FaComments)}
              {loadingStep === 5 && renderIcon(FaUser)}
              {loadingStep === 6 && renderIcon(FaRobot)}
              {loadingStep >= 7 && renderIcon(FaChartLine)}
            </LoadingIcon>
            
            <LoadingProgress>
              <LoadingProgressBar progress={(loadingStep + 1) / t.loadingSteps.length * 100} />
            </LoadingProgress>
            
            <LoadingText>
              <LoadingStepIcon isActive={true}>
                {loadingStep < 2 && '🔍'}
                {loadingStep >= 2 && loadingStep < 4 && '🎬'}
                {loadingStep >= 4 && loadingStep < 6 && '💬'}
                {loadingStep >= 6 && '🤖'}
              </LoadingStepIcon>
              {t.loadingSteps[loadingStep]}
            </LoadingText>
          </LoadingContainer>
        )}
        
        {result && result.simulation && (
          <SimulationContainer>
            {/* Video Found */}
            <Card>
              <CardHeader>
                <CardIcon>{renderIcon(FaYoutube)}</CardIcon>
                <CardTitle>{t.videoFound}</CardTitle>
              </CardHeader>
              <VideoInfo>
                <VideoTitle>{result.simulation.video.title}</VideoTitle>
              </VideoInfo>
              <VideoStats>
                <span>{formatNumber(result.simulation.video.views)} views</span>
                <span>{formatNumber(result.simulation.video.comments)} comments</span>
                <span>{result.simulation.video.category}</span>
              </VideoStats>
            </Card>

            {/* Lead Comment */}
            <Card>
              <CardHeader>
                <CardIcon>{renderIcon(FaUser)}</CardIcon>
                <CardTitle>{t.leadComment}</CardTitle>
              </CardHeader>
              <CommentText>"{result.simulation.lead_comment.text}"</CommentText>
              <MetricsRow>
                <Metric>
                  <MetricLabel>{t.metrics.leadScore}:</MetricLabel>
                  <MetricValue>{result.simulation.lead_comment.lead_score}/10</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>{t.metrics.sentiment}:</MetricLabel>
                  <MetricValue>{language === 'pt' && result.simulation.lead_comment.sentiment === 'seeking_solution' ? 'buscando_solução' : result.simulation.lead_comment.sentiment}</MetricValue>
                </Metric>
              </MetricsRow>
              <JustificationText>{result.simulation.lead_comment.justification}</JustificationText>
            </Card>

            {/* Liftlio Response */}
            <Card>
              <CardHeader>
                <CardIcon>{renderIcon(FaRobot)}</CardIcon>
                <CardTitle>{t.liftlioResponse}</CardTitle>
              </CardHeader>
              <ResponseText>{result.simulation.liftlio_response.message}</ResponseText>
              <MetricsRow>
                <Metric>
                  <MetricLabel>{t.metrics.sentiment}:</MetricLabel>
                  <MetricValue>{Math.round(result.simulation.liftlio_response.sentiment_score * 100)}%</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>{t.metrics.relevance}:</MetricLabel>
                  <MetricValue>{Math.round(result.simulation.liftlio_response.relevance_score * 100)}%</MetricValue>
                </Metric>
              </MetricsRow>
              <JustificationText>{result.simulation.liftlio_response.justification}</JustificationText>
            </Card>
          </SimulationContainer>
        )}
      </Content>
    </Container>
  );
};

export default InteractiveProof;