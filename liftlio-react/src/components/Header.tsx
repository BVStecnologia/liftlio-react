import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import ProjectModal from './ProjectModal';
import { IconComponent } from '../utils/IconHelper';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabaseClient';

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
  background-color: ${props => props.theme.colors.white};
  box-shadow: ${props => props.theme.shadows.sm};
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
  background: linear-gradient(135deg, #2D1D42, #3b2659);
  color: white;
  padding: 10px 18px;
  border-radius: 8px; /* Menos arredondado */
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  box-shadow: 0 4px 15px rgba(35, 16, 54, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  transition: all 0.35s cubic-bezier(0.17, 0.67, 0.29, 0.96);
  position: relative;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(4px);
  
  /* Edge highlight */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0) 100%);
    opacity: 0.6;
    z-index: 1;
  }
  
  /* Light beam */
  &::after {
    content: '';
    position: absolute;
    width: 1.2px;
    height: 130%;
    top: -15%;
    left: -10%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 10%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0.05) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(20deg);
    z-index: 2;
    box-shadow: 0 0 20px rgba(202, 125, 255, 0.7),
                0 0 40px rgba(202, 125, 255, 0.25);
    filter: blur(0.3px);
    opacity: 0.7;
    animation: projectSelectorBeam 6s cubic-bezier(0.17, 0.67, 0.29, 0.96) infinite;
    animation-delay: 1s;
  }
  
  @keyframes projectSelectorBeam {
    0% {
      left: -5%;
      opacity: 0;
      transform: rotate(20deg) translateY(0);
    }
    10% {
      opacity: 0.7;
    }
    60% {
      opacity: 0.7;
    }
    100% {
      left: 105%;
      opacity: 0;
      transform: rotate(20deg) translateY(0);
    }
  }
  
  &:hover {
    transform: translateY(-2px) scale(1.01);
    background: linear-gradient(135deg, #341f4c, #432e65);
    box-shadow: 0 7px 20px rgba(35, 16, 54, 0.4), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                0 0 15px rgba(131, 58, 244, 0.2);
    
    &::after {
      animation-duration: 3.8s;
      box-shadow: 0 0 25px rgba(202, 125, 255, 0.8),
                  0 0 50px rgba(202, 125, 255, 0.3);
    }
    
    &::before {
      opacity: 0.9;
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.99);
    box-shadow: 0 2px 10px rgba(35, 16, 54, 0.3), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  svg {
    margin-left: 8px;
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.3));
  }

  span, div {
    position: relative;
    z-index: 3;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
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
  background-color: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.lg};
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
    background-color: rgba(45, 29, 66, 0.04);
    border-left: 3px solid ${props => props.theme.colors.primary || '#2D1D42'};
  }

  &:active {
    background-color: rgba(45, 29, 66, 0.08);
  }

  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
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
    color: ${props => props.theme.colors.darkGrey};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    background-color: ${props => props.theme.colors.error};
    border-radius: 50%;
    box-shadow: 0 0 0 2px white;
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
    color: #2D1D42;
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${props => props.theme.colors.darkGrey};
    line-height: 1.4;
  }
  
  time {
    display: block;
    font-size: 0.75rem;
    color: ${props => props.theme.colors.grey};
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(245, 245, 250, 0.5);
  font-size: 0.95rem;
  color: #2D1D42;
  
  span {
    font-size: 0.8rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
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
  background: linear-gradient(145deg, #231036, #3d2956);
  position: relative;
  box-shadow: 0 2px 15px rgba(35, 16, 54, 0.4);
  transition: all 0.3s cubic-bezier(.25,.8,.25,1);
  isolation: isolate;
  
  span {
    color: white;
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-size: 1.3rem;
    text-transform: uppercase;
    position: relative;
    z-index: 3;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }
  
  /* Ambient inner glow */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(131, 58, 244, 0.15) 0%,
      rgba(76, 0, 139, 0.03) 60%,
      rgba(0, 0, 0, 0) 100%
    );
    z-index: 1;
  }
  
  /* Primary light beam */
  &::after {
    content: '';
    position: absolute;
    width: 1.5px;
    height: 100%;
    top: 0;
    bottom: 0;
    left: -10%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 10%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(255, 255, 255, 0.05) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    z-index: 2;
    box-shadow: 0 0 12px rgba(131, 58, 244, 0.8),
                0 0 30px rgba(131, 58, 244, 0.3);
    opacity: 0.9;
    filter: blur(0.4px);
    animation: luxScanMove 4.5s cubic-bezier(0.3, 0, 0.2, 1) infinite;
    animation-delay: 0.2s;
  }
  
  /* Secondary subtle lights */
  &:before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 70% 20%, rgba(131, 58, 244, 0.15) 0%, transparent 25%),
      radial-gradient(circle at 30% 80%, rgba(76, 0, 139, 0.1) 0%, transparent 20%);
    z-index: 1;
  }
  
  /* Holographic rim light effect */
  &:after {
    box-shadow: 
      inset 0 0 2px rgba(255, 255, 255, 0.4),
      0 0 12px rgba(131, 58, 244, 0.8),
      0 0 30px rgba(131, 58, 244, 0.3);
  }
  
  @keyframes luxScanMove {
    0% {
      left: -10%;
      opacity: 0;
      transform: skewX(-15deg);
    }
    15% {
      opacity: 0.9;
      transform: skewX(-15deg);
    }
    80% {
      opacity: 0.9;
      transform: skewX(-5deg);
    }
    100% {
      left: 110%;
      opacity: 0;
      transform: skewX(-5deg);
    }
  }
  
  &:hover {
    box-shadow: 0 5px 20px rgba(35, 16, 54, 0.6), 0 0 15px rgba(131, 58, 244, 0.4);
    transform: translateY(-1px) scale(1.03);
    background: linear-gradient(145deg, #2a1340, #44305f);
    
    &::after {
      animation-duration: 2.8s;
      box-shadow: 0 0 20px rgba(131, 58, 244, 0.9),
                  0 0 40px rgba(131, 58, 244, 0.4);
    }
    
    span {
      text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  text-align: center;
  background-color: rgba(245, 245, 250, 0.3);
  
  h4 {
    margin: 10px 0 5px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: #2D1D42;
  }
  
  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${props => props.theme.colors.darkGrey};
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
  background: rgba(131, 58, 244, 0.15);
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
  box-shadow: 0 3px 10px rgba(35, 16, 54, 0.25),
              inset 0 0 0 1px rgba(255, 255, 255, 0.08),
              0 0 0 0 rgba(131, 58, 244, 0.3);
  
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
                0 0 30px rgba(131, 58, 244, 0.3);
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
      rgba(131, 58, 244, 0) 0%, 
      rgba(131, 58, 244, 0.4) 100%
    );
    mask: linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  
  &:hover {
    background: rgba(131, 58, 244, 0.2);
    box-shadow: 0 5px 15px rgba(35, 16, 54, 0.35),
                inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                0 0 15px rgba(131, 58, 244, 0.2);
    transform: translateY(-2px) scale(1.01);
                
    &::after {
      animation-duration: 2.8s;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.6),
                  0 0 40px rgba(131, 58, 244, 0.4);
    }
    
    &:after {
      opacity: 1;
    }
    
    svg {
      filter: drop-shadow(0 0 4px rgba(131, 58, 244, 0.6));
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 2px 8px rgba(35, 16, 54, 0.2),
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
    filter: drop-shadow(0 0 2px rgba(131, 58, 244, 0.4));
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
    color: ${props => props.theme.colors.darkGrey};
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
      rgba(131, 58, 244, 0.7) 0%, 
      rgba(131, 58, 244, 0.3) 50%,
      rgba(131, 58, 244, 0.1) 100%);
    transition: width 0.4s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    z-index: 2;
  }
  
  &:hover {
    background-color: rgba(131, 58, 244, 0.03);
    border-left: 2px solid #843af4;
    
    &:before {
      width: 100%;
      animation: ${projectItemHover} 0.5s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    }
    
    svg {
      color: #843af4;
      filter: drop-shadow(0 0 3px rgba(131, 58, 244, 0.3));
      transform: scale(1.1);
    }
  }
  
  &:active {
    background-color: rgba(131, 58, 244, 0.06);
  }
  
  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
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
      rgba(131, 58, 244, 0.7) 0%,
      rgba(131, 58, 244, 0.1) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease, height 0.3s cubic-bezier(0.17, 0.67, 0.29, 0.96);
    z-index: 1;
    box-shadow: 0 0 8px rgba(131, 58, 244, 0.3);
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
      
      const { data, error } = await supabase
        .from('Projeto')
        .insert([{ 
          "Project name": project.name,
          "description service": formattedDescription,
          "url service": project.link,
          "Keywords": project.keywords,
          "User id": currentUser.id,
          "user": currentUser.email
        }])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // We don't need to update projects array manually anymore
        // due to real-time subscription, but we should set this as current
        setCurrentProject(data[0]);
      }
      
      setShowProjectModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };
  
  const handleProjectSelect = (project: any) => {
    setCurrentProject(project);
    setShowProjectsDropdown(false);
  };
  
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