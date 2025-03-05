import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SidebarContainer = styled.aside<{ isOpen: boolean }>`
  width: 240px;
  height: 100%;
  background: #2D1D42; /* Dark purple from reference */
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: 1000; /* Higher z-index to appear above header */
  transition: transform 0.3s ease-in-out;
  
  @media (min-width: 769px) {
    position: relative;
  }
  
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 85%;
    max-width: 300px;
    transform: translateX(${props => props.isOpen ? '0' : '-105%'});
    box-shadow: ${props => props.isOpen ? '0 0 24px rgba(0, 0, 0, 0.25)' : 'none'};
  }
  
  @media (max-width: 480px) {
    width: 90%;
  }
  
  @media (max-width: 400px) {
    width: 100%;
    max-width: none;
  }
`;

const Logo = styled.div`
  padding: 32px 24px;
  margin-top: 12px;
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 1px;
  position: relative;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
  color: #fff;
  text-transform: uppercase;
  
  @media (max-width: 768px) {
    padding: 30px 20px;
    margin-top: 8px;
    font-size: 1.8rem;
  }
  
  @media (max-width: 480px) {
    padding: 28px 16px;
    margin-top: 6px;
    font-size: 2rem;
  }
  
  @media (max-width: 400px) {
    padding: 30px 16px;
    margin-top: 6px;
    font-size: 2.2rem;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(110, 66, 229, 0.1), transparent);
    transform: translateX(-50%);
    z-index: -1;
    transition: width 0.5s ease;
  }
  
  /* Glowing text with thin elegant effect */
  span {
    position: relative;
    z-index: 2;
    background: linear-gradient(90deg, #fff, #99aaff, #fff);
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: gradientShift 8s linear infinite;
    /* Fine, thin text outline */
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
  }
  
  /* Thin glowing line underneath */
  &::after {
    content: '';
    position: absolute;
    width: 40%;
    height: 1px;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.7), 
      transparent
    );
    opacity: 0.5;
    transition: all 0.4s ease;
    z-index: 1;
  }
  
  &:hover {
    letter-spacing: 2px;
    
    span {
      animation: gradientShift 4s linear infinite;
      /* Enhanced but still thin glow on hover */
      text-shadow: 0 0 2px rgba(255, 255, 255, 0.4), 
                  0 0 10px rgba(79, 172, 254, 0.2);
    }
    
    &::before {
      width: 100%;
      background: linear-gradient(90deg, transparent, rgba(110, 66, 229, 0.1), transparent);
      animation: pulse 3s infinite;
    }
    
    &::after {
      width: 70%;
      opacity: 0.8;
      height: 1px;
      box-shadow: 0 0 4px rgba(79, 172, 254, 0.5);
      background: linear-gradient(90deg, 
        transparent, 
        rgba(79, 172, 254, 0.8), 
        transparent
      );
    }
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 0.4;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 100% 0%;
    }
  }
  
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0;
  margin-top: 10px;
`;

// Removed ProjectSelector from Sidebar as it's now in Header

// Removed ProjectName as well

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 15px 24px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  text-decoration: none;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 16px 22px;
    font-size: 1.1rem;
  }
  
  @media (max-width: 480px) {
    padding: 18px 24px;
    font-size: 1.2rem;
  }
  
  @media (max-width: 400px) {
    padding: 20px 26px;
    font-size: 1.3rem;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.theme.colors.tertiary};
    transform: translateX(-4px);
    transition: transform 0.3s ease;
    opacity: 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.05);
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.3s ease;
    z-index: -1;
  }
  
  &:hover {
    color: white;
    
    &::after {
      transform: scaleX(1);
      transform-origin: left;
    }
    
    svg {
      transform: translateX(2px) scale(1.15);
      filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));
    }
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5) inset;
  }
  
  &.active {
    color: white;
    background-color: rgba(255, 255, 255, 0.15);
    padding-left: 28px;
    
    &::before {
      transform: translateX(0);
      opacity: 1;
    }
    
    svg {
      transform: scale(1.15);
      filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));
    }
  }

  svg {
    margin-right: 12px;
    font-size: 1.2rem;
    transition: all 0.3s ease;
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 10px 12px;
`;

const PremiumSection = styled.div`
  margin-top: auto;
  margin-bottom: 32px;
  padding: 0 16px;
  
  @media (max-width: 768px) {
    margin-bottom: 28px;
    padding: 0 16px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 26px;
    padding: 0 16px;
  }
  
  @media (max-width: 400px) {
    margin-bottom: 28px;
    padding: 0 18px;
  }
`;

const PremiumBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 16px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 768px) {
    padding: 20px 16px;
    border-radius: 10px;
  }
  
  @media (max-width: 480px) {
    padding: 22px 18px;
    border-radius: 10px;
  }
  
  @media (max-width: 400px) {
    padding: 24px 20px;
    border-radius: 12px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle at center,
      rgba(138, 84, 255, 0.15) 0%,
      rgba(79, 172, 254, 0.05) 30%,
      transparent 70%
    );
    opacity: 0.8;
    transform: rotate(45deg);
    z-index: 0;
    animation: rotateBg 10s linear infinite;
  }
  
  /* For the rocket flying path */
  .rocket-path {
    position: absolute;
    width: 3px;
    height: 100%;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    z-index: 1;
  }
  
  @keyframes rotateBg {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const PremiumTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
  
  svg {
    color: #FFC107;
    filter: drop-shadow(0 0 3px rgba(255, 193, 7, 0.5));
  }
  
  @media (max-width: 768px) {
    font-size: 16px;
    margin-bottom: 12px;
  }
  
  @media (max-width: 480px) {
    font-size: 18px;
    margin-bottom: 14px;
    
    svg {
      font-size: 1.1em;
    }
  }
  
  @media (max-width: 400px) {
    font-size: 20px;
    margin-bottom: 16px;
    
    svg {
      font-size: 1.2em;
    }
  }
`;

const PremiumFeatures = styled.div`
  margin-bottom: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    margin-bottom: 18px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 18px;
    font-size: 14px;
  }
  
  @media (max-width: 400px) {
    margin-bottom: 20px;
    font-size: 16px;
  }
`;

const PremiumFeature = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  
  svg {
    color: #4facfe;
    font-size: 10px;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 8px;
    gap: 10px;
    
    svg {
      font-size: 12px;
    }
  }
  
  @media (max-width: 480px) {
    margin-bottom: 10px;
    gap: 12px;
    
    svg {
      font-size: 14px;
    }
  }
  
  @media (max-width: 400px) {
    margin-bottom: 12px;
    
    svg {
      font-size: 16px;
    }
  }
`;

const UpgradeButton = styled.div`
  padding: 14px 0;
  margin-top: 5px;
  background: linear-gradient(135deg, #8a54ff 0%, #4facfe 100%);
  color: white;
  font-weight: 700;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 15px rgba(79, 172, 254, 0.3), 
              0 0 15px rgba(138, 84, 255, 0.2) inset;
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  z-index: 2;
  
  @media (max-width: 768px) {
    padding: 14px 0;
    font-size: 1rem;
    border-radius: 10px;
    margin-top: 6px;
  }
  
  @media (max-width: 480px) {
    padding: 16px 0;
    font-size: 1.1rem;
    border-radius: 10px;
    margin-top: 8px;
  }
  
  @media (max-width: 400px) {
    padding: 18px 0;
    font-size: 1.2rem;
    border-radius: 12px;
    margin-top: 10px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      transparent 100%);
    transition: left 0.7s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(138, 84, 255, 0.8) 0%, rgba(79, 172, 254, 0.8) 100%);
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  /* Rocket Animation Elements */
  .rocket {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 20px;
    opacity: 0;
    transition: all 0.3s ease;
  }
  
  .rocket-body {
    position: absolute;
    width: 8px;
    height: 22px;
    background: #FFC107;
    border-radius: 50% 50% 0 0;
    bottom: 0;
    left: 6px;
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
  }
  
  .rocket-window {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: white;
    top: 4px;
    left: 8px;
    z-index: 1;
  }
  
  .fins {
    position: absolute;
    bottom: 0;
    width: 20px;
    height: 6px;
  }
  
  .fin-left {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 5px;
    height: 10px;
    background: #FF5722;
    border-radius: 0 0 0 100%;
  }
  
  .fin-right {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 5px;
    height: 10px;
    background: #FF5722;
    border-radius: 0 0 100% 0;
  }
  
  .fire {
    position: absolute;
    bottom: -10px;
    left: 8px;
    width: 4px;
    height: 12px;
    background: linear-gradient(to bottom, #FF9800, #FF5722);
    border-radius: 0 0 20px 20px;
    opacity: 0;
  }
  
  .fire::before {
    content: '';
    position: absolute;
    left: -2px;
    width: 8px;
    height: 8px;
    bottom: -4px;
    background: linear-gradient(to bottom, #FF5722, transparent);
    border-radius: 0 0 20px 20px;
  }
  
  .smoke-particle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    bottom: -20px;
    opacity: 0;
    
    &:nth-child(1) {
      left: 7px;
      width: 6px;
      height: 6px;
    }
    
    &:nth-child(2) {
      left: 12px;
      width: 4px;
      height: 4px;
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      left: 4px;
      width: 5px;
      height: 5px;
      animation-delay: 0.4s;
    }
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 20px rgba(79, 172, 254, 0.4),
                0 0 20px rgba(138, 84, 255, 0.3) inset;
    letter-spacing: 0.8px;
    
    &::before {
      left: 100%;
    }
    
    &::after {
      opacity: 1;
    }
    
    .crown-icon {
      transform: scale(1.2) rotate(5deg);
      animation: shineIcon 2s infinite;
    }
    
    .upgrade-text {
      background-position: 0%;
    }
    
    /* Rocket Animation on Hover */
    .rocket {
      opacity: 1;
      bottom: 30px;
      animation: launchRocket 2s ease forwards;
    }
    
    .fire {
      opacity: 1;
      animation: flicker 0.1s infinite alternate;
    }
    
    .smoke-particle {
      animation: smoke 1.8s ease-out forwards;
    }
    
    .smoke-particle:nth-child(1) {
      animation-delay: 0.1s;
    }
    
    .smoke-particle:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    .smoke-particle:nth-child(3) {
      animation-delay: 0.5s;
    }
  }
  
  &:active {
    transform: translateY(-1px) scale(0.98);
    box-shadow: 0 5px 10px rgba(79, 172, 254, 0.2),
                0 0 10px rgba(138, 84, 255, 0.2) inset;
  }
  
  .crown-icon {
    margin-right: 8px;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
    transition: all 0.3s ease;
    color: #FFC107;
  }
  
  .upgrade-text {
    background: linear-gradient(to right, #fff, #FFC107, #fff);
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    transition: all 0.5s ease;
    background-position: 100%;
  }
  
  @keyframes shineIcon {
    0% {
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
    }
    50% {
      filter: drop-shadow(0 0 6px rgba(255, 193, 7, 0.9));
    }
    100% {
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
    }
  }
  
  @keyframes launchRocket {
    0% {
      bottom: -15px;
      opacity: 0;
    }
    20% {
      bottom: 15px;
      opacity: 1;
    }
    40% {
      opacity: 1;
    }
    100% {
      bottom: 300px;
      opacity: 0;
      transform: translateX(-50%) rotate(5deg);
    }
  }
  
  @keyframes flicker {
    0% {
      height: 12px;
      opacity: 0.8;
    }
    100% {
      height: 14px;
      opacity: 1;
    }
  }
  
  @keyframes smoke {
    0% {
      bottom: -15px;
      opacity: 0;
    }
    20% {
      opacity: 0.8;
    }
    80% {
      opacity: 0.3;
    }
    100% {
      bottom: 120px;
      opacity: 0;
      transform: translateX(10px) scale(3);
    }
  }
`;

const NavItemIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 1.2rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: ${props => props.theme.colors.tertiary};
    border-radius: 50%;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    transition: transform 0.3s ease;
    opacity: 0;
  }
  
  .active & {
    &::after {
      transform: translateX(-50%) scale(1);
      opacity: 1;
    }
  }
`;

const AddButton = styled.button`
  background: ${props => props.theme.colors.gradient.accent};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.sm};
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all ${props => props.theme.transitions.springy};
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${props => props.theme.shadows.glow};
  }
`;

// Removing user section as per the reference image

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'FaHome' },
  { path: '/mentions', label: 'Mentions', icon: 'FaComments' },
  { path: '/youtube-monitoring', label: 'Monitoring', icon: 'FaYoutube' },
  { path: '/settings', label: 'Settings', icon: 'FaCog' },
  { path: '/integrations', label: 'Integrations', icon: 'FaPlug' }
];

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
};

const Tooltip = styled.div<{ visible: boolean }>`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  opacity: ${props => props.visible ? 1 : 0};
  visibility: ${props => props.visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  pointer-events: none;
  margin-left: 10px;
  white-space: nowrap;
  z-index: 999;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
    border-width: 6px 6px 6px 0;
    border-style: solid;
    border-color: transparent rgba(0, 0, 0, 0.8) transparent transparent;
  }
`;

const SidebarOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 999; /* Just below sidebar but above everything else */
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  pointer-events: ${props => props.isOpen ? 'all' : 'none'};
  
  @media (min-width: 769px) {
    display: none;
  }
`;

/* Removed Close Button as requested */

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const [selectedProject] = useState({
    id: '1',
    name: 'Project 1',
    company: 'Acme Corp',
    link: 'www.acme.com',
    audience: 'Tech professionals'
  });
  
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Handle click outside on mobile
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);
  
  return (
    <>
      <SidebarOverlay isOpen={isOpen} onClick={onClose} />
      <IconContext.Provider value={{ style: { marginRight: '10px' } }}>
        <SidebarContainer isOpen={isOpen}>
          {/* Removed close button */}
          <Logo><span data-text="Liftlio">Liftlio</span></Logo>
          
          <NavContainer>
            {navItems.map(item => (
              <NavItem 
                key={item.path}
                to={item.path} 
                className={({ isActive }) => isActive ? 'active' : ''}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-label={item.label}
                title={item.label}
                style={{ position: 'relative' }}
                onClick={() => {
                  if (window.innerWidth <= 768 && onClose) {
                    onClose();
                  }
                }}
              >
                <NavItemIcon>
                  <IconComponent icon={FaIcons[item.icon as keyof typeof FaIcons]} />
                </NavItemIcon>
                {item.label}
                <Tooltip visible={hoveredItem === item.path}>
                  {item.label}
                </Tooltip>
              </NavItem>
            ))}
          
            <PremiumSection>
              <PremiumBadge>
                <div className="rocket-path"></div>
                <PremiumTitle>
                  <IconComponent icon={FaIcons.FaCrown} />
                  Liftlio Premium
                </PremiumTitle>
                
                <PremiumFeatures>
                  <PremiumFeature>
                    <IconComponent icon={FaIcons.FaCheckCircle} />
                    Access to advanced features
                  </PremiumFeature>
                  <PremiumFeature>
                    <IconComponent icon={FaIcons.FaCheckCircle} />
                    Detailed engagement reports
                  </PremiumFeature>
                  <PremiumFeature>
                    <IconComponent icon={FaIcons.FaCheckCircle} />
                    Priority 24/7 support
                  </PremiumFeature>
                </PremiumFeatures>
                
                <UpgradeButton
                  onMouseEnter={() => setHoveredItem('upgrade')}
                  onMouseLeave={() => setHoveredItem(null)}
                  aria-label="Upgrade to Premium"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      // Handle upgrade click
                      console.log('Upgrade clicked');
                    }
                  }}
                >
                  <span className="crown-icon">
                    <IconComponent icon={FaIcons.FaCrown} />
                  </span>
                  <span className="upgrade-text">Upgrade Now</span>
                  <Tooltip visible={hoveredItem === 'upgrade'}>
                    Unlock Liftlio's full potential!
                  </Tooltip>
                  <div className="rocket">
                    <div className="rocket-body"></div>
                    <div className="rocket-window"></div>
                    <div className="fins">
                      <div className="fin-left"></div>
                      <div className="fin-right"></div>
                    </div>
                    <div className="fire"></div>
                    <div className="smoke-particle"></div>
                    <div className="smoke-particle"></div>
                    <div className="smoke-particle"></div>
                  </div>
                </UpgradeButton>
              </PremiumBadge>
            </PremiumSection>
          </NavContainer>
        </SidebarContainer>
      </IconContext.Provider>
    </>
  );
};

export default Sidebar;