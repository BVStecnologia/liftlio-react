import React from 'react';
import styled, { keyframes } from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  min-height: 400px;
  background: linear-gradient(135deg, rgba(247, 247, 252, 0.8) 0%, rgba(240, 240, 250, 0.4) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin: 20px 0;
`;

const IllustrationWrapper = styled.div`
  margin-bottom: 30px;
  font-size: 80px;
  color: ${props => props.theme.colors.primary || '#2D1D42'};
  opacity: 0.8;
  animation: ${floatAnimation} 3s ease-in-out infinite;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 15px;
  color: ${props => props.theme.colors.text};
`;

const Description = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.darkGrey};
  margin-bottom: 30px;
  max-width: 500px;
  line-height: 1.6;
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #2D1D42, #3b2659);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(35, 16, 54, 0.3);
  transition: all 0.3s ease;
  animation: ${pulseAnimation} 2s infinite;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 20px rgba(35, 16, 54, 0.4);
  }
`;

const StepIndicator = styled.div`
  display: flex;
  margin-top: 30px;
  gap: 10px;
`;

const Step = styled.div<{ active: boolean }>`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: ${props => props.active 
    ? props.theme.colors.primary || '#2D1D42' 
    : '#D0D0D0'};
  transition: all 0.3s ease;
`;

interface EmptyStateProps {
  type: 'project' | 'integration' | 'data';
  onAction: () => void;
  currentStep: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction, currentStep }) => {
  let icon, title, description, buttonText;
  
  switch (type) {
    case 'project':
      icon = FaIcons.FaFolderPlus;
      title = "Welcome to Liftlio! Let's get started";
      description = "The first step is to create a project to monitor. A project can be your product, service, or brand that you want to track across digital platforms.";
      buttonText = "Create my first project";
      break;
    case 'integration':
      icon = FaIcons.FaPlug;
      title = "Connect your first integrations";
      description = "Great! Now you need to connect your platforms so we can start monitoring your project. Start by connecting your YouTube account.";
      buttonText = "Set up integrations";
      break;
    case 'data':
      icon = FaIcons.FaChartLine;
      title = "We're collecting your data";
      description = "All settings are ready! We're collecting and processing your data. This may take a few minutes. Come back soon to see your first insights.";
      buttonText = "Explore dashboard";
      break;
    default:
      icon = FaIcons.FaQuestion;
      title = "Something's not right";
      description = "Something doesn't seem to be working correctly. Try refreshing the page or contact support.";
      buttonText = "Refresh page";
  }
  
  return (
    <Container>
      <IllustrationWrapper>
        <IconComponent icon={icon} />
      </IllustrationWrapper>
      <Title>{title}</Title>
      <Description>{description}</Description>
      <ActionButton onClick={onAction}>
        {buttonText}
      </ActionButton>
      <StepIndicator>
        <Step active={currentStep >= 1} />
        <Step active={currentStep >= 2} />
        <Step active={currentStep >= 3} />
      </StepIndicator>
    </Container>
  );
};

export default EmptyState;