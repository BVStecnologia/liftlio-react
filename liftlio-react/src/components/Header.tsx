import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import ProjectModal from './ProjectModal';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { IconComponent } from '../utils/IconHelper';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';

// Import the MobileNavToggle from App.tsx
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* Removed MobileMenuButton - now using floating button from App.tsx */

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: ${props => props.theme.components.header.bg};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid ${props => props.theme.components.header.border};
  color: ${props => props.theme.components.header.text};
  position: sticky;
  top: 0;
  z-index: 900;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    padding: 10px 16px;
    flex-wrap: wrap;
  }
`;

const ProjectSelector = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.theme.components.header.bg};
  color: ${props => props.theme.components.header.text};
  border: 1px solid ${props => props.theme.components.header.border};
  padding: 10px 18px;
  border-radius: 12px; /* Mais arredondado para modernidade */
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.35s cubic-bezier(0.17, 0.67, 0.29, 0.96);
  position: relative;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(8px);
  transform-style: preserve-3d;
  perspective: 800px;
  transform: perspective(800px) translateZ(0);
  
  /* Efeito de profundidade 3D */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.3) 50%, 
      rgba(255, 255, 255, 0) 100%);
    opacity: 0.8;
    z-index: 1;
    transform: translateZ(2px);
  }
  
  /* Light beam animado */
  &::after {
    content: '';
    position: absolute;
    width: 1.5px;
    height: 140%;
    top: -20%;
    left: -10%;
    background: ${props => props.theme.name === 'dark' 
      ? `linear-gradient(
          to bottom,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.05) 10%,
          rgba(255, 255, 255, 0.9) 50%,
          rgba(255, 255, 255, 0.05) 90%,
          rgba(255, 255, 255, 0) 100%
        )`
      : `linear-gradient(
          to bottom,
          rgba(103, 58, 183, 0) 0%,
          rgba(103, 58, 183, 0.1) 10%,
          rgba(103, 58, 183, 0.8) 50%,
          rgba(103, 58, 183, 0.1) 90%,
          rgba(103, 58, 183, 0) 100%
        )`
    };
    transform: rotate(20deg) translateZ(5px);
    z-index: 2;
    box-shadow: ${props => props.theme.name === 'dark'
      ? '0 0 25px rgba(45, 62, 80, 0.8), 0 0 45px rgba(45, 62, 80, 0.3)'
      : '0 0 25px rgba(103, 58, 183, 0.4), 0 0 45px rgba(103, 58, 183, 0.2)'
    };
    filter: blur(0.2px);
    opacity: ${props => props.theme.name === 'dark' ? '0.8' : '0.6'};
    animation: projectSelectorBeam 5s cubic-bezier(0.17, 0.67, 0.29, 0.96) infinite;
    animation-delay: 1s;
  }
  
  @keyframes projectSelectorBeam {
    0% {
      left: -10%;
      opacity: 0;
      transform: rotate(20deg) translateZ(5px);
    }
    10% {
      opacity: 0.8;
    }
    60% {
      opacity: 0.8;
    }
    100% {
      left: 110%;
      opacity: 0;
      transform: rotate(20deg) translateZ(5px);
    }
  }
  
  /* Efeito de brilho nas bordas */
  &:before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    padding: 1.5px;
    background: linear-gradient(
      135deg, 
      rgba(255, 255, 255, 0.1) 0%, 
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.3;
    transition: opacity 0.4s ease;
  }
  
  &:hover {
    transform: perspective(800px) translateY(-3px) translateZ(4px) scale(1.01);
    background: ${props => props.theme.colors.bg.hover};
    box-shadow: ${props => props.theme.shadows.lg};
    
    &::after {
      animation-duration: 3s;
      box-shadow: ${props => props.theme.name === 'dark'
        ? '0 0 30px rgba(45, 62, 80, 0.9), 0 0 60px rgba(45, 62, 80, 0.4)'
        : '0 0 30px rgba(103, 58, 183, 0.5), 0 0 60px rgba(103, 58, 183, 0.3)'
      };
    }
    
    &:before {
      opacity: 0.8;
    }
  }
  
  &:active {
    transform: perspective(800px) translateY(0) translateZ(2px) scale(0.99);
    box-shadow: 0 2px 10px rgba(35, 16, 54, 0.3), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    transition: all 0.1s ease;
  }
  
  svg {
    margin-left: 8px;
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.4));
    transform: translateZ(10px);
    transition: all 0.3s ease;
  }

  span, div {
    position: relative;
    z-index: 3;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.4);
    transform: translateZ(8px);
  }
  
  &:hover svg {
    transform: translateZ(15px) scale(1.1);
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
  }

  @media (max-width: 768px) {
    padding: 8px 14px;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 8px 14px;
  }
  
  @media (max-width: 400px) {
    font-size: 0.9rem;
    padding: 10px 16px;
  }
`;

const ProjectIcon = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;

  @media (max-width: 768px) {
    gap: 16px;
  }

  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const PopupMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  width: 250px;
  background-color: ${props => props.theme.components.modal.bg};
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: ${props => props.theme.zIndices.dropdown};
  overflow: hidden;
  margin-top: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};

  @media (max-width: 480px) {
    width: 200px;
  }
`;

const PopupMenuItem = styled.div`
  padding: 12px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  position: relative;
  border-left: 3px solid transparent;
  color: ${props => props.theme.colors.text.primary};

  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
    border-left: 3px solid ${props => props.theme.colors.accent.primary};
  }

  &:active {
    background-color: ${props => props.theme.colors.bg.active};
  }

  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.8;
  }
`;

const NotificationBadge = styled.div`
  position: relative;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px; /* Menos arredondado */
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
  }
  
  svg {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.text.secondary};
  }
  
  &::after {
    content: attr(data-count);
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    background-color: ${props => props.theme.name === 'dark' ? '#52525B' : '#6B7280'};
    border-radius: 50%;
    box-shadow: 0 0 0 2px ${props => props.theme.components.modal.bg};
    color: white;
    font-size: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    visibility: var(--notification-visibility, hidden);
  }

  @media (max-width: 480px) {
    width: 38px;
    height: 38px;
    
    svg {
      font-size: 1.2rem;
    }
  }
  
  @media (max-width: 400px) {
    width: 40px;
    height: 40px;
    
    svg {
      font-size: 1.3rem;
    }
  }
`;

const NotificationPopup = styled(PopupMenu)`
  width: 330px;
  max-height: 400px;
  overflow-y: auto;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 16px;
    width: 12px;
    height: 12px;
    background: ${props => props.theme.components.modal.bg};
    transform: rotate(45deg);
    border-top: 1px solid ${props => props.theme.colors.border.primary};
    border-left: 1px solid ${props => props.theme.colors.border.primary};
  }

  @media (max-width: 768px) {
    width: 290px;
  }

  @media (max-width: 480px) {
    width: 280px;
    right: -80px;
  }
  
  @media (max-width: 400px) {
    width: 300px;
    right: -60px;
  }
`;

const MarkAsReadButton = styled.button`
  position: absolute;
  right: 10px;
  top: 10px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.accent.primary};
  font-size: 0.75rem;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
  }
`;

const NotificationItem = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
  }

  &:last-child {
    border-bottom: none;
  }
  
  h4 {
    font-weight: ${props => props.theme.fontWeights.medium};
    margin: 0 0 6px 0;
    font-size: 0.9rem;
    color: ${props => props.theme.colors.text.primary};
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${props => props.theme.colors.text.secondary};
    line-height: 1.4;
  }
  
  time {
    display: block;
    font-size: 0.75rem;
    color: ${props => props.theme.colors.text.secondary};
    margin-top: 8px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 18px;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-top: 2px solid #ccc;
    border-right: 2px solid #ccc;
    transform: translateY(-50%) rotate(45deg);
  }
`;

const PopupHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${props => props.theme.colors.bg.secondary};
  font-size: 0.95rem;
  color: ${props => props.theme.colors.text.primary};
  
  span {
    font-size: 0.8rem;
    color: ${props => props.theme.colors.accent.primary};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px; /* Menos arredondado */
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
  }

  @media (max-width: 480px) {
    padding: 3px;
  }
  
  @media (max-width: 400px) {
    padding: 4px;
  }
`;

const UserPopup = styled(PopupMenu)`
  width: 220px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 16px;
    width: 12px;
    height: 12px;
    background: ${props => props.theme.components.modal.bg};
    transform: rotate(45deg);
    border-top: 1px solid ${props => props.theme.colors.border.primary};
    border-left: 1px solid ${props => props.theme.colors.border.primary};
  }

  @media (max-width: 480px) {
    width: 200px;
  }
  
  @media (max-width: 400px) {
    width: 220px;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2d3e50 0%, #34495e 50%, #2d3e50 100%);
  position: relative;
  box-shadow: ${COLORS.SHADOW.MEDIUM};
  transition: all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
  isolation: isolate;
  transform-style: preserve-3d;
  perspective: 800px;
  transform: perspective(800px) rotateX(0) rotateY(0);
  
  /* Efeito de borda holográfica */
  &:before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    padding: 1px;
    background: conic-gradient(
      from 215deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 10%,
      rgba(255, 255, 255, 0.6) 20%,
      rgba(255, 255, 255, 0.1) 30%,
      transparent 40%,
      transparent 60%,
      rgba(255, 255, 255, 0.1) 70%,
      rgba(79, 172, 254, 0.4) 80%,
      rgba(255, 255, 255, 0.1) 90%,
      transparent 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    transition: all 0.6s ease;
    animation: rotateBorder 8s linear infinite;
  }
  
  @keyframes rotateBorder {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  span {
    color: white;
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-size: 1.3rem;
    text-transform: uppercase;
    position: relative;
    z-index: 3;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    transform: translateZ(5px);
    transition: all 0.3s ease;
  }
  
  /* Efeito de vidro/lente */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(45, 62, 80, 0.2) 0%,
      rgba(36, 52, 68, 0.1) 40%,
      transparent 70%
    );
    z-index: 1;
    opacity: 0.7;
  }
  
  /* Efeito de scanner */
  &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 120%;
    top: -10%;
    left: -20%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 10%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(255, 255, 255, 0.05) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    z-index: 2;
    box-shadow: 0 0 15px rgba(79, 172, 254, 0.8),
                0 0 35px rgba(79, 172, 254, 0.4);
    opacity: 0;
    filter: blur(0.3px);
    animation: scanMove 4s cubic-bezier(0.3, 0, 0.2, 1) infinite;
    animation-delay: 0.8s;
  }
  
  @keyframes scanMove {
    0% {
      left: -30%;
      opacity: 0;
      transform: skewX(-20deg) translateZ(2px);
    }
    10% {
      opacity: 0.9;
    }
    75% {
      opacity: 0.9;
    }
    100% {
      left: 130%;
      opacity: 0;
      transform: skewX(-20deg) translateZ(2px);
    }
  }
  
  /* Inner reflections */
  &:after {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(
        circle at 70% 20%, 
        rgba(255, 255, 255, 0.2) 0%, 
        transparent 25%
      ),
      radial-gradient(
        circle at 30% 75%, 
        rgba(79, 172, 254, 0.15) 0%, 
        transparent 30%
      );
    border-radius: 50%;
    z-index: 2;
    opacity: 0.6;
    mix-blend-mode: screen;
  }
  
  /* Efeito 3D no hover */
  &:hover {
    box-shadow: 
      ${COLORS.SHADOW.STRONG}, 
      0 0 20px ${withOpacity(COLORS.ACCENT, 0.5)},
      0 0 40px ${withOpacity(COLORS.ACCENT, 0.2)};
    transform: 
      perspective(800px) 
      translateY(-2px)
      translateZ(10px)
      rotateX(5deg)
      rotateY(-5deg)
      scale(1.08);
    background: linear-gradient(135deg, #34495e 0%, #4e6785 50%, #34495e 100%);
    
    &::after {
      opacity: 1;
      animation-duration: 2s;
      box-shadow: 
        0 0 25px rgba(79, 172, 254, 0.9),
        0 0 50px rgba(79, 172, 254, 0.5);
    }
    
    &:before {
      opacity: 0.9;
      animation-duration: 6s;
    }
    
    span {
      transform: translateZ(15px);
      text-shadow: 
        0 0 15px rgba(255, 255, 255, 0.7),
        0 0 30px rgba(79, 172, 254, 0.4);
    }
  }
  
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
  }
  
  &.profile-large {
    width: 60px;
    height: 60px;
    
    span {
      font-size: 1.8rem;
    }
  }
`;

const UserInfo = styled.div`
  padding: 18px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  text-align: center;
  background-color: ${props => props.theme.colors.bg.secondary};
  
  h4 {
    margin: 10px 0 5px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text.primary};
  }
  
  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${props => props.theme.colors.text.secondary};
  }
  
  .profile-avatar {
    width: 60px;
    height: 60px;
    margin: 0 auto;
  }
`;

const AddProjectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: ${props => props.theme.radius.md};
  border: none;
  background: ${props => props.theme.colors.accent.primary};
  color: white;
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-right: 20px; /* Position it at the header right section */
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.24, 0.4, 0.12, 1);
  position: relative;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(4px);
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25),
              inset 0 0 0 1px rgba(255, 255, 255, 0.08),
              0 0 0 0 rgba(45, 62, 80, 0.3);
  
  /* Subtle inner gradient */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.1) 0%, 
      rgba(255, 255, 255, 0) 100%);
    z-index: 1;
  }
  
  /* Light beam */
  &::after {
    content: '';
    position: absolute;
    width: 1px;
    height: 160%;
    top: -30%;
    left: -10%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.03) 10%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(255, 255, 255, 0.03) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(25deg);
    z-index: 2;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5),
                0 0 30px rgba(45, 62, 80, 0.3);
    opacity: 0.7;
    filter: blur(0.2px);
    animation: addButtonBeam 5.2s cubic-bezier(0.25, 0.1, 0.15, 1) infinite;
    animation-delay: 1.5s;
  }
  
  @keyframes addButtonBeam {
    0% {
      left: -10%;
      opacity: 0;
      transform: rotate(25deg);
    }
    15% {
      opacity: 0.7;
    }
    80% {
      opacity: 0.7;
    }
    100% {
      left: 110%;
      opacity: 0;
      transform: rotate(25deg);
    }
  }
  
  /* Glowing border on hover */
  &:after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${props => props.theme.radius.md};
    padding: 1px;
    background: linear-gradient(
      135deg, 
      rgba(45, 62, 80, 0) 0%, 
      rgba(45, 62, 80, 0.4) 100%
    );
    mask: linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  
  &:hover {
    background: rgba(45, 62, 80, 0.2);
    box-shadow: 0 5px 15px rgba(36, 52, 68, 0.35),
                inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                0 0 15px rgba(45, 62, 80, 0.2);
    transform: translateY(-2px) scale(1.01);
                
    &::after {
      animation-duration: 2.8s;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.6),
                  0 0 40px rgba(45, 62, 80, 0.4);
    }
    
    &:after {
      opacity: 1;
    }
    
    svg {
      filter: drop-shadow(0 0 4px rgba(45, 62, 80, 0.6));
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 2px 8px rgba(36, 52, 68, 0.2),
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  svg, span {
    position: relative;
    z-index: 3;
    transition: all 0.3s ease;
  }
  
  svg {
    margin-right: 6px;
    font-size: 0.9rem;
    filter: drop-shadow(0 0 2px rgba(45, 62, 80, 0.4));
  }

  @media (max-width: 768px) {
    margin-right: 12px;
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.8rem;
    
    svg {
      font-size: 0.8rem;
    }
  }
  
  @media (max-width: 400px) {
    padding: 8px 12px;
    font-size: 0.85rem;
    white-space: nowrap;
    
    svg {
      font-size: 0.9rem;
    }
  }
`;

const ThemeToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
  background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff'};
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px ${props => props.theme.colors.shadowMedium};
    background: ${props => props.theme.name === 'dark' ? props.theme.colors.primary : props.theme.colors.primary};
    color: ${props => props.theme.name === 'dark' ? '#000' : '#fff'};
    border-color: ${props => props.theme.colors.primary};
  }
  
  svg {
    font-size: 18px;
  }
`;

const LanguageSelectorButton = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff'};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.2s ease;
  gap: 8px;
  
  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#f0f0f0'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.theme.colors.shadowMedium};
  }
  
  svg {
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    padding: 4px 8px;
    
    svg {
      font-size: 1rem;
    }
  }
`;

const LanguagePopup = styled(PopupMenu)`
  width: 160px;
  right: -50px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 50px;
    width: 12px;
    height: 12px;
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 480px) {
    width: 130px;
  }
`;

const ProjectsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: ${props => props.theme.zIndices.dropdown};
  width: 280px;
  background-color: ${props => props.theme.components.modal.bg};
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.lg};
  margin-top: 10px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  overflow: hidden;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    left: 40px;
    width: 12px;
    height: 12px;
    background: ${props => props.theme.components.modal.bg};
    transform: rotate(45deg);
    border-top: 1px solid ${props => props.theme.colors.border.primary};
    border-left: 1px solid ${props => props.theme.colors.border.primary};
  }

  @media (max-width: 480px) {
    width: 260px;
  }
  
  @media (max-width: 400px) {
    width: 280px;
  }
`;

const projectItemHover = keyframes`
  0% {
    width: 0;
    left: 0;
    right: auto;
  }
  100% {
    width: 100%;
    left: 0;
    right: auto;
  }
`;

const ProjectItem = styled.div`
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.17, 0.67, 0.29, 0.96);
  display: flex;
  align-items: center;
  border-left: 2px solid transparent;
  position: relative;
  overflow: hidden;
  color: ${props => props.theme.colors.text.primary};
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 0;
    height: 1px;
    background: linear-gradient(to right, 
      rgba(45, 62, 80, 0.7) 0%, 
      rgba(45, 62, 80, 0.3) 50%,
      rgba(45, 62, 80, 0.1) 100%);
    transition: width 0.4s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    z-index: 2;
  }
  
  &:hover {
    background-color: ${props => `${props.theme.colors.primary}08`};
    border-left: 2px solid ${props => props.theme.colors.primary};
    
    &:before {
      width: 100%;
      animation: ${projectItemHover} 0.5s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    }
    
    svg {
      color: ${props => props.theme.colors.text.primary};
      opacity: 1;
      transform: scale(1.05);
    }
  }
  
  &:active {
    background-color: rgba(45, 62, 80, 0.06);
  }
  
  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.text.secondary};
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
  }
  
  /* Light beam */
  &::after {
    content: '';
    position: absolute;
    width: 1px;
    height: 0;
    left: 0;
    top: 0;
    background: linear-gradient(
      to bottom,
      rgba(45, 62, 80, 0.7) 0%,
      rgba(45, 62, 80, 0.1) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease, height 0.3s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    z-index: 1;
    box-shadow: 0 0 8px rgba(45, 62, 80, 0.3);
  }
  
  &:hover::after {
    opacity: 1;
    height: 100%;
    transition: opacity 0.2s ease, height 0.4s cubic-bezier(0.17, 0.67, 0.29, 0.96);
  }
`;

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
  keywords?: string;
  country?: string;
};

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, signOut } = useAuth();
  const { currentProject, setCurrentProject, projects } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [currentLanguage, setCurrentLanguage] = useState(language.toUpperCase());
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  // Estado para controlar se a conexão do YouTube está verificada e conectada
  const [youtubeStatus, setYoutubeStatus] = useState<{
    checked: boolean; // Se já verificamos o status
    connected: boolean; // Se está conectado
  }>({
    checked: false,
    connected: false
  });
  
  const projectsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  
  // Auto-select first project if none is selected
  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [currentProject, projects, setCurrentProject]);
  
  // Verificar status do YouTube quando o projeto muda
  useEffect(() => {
    if (currentProject?.id) {
      // Iniciar verificação sem alterar o estado de exibição até resultado completo
      setYoutubeStatus(prev => ({ ...prev, checked: false }));
      
      // Verificar status imediatamente
      checkYouTubeConnection();
      
      // Configurar verificação periódica a cada 30 segundos
      const intervalId = setInterval(() => {
        console.log('Verificação periódica do status do YouTube');
        checkYouTubeConnection();
      }, 30000); // 30 segundos
      
      // Limpar intervalo quando o componente for desmontado ou o projeto mudar
      return () => clearInterval(intervalId);
    } else {
      // Se não houver projeto selecionado, marcar como desconectado (não conectado)
      // Isso evita que a notificação de integração desconectada suma quando não há projeto selecionado
      setYoutubeStatus({ checked: true, connected: false });
    }
  }, [currentProject]);
  
  // Verificação inicial
  useEffect(() => {
    console.log('Inicializando verificação do status do YouTube');
    
    // Forçar execução inicial após 1 segundo para garantir que todos os dados foram carregados
    const timerId = setTimeout(() => {
      if (currentProject?.id) {
        console.log('Executando verificação inicial do YouTube');
        checkYouTubeConnection();
      }
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [currentProject?.id]); // Adicionado currentProject?.id como dependência para refazer a verificação quando o projeto mudar
  
  // Função para verificar a conexão com YouTube usando verificação direta
  const checkYouTubeConnection = async () => {
    // Forçar o estado para "verificando" durante a consulta
    setYoutubeStatus({ checked: false, connected: false });
    
    try {
      if (!currentProject?.id) {
        console.log('Sem projeto selecionado, YouTube desconectado');
        setYoutubeStatus({ checked: true, connected: false });
        return;
      }
      
      console.log('Verificando conexão do YouTube para o projeto atual');
      
      // Verificação direta da integração no banco de dados
      const { data, error } = await supabase
        .from('Integrações')
        .select('ativo')
        .eq('PROJETO id', currentProject.id)
        .eq('Tipo de integração', 'youtube')
        .single();
      
      if (error) {
        console.error('Erro ao verificar integração do YouTube:', error);
        setYoutubeStatus({ checked: true, connected: false });
        return;
      }
      
      // A integração está ativa se o campo ativo for true
      const isConnected = data?.ativo === true;
      
      console.log('Status da conexão YouTube:', isConnected ? 'Conectado' : 'Desconectado');
      setYoutubeStatus({ checked: true, connected: isConnected });
    } catch (error) {
      console.error("Erro ao verificar integração do YouTube:", error);
      console.log('YouTube desconectado (exceção na consulta)');
      setYoutubeStatus({ checked: true, connected: false });
    }
  };
  
  // Função para iniciar o fluxo de autorização do YouTube
  const initiateYouTubeOAuth = () => {
    if (!currentProject?.id) {
      alert("Selecione um projeto primeiro");
      return;
    }
    
    // Marcar como não verificado durante a autenticação
    setYoutubeStatus({ checked: false, connected: false });
    
    // Determinar o URI de redirecionamento baseado no ambiente
    const isProduction = window.location.hostname === 'liftlio.fly.dev';
    const redirectUri = isProduction 
      ? 'https://liftlio.fly.dev' 
      : 'http://localhost:3000';
      
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/youtube.force-ssl"
    ].join(' ');
    
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.append('client_id', clientId);
    oauthUrl.searchParams.append('redirect_uri', redirectUri);
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('scope', scopes);
    oauthUrl.searchParams.append('access_type', 'offline');
    oauthUrl.searchParams.append('prompt', 'consent');
    oauthUrl.searchParams.append('state', currentProject.id.toString());
    
    // Redirecionar na mesma página em vez de abrir um popup
    window.location.href = oauthUrl.toString();
  };
  
  // Estado para armazenar as notificações do Supabase
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  const handleAddProject = async (project: Project) => {
    try {
      // Get current user email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.email) {
        console.error("User not authenticated");
        return;
      }
      
      // Format the description field properly
      const formattedDescription = `Company or product name: ${project.company} Audience description: ${project.audience}`;
      
      console.log("Project to save:", project);
      console.log("Country value:", project.country);
      
      // Objeto de inserção no formato exatamente igual ao usado em Settings.tsx
      const projectData = { 
        "Project name": project.name,
        "description service": formattedDescription,
        "url service": project.link,
        "Keywords": project.keywords,
        "User id": currentUser.id,
        "user": currentUser.email,
        "País": project.country  // Exatamente como usado em Settings.tsx linha 1532
      } as any;
      
      console.log("Final project data to insert:", projectData);
      
      const { data, error } = await supabase
        .from('Projeto')
        .insert([projectData])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log("Project created successfully:", data[0]);
        // We don't need to update projects array manually anymore
        // due to real-time subscription, but we should set this as current
        setCurrentProject(data[0]);
      }
      
      setShowProjectModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };
  
  const handleProjectSelect = async (project: any) => {
    // Verificar se já existe uma atualização em progresso
    const atualizacaoEmProgresso = 'projeto_atualizando_' + project.id;
    if (sessionStorage.getItem(atualizacaoEmProgresso) === 'true') {
      console.log("Atualização de projeto já em andamento, aguardando...");
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Fechar dropdown antes de iniciar operação assíncrona
    setShowProjectsDropdown(false);
    
    try {
      console.log("Iniciando seleção de projeto:", project.id);
      
      // Chamar a função para atualizar o projeto no Supabase PRIMEIRO
      await setCurrentProject(project);
      console.log("Projeto atualizado na interface");
    } catch (error) {
      console.error("Erro ao selecionar projeto:", error);
      alert("Ocorreu um erro ao selecionar o projeto. Por favor, tente novamente.");
    } finally {
      // Operação concluída
      console.log("Seleção de projeto concluída");
    }
  };
  
  // A verificação do índice agora é feita completamente no ProjectContext
  // e não precisamos mais desta função redundante
  
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    setShowLanguageMenu(false);
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  
  // Função para buscar notificações
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
      
      // Verificar o valor do projeto atual
      console.log("Buscando notificações para o projeto:", JSON.stringify(currentProject));
      
      // Se não houver projeto selecionado, não mostrar notificações
      if (!currentProject?.id) {
        console.log("Nenhum projeto selecionado, não buscar notificações");
        setNotifications([]);
        setUnreadCount(0);
        setIsLoadingNotifications(false);
        return;
      }
      
      // Extrair o ID do projeto
      const projetoId = Number(currentProject.id);
      console.log("ID do projeto atual:", projetoId, typeof projetoId);
      
      // ABORDAGEM 1: Consulta direta usando a sintaxe exata da documentação do Supabase
      console.log("TENTATIVA 1: Consulta direta com sintaxe padrão");
      let { data: notificacoes1, error: erro1 } = await supabase
        .from('Notificacoes')
        .select("*")
        .eq('projeto_id', projetoId);
        
      if (erro1) {
        console.error("Erro na abordagem 1:", erro1);
      } else {
        console.log("Resultado da abordagem 1:", notificacoes1?.length || 0, notificacoes1);
      }
      
      // ABORDAGEM 2: Consulta direta convertendo ID para string - alguns bancos tratam bigint como string
      console.log("TENTATIVA 2: Consulta com ID como string");
      let { data: notificacoes2, error: erro2 } = await supabase
        .from('Notificacoes')
        .select("*")
        .eq('projeto_id', String(projetoId));
        
      if (erro2) {
        console.error("Erro na abordagem 2:", erro2);
      } else {
        console.log("Resultado da abordagem 2:", notificacoes2?.length || 0, notificacoes2);
      }
      
      // ABORDAGEM 3: Consulta com filtro is não nulo e ordenação
      console.log("TENTATIVA 3: Consulta com is() e não-nulo");
      let { data: notificacoes3, error: erro3 } = await supabase
        .from('Notificacoes')
        .select("*")
        .not('projeto_id', 'is', null)
        .order('created_at', { ascending: false });
        
      if (erro3) {
        console.error("Erro na abordagem 3:", erro3);
      } else {
        console.log("Resultado da abordagem 3:", notificacoes3?.length || 0);
        
        // Filtrar manualmente pelo projeto ID
        const filtrado = notificacoes3?.filter((n: any) => {
          // Tentar diferentes formas de comparação
          const notifId = n.projeto_id;
          console.log(`Comparando: ${notifId} (${typeof notifId}) com ${projetoId} (${typeof projetoId})`);
          return String(notifId) === String(projetoId) || 
                 Number(notifId) === Number(projetoId);
        });
        
        console.log("Filtrado manualmente:", filtrado?.length || 0, filtrado);
        
        if (filtrado && filtrado.length > 0) {
          // Usar os resultados deste método se encontrados
          const formattedData = filtrado.map(formatNotification);
          setNotifications(formattedData);
          
          // Calcular notificações não lidas
          const unread = filtrado.filter((notif: any) => !notif.lido).length;
          console.log("Notificações não lidas encontradas:", unread);
          setUnreadCount(unread);
          setIsLoadingNotifications(false);
          return;
        }
      }
      
      // ABORDAGEM 4: Buscar todas e filtrar depois
      console.log("TENTATIVA 4: Buscar todas e filtrar");
      let { data: todasNotificacoes, error: erroTodas } = await supabase
        .from('Notificacoes')
        .select("*");
        
      if (erroTodas) {
        console.error("Erro ao buscar todas:", erroTodas);
      } else {
        console.log("Total de notificações:", todasNotificacoes?.length || 0);
        
        // Obter valores únicos de projeto_id de forma compatível com todos os níveis do TypeScript
        const valoresUnicos = todasNotificacoes ? 
          Array.from(new Set(todasNotificacoes.map((n: any) => n.projeto_id)))
          : [];
          
        console.log("Valores únicos de projeto_id:", valoresUnicos);
        
        // Tentar encontrar qualquer notificação que possa corresponder
        const possiveisMatches = todasNotificacoes?.filter((n: any) => {
          if (n.projeto_id === null || n.projeto_id === undefined) return false;
          
          // Tentar todas as comparações possíveis
          return String(n.projeto_id) === String(projetoId) || 
                 Number(n.projeto_id) === Number(projetoId) ||
                 n.projeto_id == projetoId; // Comparação fraca para caso de string vs número
        });
        
        console.log("Possíveis matches:", possiveisMatches?.length || 0, possiveisMatches);
        
        if (possiveisMatches && possiveisMatches.length > 0) {
          // Usar estes resultados
          const formattedData = possiveisMatches.map(formatNotification);
          setNotifications(formattedData);
          
          // Calcular não lidas
          const unread = possiveisMatches.filter((notif: any) => !notif.lido).length;
          console.log("Notificações não lidas encontradas:", unread);
          setUnreadCount(unread);
        } else {
          // Sem resultados em nenhuma tentativa
          console.log("Nenhuma notificação encontrada após todas as tentativas");
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentProject]);
  
  // Função auxiliar para formatar uma notificação
  const formatNotification = (notification: any): any => {
    const createdAt = new Date(notification.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    let timeAgo;
    if (diffMins < 1) {
      timeAgo = 'just now';
    } else if (diffMins < 60) {
      timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffMins < 1440) { // menos de 24 horas
      const hours = Math.floor(diffMins / 60);
      timeAgo = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      timeAgo = `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    return {
      ...notification,
      timeAgo
    };
  };
  
  // Função para marcar uma notificação como lida
  const markAsRead = async (id: number, event?: React.MouseEvent<HTMLButtonElement>) => {
    // Impedir propagação do evento para evitar abrir a URL quando clica em "Mark as read"
    if (event) {
      event.stopPropagation();
    }
    
    // Verificar se temos um projeto selecionado
    if (!currentProject?.id) return;
    
    try {
      console.log("Marcando notificação como lida:", id);
      
      // Usar o ID exatamente como está no banco (bigint)
      const { error } = await supabase
        .from('Notificacoes')
        .update({ lido: true })
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return;
      }
      
      console.log("Notificação marcada como lida com sucesso");
      
      // Atualizar o estado local
      setNotifications(prev => prev.map(notif => {
        if (notif.id === id) {
          return { ...notif, lido: true };
        }
        return notif;
      }));
      
      // Atualizar contagem de não lidas
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Forçar a atualização das notificações
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };
  
  // Função para marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    // Verificar se temos um projeto selecionado
    if (!currentProject?.id) return;
    
    try {
      // Garantir que o projeto_id seja tratado como número bigint
      const projetoId = Number(currentProject.id);
      
      console.log("Marcando todas as notificações como lidas para o projeto:", projetoId);
      
      // Usar o update sem filtrar manualmente os IDs
      const { error } = await supabase
        .from('Notificacoes')
        .update({ lido: true })
        .eq('projeto_id', projetoId)
        .eq('lido', false);
      
      if (error) {
        console.error('Erro ao marcar todas notificações como lidas:', error);
        return;
      }
      
      console.log("Todas as notificações marcadas como lidas com sucesso");
      
      // Atualizar o estado local
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, lido: true }))
      );
      
      // Zerar contagem de não lidas
      setUnreadCount(0);
      
      // Forçar a atualização das notificações
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
    }
  };
  
  // Função para abrir URL da notificação
  const openNotificationUrl = (notification: any) => {
    // Verificar se a notificação pertence ao projeto atual
    if (!currentProject?.id) return;
    
    console.log("Abrindo notificação:", notification);
    
    // Se tiver URL, abrir em nova aba
    if (notification.url) {
      window.open(notification.url, '_blank');
    }
    
    // Marcar como lida quando abre
    if (!notification.lido) {
      console.log("Marcando notificação como lida ao abrir:", notification.id);
      markAsRead(notification.id);
    }
  };
  
  // Usar useEffect para buscar notificações quando o componente montar ou o projeto mudar
  useEffect(() => {
    console.log("useEffect de notificações - Projeto atual:", currentProject?.id);
    
    // Configurar apenas a execução inicial, sem polling
    fetchNotifications();
    
    // Configurar realtime subscription para atualizações de notificações
    let subscription: any;
    
    if (currentProject?.id) {
      const projetoId = Number(currentProject.id);
      console.log("Configurando subscription para notificações do projeto:", projetoId);
      
      // Inscrever-se para alterações na tabela Notificacoes para este projeto
      subscription = supabase
        .channel('notificacoes-changes')
        .on('postgres_changes', {
          event: '*', // Escutar inserções, atualizações e exclusões
          schema: 'public',
          table: 'Notificacoes',
          filter: `projeto_id=eq.${projetoId}`
        }, (payload) => {
          console.log("Alteração detectada nas notificações:", payload);
          // Atualizar as notificações quando houver qualquer mudança
          fetchNotifications();
        })
        .subscribe();
    }
    
    return () => {
      console.log("Limpando subscription de notificações");
      if (subscription) {
        // Usar o método unsubscribe() da subscription
        subscription.unsubscribe();
      }
    };
  }, [currentProject?.id, fetchNotifications]); // Incluir fetchNotifications como dependência
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectsRef.current && !projectsRef.current.contains(event.target as Node)) {
        setShowProjectsDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Ajuste de debug - forçar visibilidade do badge
  useEffect(() => {
    console.log("Estado de unreadCount:", unreadCount);
    console.log("Estado de visibilidade badge:", unreadCount > 0 ? 'visible' : 'hidden');
  }, [unreadCount]);

  return (
    <>
      <HeaderContainer>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={projectsRef} style={{ position: 'relative' }}>
            <ProjectSelector onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}>
              <ProjectIcon>
                <IconComponent icon={FaIcons.FaProjectDiagram} />
              </ProjectIcon>
              {currentProject && projects.some(p => p.id === currentProject.id) ? 
                (currentProject["Project name"] || currentProject.name) : 
                t('header.selectProject')}
            </ProjectSelector>
            
            {showProjectsDropdown && (
              <ProjectsDropdown>
                <PopupHeader>{t('header.selectProject')}</PopupHeader>
                {projects.length > 0 ? (
                  <>
                    {projects.map(project => (
                      <ProjectItem key={project.id} onClick={() => handleProjectSelect(project)}>
                        <IconComponent icon={FaIcons.FaFolder} />
                        {project["Project name"] || project.name}
                      </ProjectItem>
                    ))}
                    <ProjectItem onClick={() => setShowProjectModal(true)} style={{borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '15px'}}>
                      <IconComponent icon={FaIcons.FaPlus} />
                      {t('header.createProject')}
                    </ProjectItem>
                  </>
                ) : (
                  <>
                    <ProjectItem>
                      <IconComponent icon={FaIcons.FaExclamationCircle} />
                      {t('project.error')}
                    </ProjectItem>
                    <ProjectItem onClick={() => setShowProjectModal(true)} style={{borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '15px'}}>
                      <IconComponent icon={FaIcons.FaPlus} />
                                              {t('header.createProject')}
                    </ProjectItem>
                  </>
                )}
              </ProjectsDropdown>
            )}
          </div>
        </div>
        
        <RightSection>
          {/* Aviso do YouTube quando verificação estiver completa E não estiver conectado */}
          {/* Mostra o alerta para qualquer projeto, mesmo sem id, para projetos novos */}
          {youtubeStatus.checked && !youtubeStatus.connected && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.08) 0%, rgba(255, 0, 0, 0.12) 100%)',
                padding: '6px 14px',
                borderRadius: '8px',
                marginRight: '15px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'fadeIn 0.5s ease'
              }}
              onClick={initiateYouTubeOAuth}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.12) 0%, rgba(255, 0, 0, 0.18) 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.08) 0%, rgba(255, 0, 0, 0.12) 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.05)';
              }}
            >
              {/* Efeito de luz */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                transform: 'skewX(-25deg)',
                animation: 'shine 3s infinite',
                zIndex: 1
              }} />
              <style>{`
                @keyframes shine {
                  0% { left: -100%; }
                  50% { left: 150%; }
                  100% { left: 150%; }
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                  100% { transform: scale(1); }
                }
              `}</style>
              
              <IconComponent icon={FaIcons.FaYoutube}
                style={{ 
                  color: '#FF0000', 
                  marginRight: '8px',
                  fontSize: '1.1rem',
                  filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.1))',
                  position: 'relative',
                  zIndex: 2,
                  animation: 'pulse 2s infinite'
                }} 
              />
              <span style={{ 
                fontSize: '0.85rem', 
                color: '#333',
                fontWeight: 500,
                position: 'relative',
                zIndex: 2
              }}>
                YouTube Disconnected - Click to Connect
              </span>
            </div>
          )}
        
          <div ref={notificationsRef} style={{ position: 'relative' }}>
            <NotificationBadge 
              onClick={() => {
                console.log("Clicou no ícone de notificações, unreadCount:", unreadCount);
                setShowNotifications(!showNotifications);
                // Forçar busca ao abrir
                if (!showNotifications) {
                  fetchNotifications();
                }
              }}
              data-count={unreadCount}
              style={{ 
                '--notification-visibility': unreadCount > 0 ? 'visible' : 'hidden' 
              } as React.CSSProperties}
            >
              <IconComponent icon={FaIcons.FaBell} />
            </NotificationBadge>
            
            {showNotifications && (
              <NotificationPopup>
                <PopupHeader>
                  {t('header.notifications')}
                  {/* Mostrar "Mark all as read" apenas se houver notificações não lidas */}
                  {unreadCount > 0 && (
                    <span onClick={markAllAsRead}>Mark all as read</span>
                  )}
                </PopupHeader>
                {isLoadingNotifications ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    Loading...
                  </div>
                ) : notifications.length > 0 ? (
                  (() => {
                    // Filtrar notificações: mostrar todas as não lidas + apenas as lidas das últimas 24 horas
                    const last24Hours = new Date();
                    last24Hours.setHours(last24Hours.getHours() - 24); // 24 horas atrás
                    
                    const filteredNotifications = notifications.filter(notification => {
                      if (!notification.lido) return true; // Mostrar todas as não lidas
                      
                      // Para notificações lidas, verificar se está nas últimas 24 horas
                      const notifDate = new Date(notification.created_at);
                      return notifDate >= last24Hours; // Mostrar apenas se for das últimas 24 horas
                    });
                    
                    // Ordenar: não lidas primeiro, depois por data (mais recentes primeiro)
                    const sortedNotifications = [...filteredNotifications].sort((a, b) => {
                      // Primeiro ordenar por status de leitura (não lidas primeiro)
                      if (!a.lido && b.lido) return -1;
                      if (a.lido && !b.lido) return 1;
                      
                      // Se ambas estão no mesmo estado de leitura, ordenar por data (mais recente primeiro)
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });
                    
                    if (sortedNotifications.length === 0) {
                      return (
                        <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.text.secondary }}>
                          No recent notifications
                        </div>
                      );
                    }
                    
                    return sortedNotifications.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        onClick={() => openNotificationUrl(notification)}
                        style={{ 
                          backgroundColor: notification.lido ? 'transparent' : 'rgba(45, 29, 66, 0.05)',
                          borderLeft: notification.lido ? 'none' : `3px solid ${theme.colors.accent.primary}`,
                          position: 'relative' // Para posicionar o indicador "Read"
                        }}
                      >
                        <h4>
                          {notification.comando || 'Notification'}
                          {notification.lido && (
                            <span style={{
                              fontSize: '0.65rem',
                              color: theme.colors.text.secondary,
                              fontWeight: 'normal',
                              background: 'rgba(0,0,0,0.05)',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              marginLeft: '8px',
                              verticalAlign: 'middle',
                              display: 'inline-block'
                            }}>
                              Read
                            </span>
                          )}
                        </h4>
                        <p>{notification.Mensagem}</p>
                        <time>{notification.timeAgo}</time>
                        {!notification.lido && (
                          <MarkAsReadButton onClick={(e) => markAsRead(notification.id, e)}>
                            Mark as read
                          </MarkAsReadButton>
                        )}
                      </NotificationItem>
                    ));
                  })()
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.text.secondary }}>
                    No notifications found
                  </div>
                )}
              </NotificationPopup>
            )}
          </div>
          
          {/* Tema Toggle */}
          <ThemeToggle />
          
          {/* Seletor de idioma */}
          <LanguageSelector />
          
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <UserProfile onClick={() => setShowUserMenu(!showUserMenu)}>
              <UserAvatar>
                <span>
                  {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0)}
                </span>
              </UserAvatar>
            </UserProfile>
            
            {showUserMenu && (
              <UserPopup>
                <UserInfo>
                  <div className="profile-avatar">
                    <UserAvatar className="profile-large">
                      <span>
                        {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0)}
                      </span>
                    </UserAvatar>
                  </div>
                  <h4>{user?.user_metadata?.full_name || user?.email || 'Usuário'}</h4>
                  <p>{user?.email || ''}</p>
                </UserInfo>
                <PopupMenuItem>
                  <IconComponent icon={FaIcons.FaUser} />
                  Profile
                </PopupMenuItem>
                <PopupMenuItem>
                  <IconComponent icon={FaIcons.FaCog} />
                  Settings
                </PopupMenuItem>
                <PopupMenuItem onClick={handleLogout}>
                  <IconComponent icon={FaIcons.FaSignOutAlt} />
                  Logout
                </PopupMenuItem>
              </UserPopup>
            )}
          </div>
        </RightSection>
      </HeaderContainer>
      
      <ProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleAddProject}
      />
    </>
  );
};

export default Header;