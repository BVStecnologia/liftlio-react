import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { 
  FaCog, FaUser, FaBell, FaPalette, FaShieldAlt, FaPlus, FaTimes, 
  FaCheck, FaFont, FaSlidersH, FaMoon, FaSun, FaSave, FaRedo, 
  FaCloudUploadAlt, FaSearch, FaChevronDown, FaSort, FaDatabase, 
  FaTrashAlt, FaExternalLinkAlt, FaInfoCircle 
} from 'react-icons/fa';
import { IconComponent, renderIcon } from '../utils/IconHelper';

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

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  transition: all 0.2s ease;
  background-color: white;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
  
  &:disabled {
    background-color: ${props => props.theme.colors.lightGrey};
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.grey};
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  background-color: white;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.grey};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
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
        case 'primary': return props.theme.colors.secondary;
        case 'secondary': return 'rgba(94, 53, 177, 0.1)';
        case 'danger': return '#d32f2f';
        case 'success': return '#2e7d32';
        default: return props.theme.colors.secondary;
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
  left: 0;
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

// Sample data
const activeKeywords = [
  'ai affiliate marketing',
  'passive income with ai',
  'ai product reviews'
];

const colors = [
  { name: 'Purple', value: '#5e35b1' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Red', value: '#f44336' }
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('interface');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [borderRadius, setBorderRadius] = useState(8);
  const [fontSize, setFontSize] = useState(1.0);
  const [showSaveBar, setShowSaveBar] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordError, setKeywordError] = useState('');
  const [projectName, setProjectName] = useState('Project 2');
  const [projectLink, setProjectLink] = useState('https://humanlikewriter.com');
  const [showTooltip, setShowTooltip] = useState('');
  
  // Detect changes to show save bar
  useEffect(() => {
    setShowSaveBar(true);
    
    // Auto-hide save success message after 3 seconds
    if (showSaveSuccess) {
      const timer = setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedColor, isDarkMode, borderRadius, fontSize, projectName, projectLink]);

  const handleSaveSettings = () => {
    // Simulate saving settings
    setTimeout(() => {
      setShowSaveSuccess(true);
      
      // Hide the save bar after a delay
      setTimeout(() => {
        setShowSaveBar(false);
      }, 3000);
    }, 800);
  };
  
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      setKeywordError('Please enter a keyword');
      return;
    }
    
    if (activeKeywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywordError('This keyword already exists');
      return;
    }
    
    // In a real app, you would update the list with an API call
    // For now, just close the modal and reset form
    setKeywordError('');
    setNewKeyword('');
    setShowAddKeywordModal(false);
  };
  
  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };
  
  const updateRangeBackground = (value: number, min: number, max: number) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%)`;
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <PageContainer>
        <PageHeader>
          <PageTitle>Settings</PageTitle>
        </PageHeader>
        
        <TabsContainer>
          <TabItem 
            active={activeTab === 'project'} 
            onClick={() => setActiveTab('project')}
            style={{ animationDelay: '0.1s' }}
          >
            {renderIcon(FaCog)}
            Project
          </TabItem>
          <TabItem 
            active={activeTab === 'account'} 
            onClick={() => setActiveTab('account')}
            style={{ animationDelay: '0.2s' }}
          >
            {renderIcon(FaUser)}
            Account
          </TabItem>
          <TabItem 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
            style={{ animationDelay: '0.3s' }}
          >
            {renderIcon(FaBell)}
            Notifications
          </TabItem>
          <TabItem 
            active={activeTab === 'interface'} 
            onClick={() => setActiveTab('interface')}
            style={{ animationDelay: '0.4s' }}
          >
            {renderIcon(FaPalette)}
            Interface
          </TabItem>
          <TabItem 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')}
            style={{ animationDelay: '0.5s' }}
          >
            {renderIcon(FaShieldAlt)}
            Security
          </TabItem>
        </TabsContainer>
        
        <ContentContainer>
          {activeTab === 'project' && (
            <Card>
              <SectionTitle>
                {renderIcon(FaCog)}
                Project Settings
              </SectionTitle>
              
              <FormSection>
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="projectName">
                      Project name
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
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)} 
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="projectLink">
                      Project link
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
                        value={projectLink}
                        onChange={(e) => setProjectLink(e.target.value)}
                      />
                      {renderIcon(FaExternalLinkAlt)}
                    </InputWithIcon>
                  </FormGroup>
                </FormRow>
                
                <FormGroup>
                  <Label htmlFor="companyName">Company or product name</Label>
                  <Input 
                    id="companyName" 
                    type="text" 
                    placeholder="Enter your company or product name" 
                    defaultValue="Humanlike Writer"
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="audienceDescription">Audience description</Label>
                  <TextArea 
                    id="audienceDescription" 
                    placeholder="Describe your target audience"
                    defaultValue="Humanlike Writer is for Affiliate Marketers who need content for their website to increase affiliate commissions. Humanlike Writer is an AI writer the mimics human writing that sounds like a person actually tested the product. More genuine-sounding content increases trust and conversions. Right now you can get 3 free articles to test out the ai writer."
                  />
                </FormGroup>
              </FormSection>
              
              <FormSection>
                <FormGroup>
                  <Label htmlFor="region">Region</Label>
                  <Select id="region" defaultValue="US">
                    <option value="US">United States</option>
                    <option value="EU">European Union</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="BR">Brazil</option>
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="language">Language</Label>
                  <Select id="language" defaultValue="en">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                  </Select>
                </FormGroup>
              </FormSection>
              
              <FormSection>
                <SectionTitle>Keywords</SectionTitle>
                
                <FormGroup>
                  <Label>Active Keywords</Label>
                  <KeywordsContainer>
                    {activeKeywords.map((keyword, index) => (
                      <KeywordItem key={keyword} style={{ animationDelay: `${index * 0.1}s` }}>
                        <KeywordText>{keyword}</KeywordText>
                        <KeywordActions>
                          <IconButton title="Edit keyword">
                            {renderIcon(FaSort)}
                          </IconButton>
                          <IconButton title="Deactivate keyword">
                            {renderIcon(FaTrashAlt)}
                          </IconButton>
                        </KeywordActions>
                      </KeywordItem>
                    ))}
                  </KeywordsContainer>
                  <AddButton 
                    variant="secondary"
                    onClick={() => setShowAddKeywordModal(true)}
                  >
                    {renderIcon(FaPlus)} Add new keyword
                  </AddButton>
                </FormGroup>
                
                <FormGroup>
                  <Label>Negative keywords</Label>
                  <AddButton 
                    variant="secondary"
                  >
                    {renderIcon(FaPlus)} Add negative keyword
                  </AddButton>
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
          
          {activeTab === 'interface' && (
            <Card>
              <SectionTitle>
                {renderIcon(FaPalette)}
                Interface Settings
              </SectionTitle>
              
              <FormSection>
                <Label>Primary Color</Label>
                <ColorPalette>
                  {colors.map((color, index) => (
                    <ColorOptionWithLabel key={color.name} style={{ animationDelay: `${index * 0.1}s` }}>
                      <ColorOption 
                        color={color.value}
                        active={selectedColor === color.value}
                        onClick={() => setSelectedColor(color.value)}
                      />
                      <ColorLabel>{color.name}</ColorLabel>
                    </ColorOptionWithLabel>
                  ))}
                </ColorPalette>
              </FormSection>
              
              <FormSection>
                <Label>Color Mode</Label>
                <ToggleContainer>
                  <ToggleSwitch>
                    <input 
                      type="checkbox" 
                      checked={isDarkMode}
                      onChange={() => setIsDarkMode(!isDarkMode)}
                    />
                    <span />
                  </ToggleSwitch>
                  <ToggleLabel>
                    {isDarkMode ? 
                      <>{renderIcon(FaMoon)} Dark Mode</> : 
                      <>{renderIcon(FaSun)} Light Mode</>
                    }
                  </ToggleLabel>
                </ToggleContainer>
              </FormSection>
              
              <FormSection>
                <SectionTitle>
                  {renderIcon(FaSlidersH)}
                  Layout Options
                </SectionTitle>
                
                <FormGroup>
                  <RangeLabel>
                    <Label htmlFor="borderRadius">Border Radius</Label>
                    <SliderValue>{borderRadius}px</SliderValue>
                  </RangeLabel>
                  <RangeSlider>
                    <RangeInput 
                      type="range" 
                      id="borderRadius"
                      min="0" 
                      max="20" 
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                      style={{ background: updateRangeBackground(borderRadius, 0, 20) }}
                    />
                  </RangeSlider>
                </FormGroup>
              </FormSection>
              
              <FormSection>
                <SectionTitle>
                  {renderIcon(FaFont)}
                  Typography
                </SectionTitle>
                
                <FormGroup>
                  <RangeLabel>
                    <Label htmlFor="fontSize">Font Size Scale</Label>
                    <SliderValue>{fontSize.toFixed(1)}x</SliderValue>
                  </RangeLabel>
                  <RangeSlider>
                    <RangeInput 
                      type="range" 
                      id="fontSize"
                      min="0.8" 
                      max="1.2" 
                      step="0.1"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseFloat(e.target.value))}
                      style={{ background: updateRangeBackground(fontSize, 0.8, 1.2) }}
                    />
                  </RangeSlider>
                </FormGroup>
              </FormSection>
              
              <ThemePreviewContainer>
                <PreviewTitle>
                  {renderIcon(FaCheck)} Theme Preview
                </PreviewTitle>
                
                <ThemePreviewFlex>
                  <ThemePreviewSidebar bgColor={selectedColor} isDark={isDarkMode}>
                    <div className="sidebar-icon active">{renderIcon(FaCog)}</div>
                    <div className="sidebar-icon">{renderIcon(FaUser)}</div>
                    <div className="sidebar-icon">{renderIcon(FaBell)}</div>
                    <div className="sidebar-icon">{renderIcon(FaDatabase)}</div>
                  </ThemePreviewSidebar>
                  
                  <ThemePreviewMain isDark={isDarkMode}>
                    <ThemePreviewHeader bgColor={selectedColor}>
                      Dashboard
                    </ThemePreviewHeader>
                    
                    <ThemePreviewContent>
                      <PreviewCard isDark={isDarkMode} style={{ borderRadius: `${borderRadius}px` }}>
                        <PreviewCardHeader>
                          <PreviewCardTitle color={selectedColor} isDark={isDarkMode}>
                            Welcome back, User!
                          </PreviewCardTitle>
                        </PreviewCardHeader>
                        <div style={{ fontSize: `${14 * fontSize}px` }}>
                          This preview shows how your selected theme settings will look 
                          when applied to the dashboard.
                        </div>
                        <PreviewMetric isDark={isDarkMode} style={{ borderRadius: `${borderRadius}px` }}/>
                      </PreviewCard>
                      
                      <PreviewCard isDark={isDarkMode} style={{ borderRadius: `${borderRadius}px` }}>
                        <PreviewCardHeader>
                          <PreviewCardTitle color={selectedColor} isDark={isDarkMode}>
                            Recent Activity
                          </PreviewCardTitle>
                        </PreviewCardHeader>
                        <div style={{ fontSize: `${14 * fontSize}px` }}>
                          Adjust the settings on the left to see changes reflected here.
                        </div>
                        <PreviewMetric isDark={isDarkMode} style={{ borderRadius: `${borderRadius}px` }}/>
                      </PreviewCard>
                    </ThemePreviewContent>
                  </ThemePreviewMain>
                </ThemePreviewFlex>
              </ThemePreviewContainer>
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