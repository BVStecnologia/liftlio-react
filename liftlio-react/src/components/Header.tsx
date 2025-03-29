import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import ProjectModal from './ProjectModal';
import { IconComponent } from '../utils/IconHelper';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
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
  background-color: ${COLORS.SECONDARY}; /* Branco (30%) */
  box-shadow: ${COLORS.SHADOW.LIGHT};
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT}; /* Cinza médio (60%) */
  color: ${COLORS.TEXT.ON_LIGHT};
  --color-dominant: ${COLORS.DOMINANT};
  --color-secondary: ${COLORS.SECONDARY};
  --color-accent: ${COLORS.ACCENT};
  position: sticky;
  top: 0;
  z-index: 900; /* High but lower than sidebar (1000) */
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);

  @media (max-width: 768px) {
    padding: 10px 16px;
    flex-wrap: wrap;
  }
`;

const ProjectSelector = styled.div`
  display: flex;
  align-items: center;
  background: ${COLORS.ACCENT}; /* Azul naval escuro (10%) */
  color: ${COLORS.TEXT.ON_DARK};
  padding: 10px 18px;
  border-radius: 12px; /* Mais arredondado para modernidade */
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  box-shadow: ${COLORS.SHADOW.MEDIUM}, 
              inset 0 0 0 1px ${withOpacity(COLORS.SECONDARY, 0.08)},
              0 0 0 rgba(45, 62, 80, 0);
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
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 10%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(255, 255, 255, 0.05) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(20deg) translateZ(5px);
    z-index: 2;
    box-shadow: 0 0 25px rgba(45, 62, 80, 0.8),
                0 0 45px rgba(45, 62, 80, 0.3);
    filter: blur(0.2px);
    opacity: 0.8;
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
    background: linear-gradient(135deg, ${COLORS.ACCENT} 0%, ${COLORS.ACCENT_LIGHT} 100%);
    box-shadow: ${COLORS.SHADOW.STRONG}, 
                inset 0 0 0 1px ${withOpacity(COLORS.SECONDARY, 0.15)},
                0 0 20px ${withOpacity(COLORS.ACCENT, 0.4)};
    
    &::after {
      animation-duration: 3s;
      box-shadow: 0 0 30px rgba(45, 62, 80, 0.9),
                  0 0 60px rgba(45, 62, 80, 0.4);
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
  background-color: ${COLORS.SECONDARY};
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${COLORS.SHADOW.STRONG};
  z-index: ${props => props.theme.zIndices.dropdown};
  overflow: hidden;
  margin-top: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);

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

  &:hover {
    background-color: ${COLORS.DOMINANT_LIGHTER};
    border-left: 3px solid ${COLORS.ACCENT};
  }

  &:active {
    background-color: ${props => `${props.theme.colors.primary}14`};
  }

  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${COLORS.ACCENT};
    opacity: 0.7;
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
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    font-size: 1.3rem;
    color: ${COLORS.TEXT.SECONDARY};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    background-color: ${COLORS.ERROR};
    border-radius: 50%;
    box-shadow: 0 0 0 2px ${COLORS.SECONDARY};
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
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
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

const NotificationItem = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: rgba(45, 29, 66, 0.03);
  }

  &:last-child {
    border-bottom: none;
  }
  
  h4 {
    font-weight: ${props => props.theme.fontWeights.medium};
    margin: 0 0 6px 0;
    font-size: 0.9rem;
    color: ${COLORS.TEXT.ON_LIGHT};
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${COLORS.TEXT.SECONDARY};
    line-height: 1.4;
  }
  
  time {
    display: block;
    font-size: 0.75rem;
    color: ${COLORS.DOMINANT_DARK};
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
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${COLORS.DOMINANT_LIGHTER};
  font-size: 0.95rem;
  color: ${COLORS.TEXT.ON_LIGHT};
  
  span {
    font-size: 0.8rem;
    color: ${COLORS.ACCENT};
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
    background-color: rgba(0, 0, 0, 0.05);
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
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
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
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT};
  text-align: center;
  background-color: ${COLORS.DOMINANT_LIGHTER};
  
  h4 {
    margin: 10px 0 5px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${COLORS.TEXT.ON_LIGHT};
  }
  
  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${COLORS.TEXT.SECONDARY};
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
  background: ${COLORS.ACCENT}; /* Azul naval escuro (10%) */
  color: ${COLORS.TEXT.ON_DARK};
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

const LanguageSelector = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px; /* Menos arredondado */
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    font-size: 1.3rem;
    color: ${COLORS.TEXT.SECONDARY};
    margin-right: 5px;
  }

  @media (max-width: 768px) {
    padding: 4px 8px;
  }

  @media (max-width: 480px) {
    padding: 4px 6px;
    
    svg {
      font-size: 1.1rem;
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
  background-color: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  margin-top: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
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
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
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
      color: ${props => props.theme.colors.primary};
      filter: drop-shadow(0 0 3px ${props => `${props.theme.colors.primary}4D`});
      transform: scale(1.1);
    }
  }
  
  &:active {
    background-color: rgba(45, 62, 80, 0.06);
  }
  
  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.primary};
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
  const [currentLanguage, setCurrentLanguage] = useState('EN');
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
  
  // Função para verificar a conexão com YouTube usando a nova função RPC
  const checkYouTubeConnection = async () => {
    // Forçar o estado para "verificando" durante a consulta
    setYoutubeStatus({ checked: false, connected: false });
    
    try {
      // Obter o email do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        console.log('Usuário não autenticado, YouTube desconectado');
        setYoutubeStatus({ checked: true, connected: false });
        return;
      }
      
      const email_usuario = user.email;
      console.log('Verificando conexão do YouTube para usuário:', email_usuario);
      
      // Chamar a função RPC que valida por email usando fetch direto
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/verificar_integracao_youtube_por_email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email_usuario })
      });
      
      const data = await response.json();
      const error = !response.ok ? { message: 'Erro ao verificar integração' } : null;
      
      if (error) {
        console.error('Erro ao verificar integração do YouTube:', error);
        setYoutubeStatus({ checked: true, connected: false });
        return;
      }
      
      // O resultado da função RPC já indica se a integração está ativa
      const isConnected = !!data;
      
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
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload"
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
  
  const notifications = [
    { id: '1', title: 'New mention', message: 'Your product was mentioned on Twitter', time: '2 hours ago' },
    { id: '2', title: 'Sentiment analysis', message: 'New analysis available for review', time: '5 hours ago' },
    { id: '3', title: 'Weekly report', message: 'Your weekly report is ready', time: '1 day ago' }
  ];
  
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
                "Select a project"}
            </ProjectSelector>
            
            {showProjectsDropdown && (
              <ProjectsDropdown>
                <PopupHeader>Your Projects</PopupHeader>
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
                      New Project
                    </ProjectItem>
                  </>
                ) : (
                  <>
                    <ProjectItem>
                      <IconComponent icon={FaIcons.FaExclamationCircle} />
                      No projects found
                    </ProjectItem>
                    <ProjectItem onClick={() => setShowProjectModal(true)} style={{borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '15px'}}>
                      <IconComponent icon={FaIcons.FaPlus} />
                      Create Project
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
            <NotificationBadge onClick={() => setShowNotifications(!showNotifications)}>
              <IconComponent icon={FaIcons.FaBell} />
            </NotificationBadge>
            
            {showNotifications && (
              <NotificationPopup>
                <PopupHeader>
                  Notifications
                  <span>Mark all as read</span>
                </PopupHeader>
                {notifications.map(notification => (
                  <NotificationItem key={notification.id}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <time>{notification.time}</time>
                  </NotificationItem>
                ))}
              </NotificationPopup>
            )}
          </div>
          
          <div ref={languageRef} style={{ position: 'relative' }}>
            <LanguageSelector onClick={() => setShowLanguageMenu(!showLanguageMenu)}>
              <IconComponent icon={FaIcons.FaGlobe} />
              {currentLanguage}
            </LanguageSelector>
            
            {showLanguageMenu && (
              <LanguagePopup>
                <PopupMenuItem onClick={() => handleLanguageChange('EN')}>
                  <IconComponent icon={FaIcons.FaFlag} />
                  English
                </PopupMenuItem>
                <PopupMenuItem onClick={() => handleLanguageChange('PT')}>
                  <IconComponent icon={FaIcons.FaFlag} />
                  Português
                </PopupMenuItem>
              </LanguagePopup>
            )}
          </div>
          
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