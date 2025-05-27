import React from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  min-height: 400px;
  background: transparent;
  margin: 20px 0;
  position: relative;
  overflow: hidden;
`;

const IllustrationWrapper = styled.div`
  margin-bottom: 30px;
  font-size: 80px;
  color: ${props => props.theme.colors.text.secondary};
  opacity: 0.8;
  position: relative;
  z-index: 2;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 15px;
  color: ${props => props.theme.colors.text.primary};
  position: relative;
  z-index: 2;
`;

const Description = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 30px;
  max-width: 500px;
  line-height: 1.6;
  position: relative;
  z-index: 2;
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  background: ${props => props.theme.colors.text.primary};
  color: ${props => props.theme.colors.bg.primary};
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  z-index: 2;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.colors.text.secondary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const StepIndicator = styled.div`
  display: flex;
  margin-top: 30px;
  gap: 10px;
  position: relative;
  z-index: 2;
`;

const Step = styled.div<{ active: boolean }>`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: ${props => props.active 
    ? props.theme.colors.text.primary
    : props.theme.colors.border.primary};
  position: relative;
  z-index: 2;
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