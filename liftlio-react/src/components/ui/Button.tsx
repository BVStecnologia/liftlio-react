import React, { ButtonHTMLAttributes } from 'react';
import styled, { css } from 'styled-components';
import { rippleEffect, buttonHoverEffect } from '../../styles/animations';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isFullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  withShadow?: boolean;
}

const getButtonStyles = (variant: string, withShadow: boolean = false) => {
  const shadowStyles = withShadow ? 'box-shadow: 0 2px 5px rgba(45, 62, 80, 0.15);' : '';
  
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
        color: ${props => props.theme.colors.secondary}; /* White (30%) */
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.primaryLight};
          ${withShadow && 'box-shadow: 0 4px 10px rgba(45, 62, 80, 0.2);'}
        }
        &:active {
          background-color: ${props => props.theme.colors.primaryDark};
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(45, 62, 80, 0.15);'}
        }
      `;
    case 'secondary':
      return css`
        background-color: ${props => props.theme.colors.tertiary}; /* Cinza médio (60%) */
        color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.tertiaryLight};
          ${withShadow && 'box-shadow: 0 4px 10px rgba(45, 62, 80, 0.1);'}
        }
        &:active {
          background-color: ${props => props.theme.colors.tertiaryDark};
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(45, 62, 80, 0.1);'}
        }
      `;
    case 'tertiary':
      return css`
        background-color: transparent;
        color: ${props => props.theme.colors.primary};
        border: 1px solid ${props => props.theme.colors.primary};
        ${shadowStyles}
        &:hover {
          background-color: rgba(45, 62, 80, 0.05);
          ${withShadow && 'box-shadow: 0 4px 10px rgba(45, 62, 80, 0.1);'}
        }
        &:active {
          background-color: rgba(45, 62, 80, 0.1);
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(45, 62, 80, 0.1);'}
        }
      `;
    case 'ghost':
      return css`
        background-color: transparent;
        color: ${props => props.theme.colors.primary};
        &:hover {
          background-color: rgba(45, 62, 80, 0.05);
        }
        &:active {
          background-color: rgba(45, 62, 80, 0.1);
        }
      `;
    case 'success':
      return css`
        background-color: ${props => props.theme.colors.success};
        color: white;
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.success}dd;
          ${withShadow && 'box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);'}
        }
        &:active {
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(76, 175, 80, 0.15);'}
        }
      `;
    case 'warning':
      return css`
        background-color: ${props => props.theme.colors.warning};
        color: white;
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.warning}dd;
          ${withShadow && 'box-shadow: 0 4px 10px rgba(255, 170, 21, 0.2);'}
        }
        &:active {
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(255, 170, 21, 0.15);'}
        }
      `;
    case 'error':
      return css`
        background-color: ${props => props.theme.colors.error};
        color: white;
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.error}dd;
          ${withShadow && 'box-shadow: 0 4px 10px rgba(231, 76, 60, 0.2);'}
        }
        &:active {
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(231, 76, 60, 0.15);'}
        }
      `;
    default:
      return css`
        background-color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
        color: ${props => props.theme.colors.secondary}; /* White (30%) */
        ${shadowStyles}
        &:hover {
          background-color: ${props => props.theme.colors.primaryLight};
          ${withShadow && 'box-shadow: 0 4px 10px rgba(45, 62, 80, 0.2);'}
        }
        &:active {
          background-color: ${props => props.theme.colors.primaryDark};
          transform: translateY(1px);
          ${withShadow && 'box-shadow: 0 2px 3px rgba(45, 62, 80, 0.15);'}
        }
      `;
  }
};

const getButtonSize = (size: string) => {
  switch (size) {
    case 'sm':
      return css`
        height: 32px;
        padding: 0 14px;
        font-size: 13px;
      `;
    case 'md':
      return css`
        height: 38px;
        padding: 0 18px;
        font-size: 14px;
      `;
    case 'lg':
      return css`
        height: 46px;
        padding: 0 22px;
        font-size: 16px;
      `;
    default:
      return css`
        height: 38px;
        padding: 0 18px;
        font-size: 14px;
      `;
  }
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  width: ${props => (props.isFullWidth ? '100%' : 'auto')};
  position: relative;
  overflow: hidden;
  letter-spacing: 0.2px;
  
  ${props => getButtonStyles(props.variant || 'primary', props.withShadow)}
  ${props => getButtonSize(props.size || 'md')}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  /* Icon spacing */
  & > svg:first-child:not(:last-child) {
    margin-right: 8px;
    font-size: 0.9em;
  }
  
  & > svg:last-child:not(:first-child) {
    margin-left: 8px;
    font-size: 0.9em;
  }
  
  /* Ripple effect for interactive feedback */
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.3) 10%, transparent 10.01%);
    background-repeat: no-repeat;
    background-position: 50%;
    transform: scale(10, 10);
    opacity: 0;
    transition: transform 0.5s, opacity 0.8s;
  }
  
  &:active::after {
    transform: scale(0, 0);
    opacity: 0.3;
    transition: 0s;
  }
`;

const Spinner = styled.div`
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid white;
  width: 14px;
  height: 14px;
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
  withShadow = false,
  ...rest
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      isFullWidth={isFullWidth}
      disabled={isLoading || rest.disabled}
      withShadow={withShadow}
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