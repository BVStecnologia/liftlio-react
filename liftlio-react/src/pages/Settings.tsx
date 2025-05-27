import React, { useState, useEffect, useRef, ReactElement } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { IconType } from 'react-icons';
import { 
  FaCog, FaUser, FaBell, FaPalette, FaShieldAlt, FaPlus, FaTimes, 
  FaCheck, FaFont, FaSlidersH, FaMoon, FaSun, FaSave, FaRedo, 
  FaCloudUploadAlt, FaSearch, FaChevronDown, FaSort, FaDatabase, 
  FaTrashAlt, FaExternalLinkAlt, FaInfoCircle, FaToggleOn, FaToggleOff,
  FaYoutube
} from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';

// Helper function to render icons safely (to avoid the import conflict)
const renderIcon = (Icon: IconType | undefined): ReactElement | null => {
  if (!Icon) return null;
  // @ts-ignore - workaround to handle IconType correctly
  return <Icon />;
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(94, 53, 177, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(94, 53, 177, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(94, 53, 177, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

// Styled Components
const PageContainer = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  position: relative;
  
  &::after {
    content: '';
    display: block;
    width: 60px;
    height: 4px;
    background: ${props => props.theme.colors.gradient.primary};
    margin-top: 8px;
    border-radius: 2px;
  }
`;

const SettingsContainer = styled.div`
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 30px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  
  @media (max-width: 768px) {
    overflow-x: auto;
    padding-bottom: 5px;
    
    &::-webkit-scrollbar {
      height: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: ${props => props.theme.colors.lightGrey};
      border-radius: 4px;
    }
  }
`;

const TabItem = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 15px 25px;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: ${props => props.active ? props.theme.colors.primary : 'transparent'};
    border-radius: 3px 3px 0 0;
    transition: all 0.3s ease;
  }
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
  
  svg {
    margin-right: 10px;
    font-size: 1.2rem;
    color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  }
  
  animation: ${slideIn} 0.3s ease forwards;
`;

const ContentContainer = styled.div`
  animation: ${fadeIn} 0.4s ease;
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  
  .loading-text {
    margin-top: 20px;
    font-weight: 500;
    color: ${props => props.theme.colors.darkGrey};
  }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: ${props => props.theme.colors.primary};
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-bottom: 25px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
  }
`;

const FormSection = styled.div`
  margin-bottom: 35px;
  padding-bottom: 25px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const FormGroup = styled.div<{ hasError?: boolean }>`
  margin-bottom: 24px;
  position: relative;
  
  ${props => props.hasError && css`
    input, textarea, select {
      border-color: ${props.theme.colors.error};
      
      &:focus {
        box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
      }
    }
  `}
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.darkGrey};
  display: flex;
  align-items: center;
  
  .info-icon {
    margin-left: 8px;
    color: ${props => props.theme.colors.primary};
    font-size: 16px;
    cursor: pointer;
    opacity: 0.7;
    transition: all 0.2s ease;
    
    &:hover {
      opacity: 1;
    }
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-top: 5px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 5px;
    font-size: 12px;
  }
`;

const InfoTooltip = styled.div`
  position: absolute;
  background: white;
  border-radius: ${props => props.theme.radius.md};
  padding: 10px 15px;
  box-shadow: ${props => props.theme.shadows.md};
  z-index: 10;
  width: 250px;
  top: 0;
  left: 100%;
  margin-left: 15px;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text};
  border-left: 3px solid ${props => props.theme.colors.primary};
  pointer-events: none;
  animation: ${fadeIn} 0.2s ease;
`;

const Input = styled.input<{ changed?: boolean }>`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.changed ? props.theme.colors.primary : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  transition: all 0.2s ease;
  background-color: ${props => {
    if (props.changed) {
      return props.theme.name === 'dark' ? 'rgba(94, 53, 177, 0.1)' : 'rgba(94, 53, 177, 0.05)';
    }
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white';
  }};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'};
  }
  
  &:disabled {
    background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : props.theme.colors.lightGrey};
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const InputWithIcon = styled.div`
  position: relative;
  
  svg {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.colors.darkGrey};
    cursor: pointer;
  }
  
  input {
    padding-right: 40px;
  }
`;

const TextArea = styled.textarea<{ changed?: boolean }>`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.changed ? props.theme.colors.primary : props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  background-color: ${props => props.changed ? 'rgba(94, 53, 177, 0.05)' : 'white'};
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.grey};
  }
`;

const Select = styled.select<{ changed?: boolean }>`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.changed ? props.theme.colors.primary : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: ${props => {
    if (props.changed) {
      return props.theme.name === 'dark' ? 'rgba(94, 53, 177, 0.1)' : 'rgba(94, 53, 177, 0.05)';
    }
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white';
  }};
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${props => props.theme.name === 'dark' ? '%23999' : '%23666'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'};
  }
  
  option {
    background-color: ${props => props.theme.name === 'dark' ? '#1a1a1a' : 'white'};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ColorPalette = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
`;

const ColorOption = styled.div<{ color: string; active: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${props => props.color};
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  border: 3px solid ${props => props.active ? '#fff' : 'transparent'};
  transition: all 0.3s ease;
  position: relative;
  
  ${props => props.active && css`
    &::after {
      content: '';
      position: absolute;
      width: 60px;
      height: 60px;
      border: 2px solid ${props.color};
      border-radius: 50%;
      top: -8px;
      left: -8px;
    }
  `}
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ColorLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  text-align: center;
  margin-top: 8px;
`;

const ColorOptionWithLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeIn} 0.4s ease;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 15px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.grey};
    transition: .3s;
    border-radius: 28px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
  }
  
  input:checked + span {
    background-color: ${props => props.theme.colors.primary};
  }
  
  input:focus + span {
    box-shadow: 0 0 1px ${props => props.theme.colors.primary};
  }
  
  input:checked + span:before {
    transform: translateX(28px);
  }
`;

const ToggleLabel = styled.div`
  display: flex;
  align-items: center;
  margin-left: 15px;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
  
  svg {
    margin-right: 8px;
  }
`;

const KeywordsContainer = styled.div`
  margin-top: 15px;
  animation: ${fadeIn} 0.4s ease;
`;

const KeywordItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: ${props => props.theme.colors.lightBg};
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 12px;
  transition: all 0.2s ease;
  border-left: 3px solid ${props => props.theme.colors.primary};
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.sm};
    transform: translateX(3px);
  }
`;

const KeywordText = styled.div`
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const KeywordActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'success' }>`
  background-color: ${props => {
    switch (props.variant) {
      case 'primary': return props.theme.colors.primary;
      case 'secondary': return 'transparent';
      case 'danger': return props.theme.colors.error;
      case 'success': return props.theme.colors.success;
      default: return props.theme.colors.primary;
    }
  }};
  color: ${props => props.variant === 'secondary' ? props.theme.colors.primary : 'white'};
  border: ${props => props.variant === 'secondary' ? `1px solid ${props.theme.colors.primary}` : 'none'};
  padding: 8px 16px;
  border-radius: ${props => props.theme.radius.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${props => {
      switch (props.variant) {
        case 'primary': return props.theme.colors.ACCENT_LIGHT;
        case 'secondary': return 'rgba(94, 53, 177, 0.1)';
        case 'danger': return '#d32f2f';
        case 'success': return '#2e7d32';
        default: return props.theme.colors.ACCENT_LIGHT;
      }
    }};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    margin-right: ${props => props.children ? '8px' : '0'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const IconButton = styled.button`
  background-color: transparent;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.radius.circle};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.lightGrey};
    color: ${props => props.theme.colors.primary};
  }
`;

const AddButton = styled(ActionButton)`
  margin: 15px 0;
`;

const FormRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
  
  > div {
    flex: 1;
  }
`;

const ThemePreviewContainer = styled.div`
  margin-top: 30px;
  background-color: ${props => props.theme.colors.lightBg};
  border-radius: ${props => props.theme.radius.lg};
  padding: 25px;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const PreviewTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 10px;
    color: ${props => props.theme.colors.primary};
  }
`;

const ThemePreviewFlex = styled.div`
  display: flex;
  gap: 25px;
  
  @media (max-width: 992px) {
    flex-direction: column;
  }
`;

const ThemePreviewSidebar = styled.div<{ bgColor: string; isDark: boolean }>`
  width: 70px;
  background-color: ${props => props.bgColor};
  border-radius: ${props => props.theme.radius.md};
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  
  @media (max-width: 992px) {
    width: 100%;
    height: 70px;
    flex-direction: row;
    padding: 0 15px;
    justify-content: center;
  }
  
  .sidebar-icon {
    width: 35px;
    height: 35px;
    border-radius: ${props => props.theme.radius.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
    transition: all 0.2s ease;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    &.active {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }
`;

const ThemePreviewMain = styled.div<{ isDark: boolean }>`
  flex: 1;
  background-color: ${props => props.isDark ? '#272734' : 'white'};
  border-radius: ${props => props.theme.radius.md};
  padding: 20px;
  min-height: 300px;
  color: ${props => props.isDark ? 'white' : props.theme.colors.text};
  transition: all 0.3s ease;
`;

const ThemePreviewHeader = styled.div<{ bgColor: string }>`
  background-color: ${props => props.bgColor};
  color: white;
  padding: 12px 20px;
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 20px;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ThemePreviewContent = styled.div`
  padding: 10px;
`;

const PreviewCard = styled.div<{ isDark: boolean }>`
  background-color: ${props => props.isDark ? '#323242' : props.theme.colors.lightBg};
  border-radius: ${props => props.theme.radius.md};
  padding: 15px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
`;

const PreviewCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const PreviewCardTitle = styled.div<{ color: string; isDark: boolean }>`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.isDark ? 'white' : props.color};
`;

const PreviewMetric = styled.div<{ isDark: boolean }>`
  background-color: ${props => props.isDark ? 'rgba(255, 255, 255, 0.1)' : 'white'};
  border-radius: ${props => props.theme.radius.md};
  height: 30px;
  margin-top: 10px;
`;

const RangeSlider = styled.div`
  margin-top: 15px;
  position: relative;
`;

const RangeLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SliderValue = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
`;

const RangeInput = styled.input`
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: ${props => `linear-gradient(to right, ${props.theme.colors.primary} 0%, ${props.theme.colors.primary} 50%, ${props.theme.colors.lightGrey} 50%, ${props.theme.colors.lightGrey} 100%)`};
  border-radius: 10px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 0 0 1px ${props => props.theme.colors.primary}, 0 3px 5px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 0 0 1px ${props => props.theme.colors.primary}, 0 3px 5px rgba(0, 0, 0, 0.2);
  }
  
  &:focus {
    &::-webkit-slider-thumb {
      box-shadow: 0 0 0 1px ${props => props.theme.colors.primary}, 0 0 0 3px rgba(94, 53, 177, 0.2), 0 3px 5px rgba(0, 0, 0, 0.2);
    }
    
    &::-moz-range-thumb {
      box-shadow: 0 0 0 1px ${props => props.theme.colors.primary}, 0 0 0 3px rgba(94, 53, 177, 0.2), 0 3px 5px rgba(0, 0, 0, 0.2);
    }
  }
`;

const SettingsSaveBar = styled.div<{ visible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 250px; /* Considera o espaço para o menu lateral */
  right: 0;
  background-color: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transform: translateY(${props => props.visible ? '0' : '100%'});
  transition: transform 0.3s ease;
  z-index: 100;
  
  @media (max-width: 768px) {
    left: 0; /* Em dispositivos móveis, ocupa toda a largura */
  }
`;

const SaveStatus = styled.div`
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.success};
  
  svg {
    margin-right: 8px;
  }
`;

const SaveActions = styled.div`
  display: flex;
  gap: 10px;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: ${props => props.theme.radius.lg};
  padding: 25px;
  width: 100%;
  max-width: 500px;
  box-shadow: ${props => props.theme.shadows.lg};
  animation: ${fadeIn} 0.4s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.error};
    transform: rotate(90deg);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
`;

// Theme data
const colors = [
  { name: 'Purple', value: '#5e35b1' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Red', value: '#f44336' }
];

// KeywordScanner interface
interface KeywordScanner {
  id: number;
  "Keyword": string;
  "Ativa?": boolean;
  "Videos": number | null;
  "COMENTS": number | null;
  created_at: string;
}

// KeywordOverview interface
interface KeywordOverview {
  keyword: string;
  project_id: number;
  total_videos: number;
  total_views: number;
  avg_likes: number;
  total_leads: number;
  converted_leads: number;
  keyword_composite_score: number;
}

// KeywordScannersList component
const KeywordScannersList: React.FC<{ projectId: string | number }> = ({ projectId }) => {
  const [scanners, setScanners] = useState<KeywordScanner[]>([]);
  const [keywordStats, setKeywordStats] = useState<Record<string, KeywordOverview>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch scanners
        const { data: scannersData, error: scannersError } = await supabase
          .from('Scanner de videos do youtube')
          .select('*')
          .eq('Projeto_id', projectId);
          
        if (scannersError) {
          throw scannersError;
        }
        
        setScanners(scannersData || []);
        
        // Fetch keyword stats from the view
        const { data: statsData, error: statsError } = await supabase
          .from('keyword_overview')
          .select('keyword, project_id, total_videos, total_views, avg_likes, total_leads, converted_leads, keyword_composite_score')
          .eq('project_id', projectId);
          
        if (statsError) {
          console.error('Error fetching keyword stats:', statsError);
          // Don't throw here - we still want to show scanners even if stats fail
        }
        
        // Convert array to object with keyword as key for easier lookup
        const statsMap: Record<string, KeywordOverview> = {};
        if (statsData) {
          statsData.forEach((stat: KeywordOverview) => {
            statsMap[stat.keyword] = stat;
          });
        }
        
        setKeywordStats(statsMap);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load keyword scanners');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  const toggleScannerActive = async (scannerId: number, currentActiveState: boolean) => {
    try {
      const { error } = await supabase
        .from('Scanner de videos do youtube')
        .update({ "Ativa?": !currentActiveState })
        .eq('id', scannerId);
        
      if (error) throw error;
      
      // Update local state
      setScanners(prev => 
        prev.map(scanner => 
          scanner.id === scannerId 
            ? { ...scanner, "Ativa?": !currentActiveState } 
            : scanner
        )
      );
    } catch (err: any) {
      console.error('Error toggling scanner status:', err);
      alert('Failed to update scanner status. Please try again.');
    }
  };
  
  const addNewScanner = async (keyword: string) => {
    if (!keyword.trim() || !projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('Scanner de videos do youtube')
        .insert([
          { 
            "Keyword": keyword.trim(),
            "Ativa?": true,
            "Projeto_id": projectId
          }
        ])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setScanners(prev => [...prev, data[0]]);
      }
    } catch (err: any) {
      console.error('Error adding new scanner:', err);
      alert('Failed to add new scanner. Please try again.');
    }
  };
  
  const [newKeyword, setNewKeyword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  if (isLoading) {
    return (
      <LoadingOverlay>
        <Spinner />
        <div className="loading-text">Loading keyword scanners...</div>
      </LoadingOverlay>
    );
  }
  
  if (error) {
    return <div>Error loading scanners: {error}</div>;
  }
  
  return (
    <div>
      <div style={{ marginBottom: '15px' }}>
        <p>Keyword scanners monitor platforms for mentions of your keywords and collect data for analysis.</p>
      </div>
      
      {scanners.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
          No keyword scanners configured. Add a scanner to start monitoring.
        </div>
      ) : (
        <KeywordsContainer>
          {scanners.map((scanner) => (
            <ScannerItem key={scanner.id}>
              <ScannerItemLeft>
                <IconComponent icon={FaDatabase} style={{ marginRight: '10px' }} />
                <ScannerKeyword>{scanner.Keyword}</ScannerKeyword>
                {keywordStats[scanner.Keyword] && 
                  <ScannerScore score={keywordStats[scanner.Keyword].keyword_composite_score || 0}>
                    {Math.round((keywordStats[scanner.Keyword].keyword_composite_score || 0) * 100)}
                  </ScannerScore>
                }
              </ScannerItemLeft>
              <ScannerStats>
                <ScannerStat title="Videos found">
                  <b>{keywordStats[scanner.Keyword]?.total_videos || 0}</b> videos
                </ScannerStat>
                <ScannerStat title="Engagement">
                  <b>{keywordStats[scanner.Keyword] ? 
                     (keywordStats[scanner.Keyword].total_views / 1000).toFixed(1) + 'K' : 0}</b> views
                </ScannerStat>
                <ScannerStat title="Leads">
                  <b>{keywordStats[scanner.Keyword]?.total_leads || 0}</b> leads
                </ScannerStat>
              </ScannerStats>
              <ScannerActions>
                <ScannerToggle
                  active={scanner["Ativa?"] || false}
                  onClick={() => toggleScannerActive(scanner.id, scanner["Ativa?"] || false)}
                  title={scanner["Ativa?"] ? "Deactivate scanner" : "Activate scanner"}
                >
                  {scanner["Ativa?"] 
                    ? <IconComponent icon={FaToggleOn} /> 
                    : <IconComponent icon={FaToggleOff} />
                  }
                </ScannerToggle>
              </ScannerActions>
            </ScannerItem>
          ))}
        </KeywordsContainer>
      )}
      
      <AddButton 
        variant="secondary"
        onClick={() => setShowAddModal(true)}
      >
        {renderIcon(FaPlus)} Add keyword scanner
      </AddButton>
      
      {showAddModal && (
        <Modal onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Add Keyword Scanner</ModalTitle>
              <CloseButton onClick={() => setShowAddModal(false)}>
                {renderIcon(FaTimes)}
              </CloseButton>
            </ModalHeader>
            
            <FormGroup>
              <Label htmlFor="newScannerKeyword">Keyword to monitor</Label>
              <Input 
                id="newScannerKeyword"
                placeholder="Enter a keyword to monitor across platforms"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                autoFocus
              />
            </FormGroup>
            
            <ModalFooter>
              <ActionButton 
                variant="secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton 
                variant="primary"
                onClick={() => {
                  if (newKeyword.trim()) {
                    addNewScanner(newKeyword);
                    setNewKeyword('');
                    setShowAddModal(false);
                  }
                }}
                disabled={!newKeyword.trim()}
              >
                Add Scanner
              </ActionButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};

// Additional styled components for the scanner list
const ScannerItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: ${props => props.theme.colors.lightBg};
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 12px;
  border-left: 3px solid ${props => props.theme.colors.primary};
  animation: ${fadeIn} 0.4s ease;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

const ScannerItemLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const ScannerKeyword = styled.div`
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
  margin-right: 10px;
`;

const ScannerScore = styled.div<{ score: number }>`
  background-color: ${props => {
    // Color gradient based on score (0-1)
    if (props.score > 0.7) return '#4caf50'; // High - green
    if (props.score > 0.4) return '#ff9800'; // Medium - orange
    return '#f44336'; // Low - red
  }};
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 10px;
  margin-left: 8px;
`;

const ScannerStats = styled.div`
  display: flex;
  gap: 15px;
  padding: 0 15px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ScannerStat = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  min-width: 80px;
  text-align: center;
`;

const ScannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ScannerToggle = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.active ? props.theme.colors.success : props.theme.colors.darkGrey};
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`;

// Styled components for negative keywords
const NegativeKeywordsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
`;

const NegativeKeywordTag = styled.div`
  display: flex;
  align-items: center;
  background-color: #f1f1f1;
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.grey};
`;

const NegativeKeywordRemove = styled.button`
  border: none;
  background: none;
  color: ${props => props.theme.colors.darkGrey};
  margin-left: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  
  &:hover {
    color: ${props => props.theme.colors.error};
  }
`;

const Settings: React.FC<{}> = () => {
  // Get current project from context
  const { currentProject } = useProject();
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  // State for negative keywords
  const [newNegativeKeyword, setNewNegativeKeyword] = useState('');

  // State for project data
  const [projectData, setProjectData] = useState({
    id: '',
    "Project name": '',
    url_service: '',
    description_service: '',
    "Keywords": '',
    "Negative keywords": '',
    "País": '',
    user: '',
    "User id": '',
    "Youtube Active": false
  });
  
  // Parse keywords from string to array
  const activeKeywords = projectData.Keywords ? projectData.Keywords.split(',').map(k => k.trim()) : [];
  
  // Helper functions for negative keywords
  const getNegativeKeywords = (): string[] => {
    const keywords = projectData["Negative keywords"] || '';
    return keywords.split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword !== '');
  };
  
  const addNegativeKeyword = () => {
    if (!newNegativeKeyword.trim()) return;
    
    const currentKeywords = getNegativeKeywords();
    
    // Check if keyword already exists
    if (currentKeywords.includes(newNegativeKeyword.trim())) {
      alert('This negative keyword already exists.');
      return;
    }
    
    // Add the new keyword to the existing list
    const updatedKeywords = [...currentKeywords, newNegativeKeyword.trim()].join(', ');
    
    // Update project data
    setProjectData({
      ...projectData,
      "Negative keywords": updatedKeywords
    });
    
    // Clear input
    setNewNegativeKeyword('');
  };
  
  const removeNegativeKeyword = (keywordToRemove: string) => {
    const currentKeywords = getNegativeKeywords();
    const updatedKeywords = currentKeywords
      .filter(keyword => keyword !== keywordToRemove)
      .join(', ');
    
    // Update project data
    setProjectData({
      ...projectData,
      "Negative keywords": updatedKeywords
    });
  };
  
  // UI state
  const [activeTab, setActiveTab] = useState('project');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [borderRadius, setBorderRadius] = useState(8);
  const [fontSize, setFontSize] = useState(1.0);
  const [showSaveBar, setShowSaveBar] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordError, setKeywordError] = useState('');
  const [showTooltip, setShowTooltip] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Load project data from Supabase
  useEffect(() => {
    async function fetchProjectData() {
      if (!currentProject?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('Fetching data for project ID:', currentProject.id);
        
        const { data, error } = await supabase
          .from('Projeto')
          .select('*')
          .eq('id', currentProject.id)
          .single();
          
        if (error) {
          console.error('Error fetching project data:', error);
          return;
        }
        
        if (data) {
          console.log('Project data loaded:', data);
          console.log('Keys in data:', Object.keys(data));
          
          // Map the fields correctly based on the Supabase table structure
          const mappedData = {
            id: data.id,
            "Project name": data["Project name"] || '',
            url_service: data["url service"] || '',
            description_service: data["description service"] || '',
            "Keywords": data["Keywords"] || '',
            "Negative keywords": data["Negative keywords"] || '',
            "País": data["País"] || '',
            user: data.user || '',
            "User id": data["User id"] || '',
            "Youtube Active": data["Youtube Active"] || false
          };
          
          // Use the mapped data
          setProjectData(mappedData);
          
          // Also set the original data right away to ensure consistency
          setOriginalData({...mappedData});
          
          // Clear any changed fields
          setChangedFields({});
          setShowSaveBar(false);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProjectData();
  }, [currentProject?.id]);
  
  // Store the original data loaded from database
  const [originalData, setOriginalData] = useState<any>(null);
  
  // Track which fields have been changed
  const [changedFields, setChangedFields] = useState<{[key: string]: boolean}>({});
  
  // Flag to prevent handling state updates during save operation
  const [isSaving, setIsSaving] = useState(false);
  
  // Set initial data after loading
  useEffect(() => {
    if (!isLoading && projectData.id) {
      // Store a copy of the original DB data for comparison
      const dbData = {...projectData};
      setOriginalData(dbData);
      
      // Ensure any save indicators are cleared
      setChangedFields({});
      setShowSaveBar(false);
    }
  }, [isLoading, projectData.id]);
  
  // Function to check if a value has been changed from its original value
  const isFieldChanged = (currentValue: any, originalValue: any) => {
    // Special handling for strings to handle whitespace and empty values consistently
    if (typeof currentValue === 'string' && typeof originalValue === 'string') {
      return currentValue.trim() !== originalValue.trim();
    }
    
    // Handle null/undefined/empty string cases
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return !(originalValue === null || originalValue === undefined || originalValue === '');
    }
    
    if (originalValue === null || originalValue === undefined || originalValue === '') {
      return !(currentValue === null || currentValue === undefined || currentValue === '');
    }
    
    // Default comparison
    return currentValue !== originalValue;
  };

  // Function to check if the current project state differs from original
  const checkIfDataChanged = () => {
    if (!originalData || isSaving) return false;
    
    // Use isFieldChanged to properly compare all fields
    if (isFieldChanged(projectData["Project name"], originalData["Project name"])) return true;
    if (isFieldChanged(projectData.url_service, originalData.url_service)) return true;
    if (isFieldChanged(projectData.description_service, originalData.description_service)) return true;
    if (isFieldChanged(projectData.Keywords, originalData.Keywords)) return true;
    if (isFieldChanged(projectData["Negative keywords"], originalData["Negative keywords"])) return true;
    if (isFieldChanged(projectData["País"], originalData["País"])) return true;
    if (isFieldChanged(projectData["Youtube Active"], originalData["Youtube Active"])) return true;
    
    // No changes detected
    return false;
  };
  
  // Function to toggle project active state
  const toggleYoutubeActive = () => {
    setProjectData(prev => ({
      ...prev,
      "Youtube Active": !prev["Youtube Active"]
    }));
  };
  
  // Create direct change handlers for each field
  const handleFieldChange = (field: string, value: any) => {
    // Only proceed if we have original data to compare against
    if (!originalData) return;
    
    // Update the project data with the new value
    const updatedData = {...projectData, [field]: value};
    setProjectData(updatedData);
    
    // Directly calculate which fields have changed from original
    const newChangedFields: {[key: string]: boolean} = {};
    
    // Use the isFieldChanged function to do proper comparison
    newChangedFields["Project name"] = isFieldChanged(updatedData["Project name"], originalData["Project name"]);
    newChangedFields["url_service"] = isFieldChanged(updatedData.url_service, originalData.url_service);
    newChangedFields["description_service"] = isFieldChanged(updatedData.description_service, originalData.description_service);
    newChangedFields["Keywords"] = isFieldChanged(updatedData.Keywords, originalData.Keywords);
    newChangedFields["Negative keywords"] = isFieldChanged(updatedData["Negative keywords"], originalData["Negative keywords"]);
    newChangedFields["País"] = isFieldChanged(updatedData["País"], originalData["País"]);
    newChangedFields["Youtube Active"] = isFieldChanged(updatedData["Youtube Active"], originalData["Youtube Active"]);
    
    console.log('Field changed:', field, 'New value:', value, 'Changed fields:', newChangedFields);
    
    setChangedFields(newChangedFields);
    
    // Check if any field has changes to determine if we show the save bar
    const hasChanges = Object.values(newChangedFields).some(changed => changed === true);
    setShowSaveBar(hasChanges);
  };
  
  // Watch for any external changes to project data and update changed fields
  useEffect(() => {
    if (originalData && !isSaving && !showSaveSuccess) {
      const hasChanges = checkIfDataChanged();
      setShowSaveBar(hasChanges);
    }
  }, [projectData, originalData, isSaving, showSaveSuccess]);
  
  // Auto-hide save success message after 3 seconds
  useEffect(() => {
    if (showSaveSuccess) {
      const timer = setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showSaveSuccess]);

  const handleSaveSettings = async () => {
    if (!currentProject?.id) return;
    
    // If there are no changes, don't do anything
    if (!checkIfDataChanged()) {
      console.log('No changes to save');
      return;
    }
    
    // Mark that we're in a saving operation to prevent UI flickers
    setIsSaving(true);
    
    try {
      // Prepare the update object with correctly mapped field names for the database
      const updateData: any = {
        "Project name": projectData["Project name"],
        "url service": projectData.url_service,
        "description service": projectData.description_service,
        "Keywords": projectData.Keywords,
        "Negative keywords": projectData["Negative keywords"],
        "País": projectData["País"],
        "Youtube Active": projectData["Youtube Active"]
      };
        
      console.log('Data to update:', updateData);
        
      const { error } = await supabase
        .from('Projeto')
        .update(updateData)
        .eq('id', currentProject.id);
          
      if (error) {
        console.error('Error details:', error);
        console.error('Error updating project:', error);
        setIsSaving(false);
        return;
      } 
      
      // Verify the update
      const { data: updatedData, error: fetchError } = await supabase
        .from('Projeto')
        .select('*')
        .eq('id', currentProject.id)
        .single();
          
      if (fetchError) {
        console.error('Error fetching updated data:', fetchError);
        setIsSaving(false);
        return;
      }
          
      console.log('Updated project data:', updatedData);
        
      if (updatedData) {
        // Map the data to our internal structure
        const mappedData = {
          id: updatedData.id,
          "Project name": updatedData["Project name"] || '',
          url_service: updatedData["url service"] || '',
          description_service: updatedData["description service"] || '',
          "Keywords": updatedData["Keywords"] || '',
          "Negative keywords": updatedData["Negative keywords"] || '',
          "País": updatedData["País"] || '',
          user: updatedData.user || '',
          "User id": updatedData["User id"] || '',
          "Youtube Active": updatedData["Youtube Active"] || false
        };
          
        // Store the updated data as our new reference point
        setOriginalData({...mappedData});
          
        // Reset our project data to match the DB
        setProjectData({...mappedData});
          
        // Reset all UI state to normal
        setChangedFields({});
        setShowSaveBar(false);
        setIsSaving(false);
          
        // Show success message
        setShowSaveSuccess(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsSaving(false);
    }
  };
  
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      setKeywordError('Please enter a keyword');
      return;
    }
    
    if (activeKeywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywordError('This keyword already exists');
      return;
    }
    
    try {
      // Add the new keyword to the existing list
      const updatedKeywords = activeKeywords.length > 0 
        ? [...activeKeywords, newKeyword.trim()].join(', ')
        : newKeyword.trim();
      
      // Update local state
      setProjectData({
        ...projectData,
        Keywords: updatedKeywords
      });
      
      setKeywordError('');
      setNewKeyword('');
      setShowAddKeywordModal(false);
    } catch (error) {
      console.error('Error adding keyword:', error);
      setKeywordError('Failed to add keyword');
    }
  };
  
  const handleRemoveKeyword = (keywordToRemove: string) => {
    try {
      // Remove the keyword from the list
      const updatedKeywords = activeKeywords
        .filter(keyword => keyword !== keywordToRemove)
        .join(', ');
      
      // Update local state
      setProjectData({
        ...projectData,
        Keywords: updatedKeywords
      });
    } catch (error) {
      console.error('Error removing keyword:', error);
    }
  };
  
  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };
  
  // Function to render debug info (disabled)
  
  const updateRangeBackground = (value: number, min: number, max: number) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%)`;
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <PageContainer>
        <PageHeader>
          <PageTitle>{t('settings.title')}</PageTitle>
        </PageHeader>
        
        <TabsContainer>
          <TabItem 
            active={activeTab === 'project'} 
            onClick={() => setActiveTab('project')}
            style={{ animationDelay: '0.1s' }}
          >
            {renderIcon(FaCog)}
            {t('settings.general')}
          </TabItem>
          <TabItem 
            active={activeTab === 'account'} 
            onClick={() => setActiveTab('account')}
            style={{ animationDelay: '0.2s' }}
          >
            {renderIcon(FaUser)}
            {t('settings.profile')}
          </TabItem>
          <TabItem 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
            style={{ animationDelay: '0.3s' }}
          >
            {renderIcon(FaBell)}
            {t('settings.notifications')}
          </TabItem>
        </TabsContainer>
        
        <ContentContainer>
          {isLoading ? (
            <Card>
              <LoadingOverlay>
                <Spinner />
                <div className="loading-text">{t('loading.projectData')}</div>
              </LoadingOverlay>
            </Card>
          ) : activeTab === 'project' && (
            <Card>
              <SectionTitle>
                {renderIcon(FaCog)}
                {t('settings.projectSettings')}
              </SectionTitle>
              
              <FormSection>
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="projectName">
                      {t('settings.projectName')}
                      <span 
                        className="info-icon" 
                        onMouseEnter={() => setShowTooltip('projectName')}
                        onMouseLeave={() => setShowTooltip('')}
                      >
                        {renderIcon(FaInfoCircle)}
                      </span>
                    </Label>
                    {showTooltip === 'projectName' && (
                      <InfoTooltip>
                        The name of your project for organization purposes.
                      </InfoTooltip>
                    )}
                    <Input 
                      id="projectName" 
                      type="text" 
                      value={projectData["Project name"] || ''}
                      changed={changedFields["Project name"]}
                      onChange={(e) => handleFieldChange("Project name", e.target.value)} 
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="projectLink">
                      {t('settings.website')}
                      <span 
                        className="info-icon" 
                        onMouseEnter={() => setShowTooltip('projectLink')}
                        onMouseLeave={() => setShowTooltip('')}
                      >
                        {renderIcon(FaInfoCircle)}
                      </span>
                    </Label>
                    {showTooltip === 'projectLink' && (
                      <InfoTooltip>
                        The URL of your project website or application.
                      </InfoTooltip>
                    )}
                    <InputWithIcon>
                      <Input 
                        id="projectLink" 
                        type="url" 
                        value={projectData.url_service || ''}
                        changed={changedFields["url_service"]}
                        onChange={(e) => handleFieldChange("url_service", e.target.value)}
                      />
                      {renderIcon(FaExternalLinkAlt)}
                    </InputWithIcon>
                  </FormGroup>
                </FormRow>
                
                <FormGroup>
                  <Label htmlFor="companyName">{t('settings.company')}</Label>
                  <Input 
                    id="companyName" 
                    type="text" 
                    placeholder={t('project.companyPlaceholder')} 
                    value={projectData.description_service ? 
                      (projectData.description_service.split('Company or product name:')[1]?.split('Audience description:')[0]?.trim() || '') : ''}
                    onChange={(e) => {
                      const audienceDesc = projectData.description_service ? 
                        (projectData.description_service.split('Audience description:')[1]?.trim() || '') : '';
                      
                      setProjectData({
                        ...projectData,
                        description_service: `Company or product name: ${e.target.value} Audience description: ${audienceDesc}`
                      });
                    }}
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="audienceDescription">{t('settings.audience')}</Label>
                  <TextArea 
                    id="audienceDescription" 
                    placeholder={t('project.audiencePlaceholder')}
                    value={projectData.description_service ? 
                      (projectData.description_service.split('Audience description:')[1]?.trim() || '') : ''}
                    onChange={(e) => {
                      // Extract company name
                      const companyName = projectData.description_service ? 
                        (projectData.description_service.split('Company or product name:')[1]?.split('Audience description:')[0]?.trim() || '') : '';
                      
                      setProjectData({
                        ...projectData,
                        description_service: `Company or product name: ${companyName} Audience description: ${e.target.value}`
                      });
                    }}
                  />
                </FormGroup>
              </FormSection>
              
              <FormSection>
                <FormGroup>
                  <Label htmlFor="region">{t('settings.country')}</Label>
                  <Select 
                    id="region" 
                    value={projectData["País"] || "US"}
                    changed={changedFields["País"]}
                    onChange={(e) => handleFieldChange("País", e.target.value)}
                  >
                    <option value="US">US</option>
                    <option value="BR">BR</option>
                  </Select>
                </FormGroup>
                
              </FormSection>
              
              <FormSection>
                <SectionTitle>
                  {renderIcon(FaDatabase)}
                  {t('settings.keywordScanners')}
                </SectionTitle>
                
                {currentProject?.id ? (
                  <KeywordScannersList projectId={currentProject.id} />
                ) : (
                  <div>{t('settings.selectProject')}</div>
                )}
                
                <FormGroup style={{ marginTop: '30px' }}>
                  <Label>{t('settings.negativeKeywords')}</Label>
                  <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                    {t('settings.negativeKeywordsDescription')}
                  </div>
                  
                  {getNegativeKeywords().length > 0 ? (
                    <NegativeKeywordsContainer>
                      {getNegativeKeywords().map((keyword, index) => (
                        <NegativeKeywordTag key={index}>
                          {keyword}
                          <NegativeKeywordRemove 
                            onClick={() => removeNegativeKeyword(keyword)}
                            title="Remove negative keyword"
                          >
                            {renderIcon(FaTimes)}
                          </NegativeKeywordRemove>
                        </NegativeKeywordTag>
                      ))}
                    </NegativeKeywordsContainer>
                  ) : (
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f9f9f9', 
                      borderRadius: '8px', 
                      marginBottom: '15px',
                      color: theme.colors.text.secondary 
                    }}>
                      {t('settings.noNegativeKeywords')}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Input
                      placeholder={t('settings.addNegativeKeywordPlaceholder')}
                      value={newNegativeKeyword}
                      onChange={(e) => setNewNegativeKeyword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newNegativeKeyword.trim()) {
                          e.preventDefault();
                          addNegativeKeyword();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <ActionButton
                      variant="secondary"
                      onClick={addNegativeKeyword}
                      disabled={!newNegativeKeyword.trim()}
                    >
                      {t('common.add')}
                    </ActionButton>
                  </div>
                </FormGroup>
              </FormSection>
                
              <FormSection>
                <SectionTitle>Data Management</SectionTitle>
                <FormGroup>
                  <Label>Data retention period</Label>
                  <Select defaultValue="90">
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label>Project Status</Label>
                  <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                    Disabling the project will pause monitoring and integrations
                  </div>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input 
                        type="checkbox" 
                        checked={projectData["Youtube Active"]}
                        onChange={toggleYoutubeActive}
                      />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      {projectData["Youtube Active"] ? 
                        <><IconComponent icon={FaYoutube} style={{ color: '#FF0000' }} /> Project Active</> : 
                        <><IconComponent icon={FaYoutube} style={{ color: '#999' }} /> Project Disabled</>
                      }
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormRow>
                  <ActionButton variant="secondary">
                    {renderIcon(FaCloudUploadAlt)} Export Data
                  </ActionButton>
                  
                  <ActionButton variant="danger">
                    {renderIcon(FaTrashAlt)} Clear Project Data
                  </ActionButton>
                </FormRow>
              </FormSection>
              
            </Card>
          )}
          
          {activeTab === 'account' && (
            <Card>
              <SectionTitle>
                {renderIcon(FaUser)}
                Account Settings
              </SectionTitle>
              
              <FormSection>
                <FormGroup>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    placeholder="Your full name"
                    defaultValue="Current User" 
                    disabled
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    To change user data, please contact your administrator
                  </div>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your.email@example.com"
                    defaultValue="user@current.com" 
                    disabled
                  />
                </FormGroup>
              </FormSection>
            </Card>
          )}
          
          {activeTab === 'notifications' && (
            <Card>
              <SectionTitle>
                {renderIcon(FaBell)}
                Notification Settings
              </SectionTitle>
              
              <FormSection>
                <SectionTitle style={{ fontSize: '1.1rem' }}>Email Notifications</SectionTitle>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={true} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      Daily mentions summary
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={true} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      Important mention alerts
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={false} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      New feature notifications
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={false} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      Monthly newsletter
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
              </FormSection>
              
              <FormSection>
                <SectionTitle style={{ fontSize: '1.1rem' }}>In-App Notifications</SectionTitle>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={true} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      New mentions found
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={true} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      Mention sentiment changes
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <ToggleContainer>
                    <ToggleSwitch>
                      <input type="checkbox" defaultChecked={true} />
                      <span />
                    </ToggleSwitch>
                    <ToggleLabel>
                      Scanner status updates
                    </ToggleLabel>
                  </ToggleContainer>
                </FormGroup>
                
                <FormGroup>
                  <Label>Notification frequency</Label>
                  <Select defaultValue="immediate">
                    <option value="immediate">Immediately</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                </FormGroup>
              </FormSection>
            </Card>
          )}
          
        </ContentContainer>
        
        <SettingsSaveBar visible={showSaveBar}>
          {showSaveSuccess ? (
            <SaveStatus>
              {renderIcon(FaCheck)} Settings saved successfully
            </SaveStatus>
          ) : (
            <div>You have unsaved changes</div>
          )}
          <SaveActions>
            <ActionButton 
              variant="secondary"
              onClick={() => setShowSaveBar(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton 
              variant="primary"
              onClick={handleSaveSettings}
              style={{ color: 'white' }}
            >
              {renderIcon(FaSave)} Save Changes
            </ActionButton>
          </SaveActions>
        </SettingsSaveBar>
        
        {showAddKeywordModal && (
          <Modal onClick={() => setShowAddKeywordModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Add Keyword</ModalTitle>
                <CloseButton onClick={() => setShowAddKeywordModal(false)}>
                  {renderIcon(FaTimes)}
                </CloseButton>
              </ModalHeader>
              
              <FormGroup hasError={!!keywordError}>
                <Label htmlFor="newKeyword">Keyword</Label>
                <Input 
                  id="newKeyword"
                  placeholder="Enter a keyword or phrase to track"
                  value={newKeyword}
                  onChange={(e) => {
                    setNewKeyword(e.target.value);
                    setKeywordError('');
                  }}
                  autoFocus
                />
                {keywordError && (
                  <ErrorMessage>
                    {renderIcon(FaTimes)} {keywordError}
                  </ErrorMessage>
                )}
              </FormGroup>
              
              <ModalFooter>
                <ActionButton 
                  variant="secondary"
                  onClick={() => setShowAddKeywordModal(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton 
                  variant="primary"
                  onClick={handleAddKeyword}
                >
                  Add Keyword
                </ActionButton>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </PageContainer>
    </IconContext.Provider>
  );
};

export default Settings;