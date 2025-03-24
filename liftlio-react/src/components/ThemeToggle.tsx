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
  background: transparent;
  
  &:hover {
    background-color: ${props => 
      props.theme.colors.white === '#ffffff'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.1)'
    };
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
  display: inline-flex;
  
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
  display: inline-flex;
  
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