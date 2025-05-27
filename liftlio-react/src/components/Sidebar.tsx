import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const slideIn = keyframes`
  from { transform: translateX(-105%); opacity: 0.5; }
  to { transform: translateX(0); opacity: 1; }
`;

const SidebarContainer = styled.aside<{ isOpen: boolean }>`
  width: 240px;
  height: 100%;
  background: ${props => props.theme.components.sidebar.bg};
  color: ${props => props.theme.components.sidebar.text};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 1000; /* Higher z-index to appear above header */
  border-right: 1px solid ${props => props.theme.components.sidebar.border};
  
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
    transition: transform 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67), box-shadow 0.3s ease;
    animation: ${props => props.isOpen ? slideIn : 'none'} 0.35s cubic-bezier(0.17, 0.67, 0.83, 0.67);
    
    /* Edge highlight when opened */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: 1px;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.1) 30%,
        rgba(255, 255, 255, 0.1) 70%,
        rgba(255, 255, 255, 0) 100%
      );
      opacity: ${props => props.isOpen ? 0.8 : 0};
      transition: opacity 0.4s ease;
    }
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
  color: ${props => props.theme.components.sidebar.textActive};
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
  
  /* Text sem efeitos especiais */
  span {
    position: relative;
    z-index: 2;
    color: ${props => props.theme.components.sidebar.textActive};
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
                  0 0 10px rgba(${props => props.theme.colors.tertiary}, 0.2);
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
  color: ${props => props.theme.components.sidebar.text};
  transition: all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
  position: relative;
  text-decoration: none;
  overflow: hidden;
  transform-style: preserve-3d;
  perspective: 1000px;
  backface-visibility: hidden;
  will-change: transform, opacity, background-color;
  
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
  
  /* Barra lateral de destaque - removida */
  
  /* Removido efeito de fundo complexo para simplificar */
  
  /* Efeito de hover */
  &:hover {
    color: ${props => props.theme.components.sidebar.textActive};
    background: ${props => props.theme.components.sidebar.itemHover};
    
    /* Ícone no hover */
    svg {
      transform: scale(1.05);
    }
  }
  
  /* Efeito de foco */
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5) inset;
  }
  
  /* Item ativo */
  &.active {
    color: ${props => props.theme.components.sidebar.textActive};
    background: ${props => props.theme.components.sidebar.itemActive};
    padding-left: 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05),
                inset 0 -1px 0 rgba(255, 255, 255, 0.05);
    
    /* Ícone ativo */
    svg {
      transform: scale(1.1);
    }
  }

  /* Ícone */
  svg {
    margin-right: 12px;
    font-size: 1.2rem;
    transition: all 0.3s ease;
  }
  
  /* Rótulo com perspectiva */
  span {
    position: relative;
    transform: translateZ(3px);
    transition: all 0.4s ease;
  }
  
  /* Efeito na saída */
  &:active {
    transform: translateX(2px) translateZ(2px) scale(0.98);
    transition: all 0.2s ease;
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${props => props.theme.components.sidebar.border};
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
  background: ${props => props.theme.components.sidebar.bg};
  opacity: 0.9;
  border-radius: 12px;
  padding: 20px 16px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
  border: 1px solid ${props => props.theme.components.sidebar.border};
  
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
      rgba(45, 62, 80, 0.3) 0%,
      rgba(45, 62, 80, 0.1) 30%,
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
  margin-top: 0;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
    background: linear-gradient(135deg, ${props => props.theme.colors.tertiary} 0%, ${props => props.theme.colors.primary} 100%);
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
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    letter-spacing: 0.8px;
    
    &::before {
      left: 100%;
    }
    
    &::after {
      opacity: 0;
    }
    
    .crown-icon {
      transform: scale(1.2) rotate(5deg);
      animation: shineIcon 2s infinite;
    }
    
    .upgrade-text {
      color: rgba(255, 255, 255, 1);
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
    transition: all 0.5s ease;
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

// Movido para dentro do componente para ter acesso ao t()
// const navItems definido dentro do componente Sidebar

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
};

// Letter animation effect - individual letters appear one by one
const letterAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

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
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const InsightContainer = styled.div`
  margin: 20px 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(61, 51, 82, 0.7) 0%, rgba(28, 27, 51, 0.9) 100%);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #4facfe, #8a54ff, #4facfe);
    background-size: 200% auto;
    animation: ${shimmer} 8s linear infinite;
  }
`;

const InsightTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: #4facfe;
  }
`;

const InsightContent = styled.div`
  position: relative;
  height: 80px;
  overflow: hidden;
  margin: 15px 0;
  text-align: center;
`;

const InsightText = styled.div<{ active: boolean; typing: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
  opacity: 0;
  transform: translateY(20px);
  padding: 0 5px;
  text-align: center;
  
  /* Simplified animation - just fade in and slide up when active */
  animation: ${props => props.active ? fadeIn : 'none'} 0.8s ease forwards;
  
  /* Custom styling for the metric values and highlights */
  .metric-value {
    background: linear-gradient(90deg, #4facfe, #8a54ff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
    animation: ${pulse} 2s infinite ease-in-out;
  }
  
  .highlight {
    color: #4facfe;
    font-weight: 500;
  }
`;

const Highlight = styled.span`
  color: #4facfe;
  font-weight: 500;
`;

const MetricValue = styled.span`
  background: linear-gradient(90deg, #4facfe, #8a54ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
  animation: ${pulse} 2s infinite ease-in-out;
`;

const InsightDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 15px;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#4facfe' : 'rgba(255, 255, 255, 0.3)'};
  transition: all 0.3s ease;
`;

const LoadingIndicator = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #4facfe;
  margin-left: auto;
  animation: spin 1s infinite linear;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const RefreshHint = styled.div`
  text-align: center;
  font-size: 11px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${InsightContainer}:hover & {
    opacity: 1;
  }
`;

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

const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
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
  transition: visibility 0.3s ease;
  animation: ${props => props.isOpen ? overlayFadeIn : 'none'} 0.3s ease;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  pointer-events: ${props => props.isOpen ? 'all' : 'none'};
  
  @media (min-width: 769px) {
    display: none;
  }
`;

/* Removed Close Button as requested */


const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentProject } = useProject();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Navigation items with translations
  const navItems = [
    { path: '/dashboard', label: t('nav.overview'), icon: 'FaHome' },
    { path: '/mentions', label: t('nav.mentions'), icon: 'FaComments' },
    { path: '/monitoring', label: t('nav.monitoring'), icon: 'FaYoutube' },
    { path: '/settings', label: t('nav.settings'), icon: 'FaCog' },
    { path: '/integrations', label: t('nav.integrations'), icon: 'FaPlug' }
  ];
  
  // Claude Insights state
  const [currentInsight, setCurrentInsight] = useState(0);
  const [typing, setTyping] = useState(false); // No longer using typing animation
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial insights to show while loading
  const defaultInsights = [
    {
      en: `Your content is generating <MetricValue>32%</MetricValue> more mentions than average in your industry.`,
      pt: `Seu conteúdo está gerando <MetricValue>32%</MetricValue> mais menções que a média do seu setor.`
    },
    {
      en: `Projects with <Highlight>consistent monitoring</Highlight> see up to <MetricValue>47%</MetricValue> better engagement.`,
      pt: `Projetos com <Highlight>monitoramento consistente</Highlight> têm até <MetricValue>47%</MetricValue> mais engajamento.`
    },
    {
      en: `Adding one more platform could increase your reach by <MetricValue>65%</MetricValue>.`,
      pt: `Adicionar mais uma plataforma pode aumentar seu alcance em <MetricValue>65%</MetricValue>.`
    },
    {
      en: `Brands using Liftlio convert <MetricValue>3.6x</MetricValue> more leads on average.`,
      pt: `Marcas que usam Liftlio convertem <MetricValue>3.6x</MetricValue> mais leads em média.`
    },
    {
      en: `Increase your traffic by <MetricValue>24%</MetricValue> with optimal posting frequency.`,
      pt: `Aumente seu tráfego em <MetricValue>24%</MetricValue> com frequência ideal de postagens.`
    }
  ];
  
  const [insights, setInsights] = useState(defaultInsights);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to fetch personalized insights from Claude edge function
  const fetchClaudeInsights = async () => {
    if (!currentProject?.id) return;
    
    setIsLoading(true);
    try {
      // Data to send to Claude - minimal to keep costs down
      const projectData = {
        name: currentProject.name,
        industry: currentProject.audience || "technology",
        description: currentProject.description || "",
        // Could add more context from project or analytics if available
      };
      
      // Invoke the Claude edge function - using fetch directly for now
      // TODO: Update this to use Supabase proper function invocation once proper types are imported
      const response = await fetch('https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/claude-proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          messages: [
            { 
              role: 'user', 
              content: `Generate 3-5 marketing insights for a ${projectData.industry} project called ${projectData.name}. 
              ${projectData.description ? `The project description is: "${projectData.description}". Reference specific details from this description when possible.` : ''}
              Each insight should highlight a benefit of using Liftlio for brand monitoring and engagement.
              Include a specific number/metric in each insight (like 47%, 2.5x, etc.).
              Return as JSON array with format: 
              [{"en": "English insight with <MetricValue>32%</MetricValue> and <Highlight>keyword</Highlight>",
                "pt": "Portuguese translation with <MetricValue>32%</MetricValue> and <Highlight>palavra-chave</Highlight>"}]
              Only return the JSON array, no other text.`
            }
          ]
        })
      });
      
      const data = await response.json();
      const error = !response.ok;
      
      if (error) {
        console.error("Error fetching Claude insights:", error);
        return;
      }
      
      // Parse the response from Claude
      if (data && data.content && data.content[0]) {
        const responseText = data.content[0]?.text || '';
        
        try {
          // Extract JSON array from response
          const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
          if (jsonMatch) {
            const insightsData = JSON.parse(jsonMatch[0]);
            if (Array.isArray(insightsData) && insightsData.length > 0) {
              setInsights(insightsData);
            }
          }
        } catch (parseError) {
          console.error("Error parsing Claude response:", parseError);
        }
      } else {
        console.error("Invalid response format from Claude:", data);
      }
    } catch (e) {
      console.error("Unexpected error fetching insights:", e);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Language is now provided by useLanguage hook
  
  // Fetch insights when the component mounts or when the project changes
  useEffect(() => {
    if (currentProject?.id) {
      // Reset to first insight and fetch new data when project changes
      setCurrentInsight(0);
      
      // Temporarily disabled to reduce edge function calls
      // fetchClaudeInsights();
    }
    
    // Set a refresh interval (e.g., once per day)
    // const refreshInterval = setInterval(fetchClaudeInsights, 24 * 60 * 60 * 1000);
    // return () => clearInterval(refreshInterval);
  }, [currentProject?.id]);
  
  useEffect(() => {
    // Simple rotation of insights without typing animation
    const rotateInsights = () => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
    };
    
    const intervalId = setInterval(() => {
      rotateInsights();
    }, 8000); // Change insight every 8 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [insights.length]);
  
  const getInsightText = (index: number) => {
    const insight = insights[index];
    return language === 'pt' ? insight.pt : insight.en;
  };
  
  // Function to refresh insights on demand
  const handleRefreshInsights = () => {
    // Temporarily disabled to reduce edge function calls
    // fetchClaudeInsights();
    setCurrentInsight(0);
  };
  
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
              <PremiumBadge onClick={handleRefreshInsights}>
                <div className="rocket-path"></div>
                <PremiumTitle>
                  <IconComponent icon={FaIcons.FaCrown} />
                  Liftlio Premium
                  {isLoading && <LoadingIndicator />}
                </PremiumTitle>
                
                <InsightContent>
                  {insights.map((insight, index) => (
                    <InsightText 
                      key={index} 
                      active={index === currentInsight} 
                      typing={false}
                      dangerouslySetInnerHTML={{ 
                        __html: getInsightText(index)
                          .replace(/<MetricValue>(.*?)<\/MetricValue>/g, '<span class="metric-value">$1</span>')
                          .replace(/<Highlight>(.*?)<\/Highlight>/g, '<span class="highlight">$1</span>')
                          // No typewriter effect - just show the text
                      }}
                    />
                  ))}
                </InsightContent>
                
                <InsightDots>
                  {insights.map((_, index) => (
                    <Dot key={index} active={index === currentInsight} />
                  ))}
                </InsightDots>
              </PremiumBadge>
            </PremiumSection>
          </NavContainer>
        </SidebarContainer>
      </IconContext.Provider>
    </>
  );
};

export default Sidebar;