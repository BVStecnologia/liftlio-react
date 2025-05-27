import React, { useState } from 'react';
import styled from 'styled-components';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { IconComponent } from '../utils/IconHelper';

const SelectorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.border.primary};
  border-radius: 8px;
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.bg.hover};
    border-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.border.focus};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  svg {
    font-size: 0.8rem;
  }
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: ${props => props.theme.components.modal.bg};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.border.primary};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows.lg};
  min-width: 120px;
  z-index: 1000;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease;
`;

const DropdownItem = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: ${props => props.active ? props.theme.colors.bg.active : 'transparent'};
  border: none;
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
  
  &:first-child {
    border-radius: 8px 8px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 8px 8px;
  }
  
  &:only-child {
    border-radius: 8px;
  }
  
  &:hover {
    background: ${props => props.theme.colors.bg.hover};
  }
`;

const FlagIcon = styled.span`
  font-size: 1.2rem;
  line-height: 1;
`;

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = (langCode: 'en' | 'pt') => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('[data-language-selector]')) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <SelectorContainer data-language-selector>
      <SelectorButton 
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('header.language')}
      >
        <IconComponent icon={FaGlobe} />
        <FlagIcon>{currentLanguage?.flag}</FlagIcon>
        <IconComponent icon={FaChevronDown} />
      </SelectorButton>
      
      <DropdownMenu isOpen={isOpen}>
        {languages.map((lang) => (
          <DropdownItem
            key={lang.code}
            active={language === lang.code}
            onClick={() => handleLanguageChange(lang.code as 'en' | 'pt')}
          >
            <FlagIcon>{lang.flag}</FlagIcon>
            {lang.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </SelectorContainer>
  );
};

export default LanguageSelector; 