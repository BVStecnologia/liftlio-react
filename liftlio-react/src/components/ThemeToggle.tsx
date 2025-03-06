import React from 'react';
import styled from 'styled-components';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { IconComponent, renderIcon } from '../utils/IconHelper';

const ToggleContainer = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  overflow: hidden;
  
  &:hover {
    background-color: ${props => 
      props.theme.colors.white === '#ffffff'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.1)'
    };
    transform: translateY(-2px);
    box-shadow: ${props => 
      props.theme.colors.white === '#ffffff'
        ? '0 4px 8px rgba(0, 0, 0, 0.1)'
        : '0 4px 8px rgba(0, 0, 0, 0.3), 0 0 2px rgba(149, 113, 221, 0.4)'
    };
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  /* Light beam animation similar to hamburger menu */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${props => 
        props.theme.colors.white === '#ffffff'
          ? 'rgba(103, 58, 183, 0.2)'
          : 'rgba(195, 165, 235, 0.2)'
      },
      transparent
    );
    z-index: 0;
    animation: lightBeam 3s infinite;
    opacity: 0.7;
  }
  
  &:hover::before {
    animation: lightBeam 1.5s infinite;
  }
  
  @keyframes lightBeam {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  
  @media (max-width: 480px) {
    width: 38px;
    height: 38px;
  }
  
  @media (max-width: 400px) {
    width: 40px;
    height: 40px;
  }
`;

// Using a styled span wrapper for the icon instead of directly styling the icon
const SunIconWrapper = styled.span`
  color: ${props => props.theme.colors.warning};
  font-size: 1.3rem;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 3px rgba(255, 191, 64, 0.7));
  animation: pulseLight 2s infinite alternate;
  display: inline-flex;
  
  @keyframes pulseLight {
    0% {
      filter: drop-shadow(0 0 2px rgba(255, 191, 64, 0.7));
    }
    100% {
      filter: drop-shadow(0 0 5px rgba(255, 191, 64, 0.9));
    }
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
  
  @media (max-width: 400px) {
    font-size: 1.3rem;
  }
`;

// Using a styled span wrapper for the icon instead of directly styling the icon
const MoonIconWrapper = styled.span`
  color: ${props => props.theme.colors.secondary};
  font-size: 1.3rem;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 3px rgba(149, 113, 221, 0.7));
  animation: pulseDark 2s infinite alternate;
  display: inline-flex;
  
  @keyframes pulseDark {
    0% {
      filter: drop-shadow(0 0 2px rgba(149, 113, 221, 0.6));
    }
    100% {
      filter: drop-shadow(0 0 5px rgba(149, 113, 221, 0.8));
    }
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
  
  @media (max-width: 400px) {
    font-size: 1.3rem;
  }
`;

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <ToggleContainer onClick={toggleTheme} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
      {isDarkMode ? (
        <SunIconWrapper>
          <IconComponent icon={FaSun} />
        </SunIconWrapper>
      ) : (
        <MoonIconWrapper>
          <IconComponent icon={FaMoon} />
        </MoonIconWrapper>
      )}
    </ToggleContainer>
  );
};

export default ThemeToggle;