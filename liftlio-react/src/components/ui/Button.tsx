import React, { ButtonHTMLAttributes } from 'react';
import styled, { css } from 'styled-components';
import { rippleEffect, buttonHoverEffect } from '../../styles/animations';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isFullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getButtonStyles = (variant: string) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
        color: ${props => props.theme.colors.secondary}; /* White (30%) */
        &:hover {
          background-color: ${props => props.theme.colors.primaryLight};
        }
      `;
    case 'secondary':
      return css`
        background-color: ${props => props.theme.colors.tertiary}; /* Cinza médio (60%) */
        color: ${props => props.theme.colors.secondary}; /* White (30%) */
        &:hover {
          background-color: ${props => props.theme.colors.tertiaryLight};
        }
      `;
    case 'tertiary':
      return css`
        background-color: transparent;
        color: ${props => props.theme.colors.primary};
        border: 1px solid ${props => props.theme.colors.primary};
        &:hover {
          background-color: rgba(45, 62, 80, 0.1);
        }
      `;
    case 'success':
      return css`
        background-color: ${props => props.theme.colors.success};
        color: ${props => props.theme.colors.secondary};
        &:hover {
          background-color: ${props => props.theme.colors.success}dd;
        }
      `;
    case 'warning':
      return css`
        background-color: ${props => props.theme.colors.warning};
        color: ${props => props.theme.colors.secondary};
        &:hover {
          background-color: ${props => props.theme.colors.warning}dd;
        }
      `;
    case 'error':
      return css`
        background-color: ${props => props.theme.colors.error};
        color: ${props => props.theme.colors.secondary};
        &:hover {
          background-color: ${props => props.theme.colors.error}dd;
        }
      `;
    default:
      return css`
        background-color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
        color: ${props => props.theme.colors.secondary}; /* White (30%) */
        &:hover {
          background-color: ${props => props.theme.colors.primaryLight};
        }
      `;
  }
};

const getButtonSize = (size: string) => {
  switch (size) {
    case 'sm':
      return css`
        height: 32px;
        padding: 0 16px;
        font-size: ${props => props.theme.fontSizes.sm};
      `;
    case 'md':
      return css`
        height: 40px;
        padding: 0 20px;
        font-size: ${props => props.theme.fontSizes.md};
      `;
    case 'lg':
      return css`
        height: 48px;
        padding: 0 24px;
        font-size: ${props => props.theme.fontSizes.lg};
      `;
    default:
      return css`
        height: 40px;
        padding: 0 20px;
        font-size: ${props => props.theme.fontSizes.md};
      `;
  }
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.radius.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  width: ${props => (props.isFullWidth ? '100%' : 'auto')};
  
  ${props => getButtonStyles(props.variant || 'primary')}
  ${props => getButtonSize(props.size || 'md')}
  ${buttonHoverEffect}
  ${rippleEffect}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  /* Espaçamento para ícones */
  & > svg:first-child {
    margin-right: 8px;
  }
  
  & > svg:last-child {
    margin-left: 8px;
  }
`;

const Spinner = styled.div`
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid ${props => props.theme.colors.secondary}; /* White (30%) */
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  margin-right: 8px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      isFullWidth={isFullWidth}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading && <Spinner />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </StyledButton>
  );
};

export default Button;