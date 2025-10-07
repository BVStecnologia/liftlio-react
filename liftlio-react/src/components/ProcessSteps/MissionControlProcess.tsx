import React from 'react';
import styled, { keyframes } from 'styled-components';

// ==================== ANIMATIONS ====================
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const dataFlow = keyframes`
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
`;

const countUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ==================== STYLED COMPONENTS ====================
const ProcessContainer = styled.section`
  background: var(--bg-primary);
  padding: 120px 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.02) 0%,
      rgba(124, 58, 237, 0.03) 100%
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 80px 0;
  }
`;

const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 64px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 24px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 80px;

  @media (max-width: 768px) {
    margin-bottom: 60px;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 100px;
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
  text-transform: uppercase;
`;

const Title = styled.h2`
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 16px;
  color: var(--text-primary);

  @media (max-width: 768px) {
    font-size: 36px;
    letter-spacing: -1px;
  }
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Description = styled.p`
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

// ==================== PIPELINE VISUAL ====================
const PipelineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  background: var(--border-primary);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 60px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
    background: transparent;
  }
`;

const PipelineStep = styled.div<{ index: number }>`
  background: var(--bg-secondary);
  padding: 40px 32px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 768px) {
    padding: 32px 24px;
    border-radius: 12px;
    border: 1px solid var(--border-primary);
  }

  &:hover {
    background: var(--bg-hover);
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: ${props => props.index * 0.1}s;
  }

  &:hover::before {
    transform: scaleX(1);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(139, 92, 246, 0.5) 50%,
      transparent 100%
    );
    animation: ${dataFlow} 3s ease-in-out infinite;
    animation-delay: ${props => props.index * 0.5}s;
  }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: #8b5cf6;
  font-size: 14px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
`;

const StatusIndicator = styled.div<{ active?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? '#8b5cf6' : 'var(--border-primary)'};
  animation: ${props => props.active ? pulse : 'none'} 2s ease-in-out infinite;
`;

const StepTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.3px;
`;

const StepDescription = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
`;

// ==================== METRICS ROW ====================
const MetricsRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: auto;
`;

const Metric = styled.div`
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: var(--bg-hover);
  }
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  animation: ${countUp} 0.6s ease-out;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

// ==================== ROI BANNER ====================
const ROIBanner = styled.div`
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.05) 0%,
    rgba(124, 58, 237, 0.08) 100%
  );
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 32px 24px;
  }

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(139, 92, 246, 0.1) 0%,
      transparent 70%
    );
    animation: ${pulse} 4s ease-in-out infinite;
  }
`;

const ROIStats = styled.div`
  display: flex;
  justify-content: center;
  gap: 60px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 32px;
  }
`;

const ROIStat = styled.div`
  text-align: center;
`;

const ROIValue = styled.div`
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', monospace;

  @media (max-width: 768px) {
    font-size: 40px;
  }
`;

const ROILabel = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

// ==================== COMPONENT ====================
const MissionControlProcess: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Product Training',
      description: 'AI ingests product knowledge, features, and value propositions in seconds',
      metrics: [
        { label: 'Training Time', value: '<10s' },
        { label: 'Accuracy', value: '99%' }
      ],
      active: true
    },
    {
      number: '02',
      title: 'Video Intelligence',
      description: 'Computer vision analyzes video content, identifies topics and optimal engagement points',
      metrics: [
        { label: 'Videos/day', value: '2.4k' },
        { label: 'Context Acc.', value: '94%' }
      ],
      active: true
    },
    {
      number: '03',
      title: 'Lead Scoring',
      description: 'Machine learning classifies comment sentiment and identifies high-intent prospects',
      metrics: [
        { label: 'Mentions Created', value: '847' },
        { label: 'Quality Score', value: '8.9' }
      ],
      active: true
    },
    {
      number: '04',
      title: 'Response Generation',
      description: 'GPT-4 creates contextual, helpful comments that reference your solution naturally',
      metrics: [
        { label: 'Generated', value: '3.2k' },
        { label: 'Approval', value: '96%' }
      ],
      active: false
    },
    {
      number: '05',
      title: 'Pattern Randomization',
      description: 'Anti-detection algorithms vary timing, tone, and length to maintain authenticity',
      metrics: [
        { label: 'Variations', value: '42' },
        { label: 'Ban Rate', value: '0%' }
      ],
      active: false
    },
    {
      number: '06',
      title: 'Growth Compounding',
      description: 'Each mention builds authority, creating exponential brand visibility over time',
      metrics: [
        { label: 'Growth Rate', value: '+18%' },
        { label: 'Reach', value: '2.1M' }
      ],
      active: false
    }
  ];

  return (
    <ProcessContainer id="process">
      <Container>
        <Header>
          <Badge>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Technical Process
          </Badge>
          <Title>
            How <GradientText>Liftlio</GradientText> Works
          </Title>
          <Description>
            Automated AI pipeline that turns video content into qualified leads at scale
          </Description>
        </Header>

        <PipelineGrid>
          {steps.map((step, index) => (
            <PipelineStep key={index} index={index}>
              <StepHeader>
                <StepNumber>{step.number}</StepNumber>
                <StatusIndicator active={step.active} />
              </StepHeader>

              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>

              <MetricsRow>
                {step.metrics.map((metric, idx) => (
                  <Metric key={idx}>
                    <MetricLabel>{metric.label}</MetricLabel>
                    <MetricValue>{metric.value}</MetricValue>
                  </Metric>
                ))}
              </MetricsRow>
            </PipelineStep>
          ))}
        </PipelineGrid>

        <ROIBanner>
          <ROIStats>
            <ROIStat>
              <ROIValue>$2.50</ROIValue>
              <ROILabel>Cost per Acquisition</ROILabel>
            </ROIStat>
            <ROIStat>
              <ROIValue>vs</ROIValue>
              <ROILabel>Traditional Ads</ROILabel>
            </ROIStat>
            <ROIStat>
              <ROIValue>$273k</ROIValue>
              <ROILabel>Google Ads Equivalent</ROILabel>
            </ROIStat>
          </ROIStats>
        </ROIBanner>
      </Container>
    </ProcessContainer>
  );
};

export default MissionControlProcess;
