import React, { ReactNode, useEffect } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import TechBackground from './TechBackground';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* Valor explícito muito alto para garantir que esteja acima de tudo */
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
  opacity: ${props => (props.isOpen ? 1 : 0)};
  overflow: hidden;
`;

const ModalContainer = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.xl};
  overflow: hidden;
  width: ${props => {
    switch (props.size) {
      case 'small': return '400px';
      case 'large': return '800px';
      default: return '600px';
    }
  }};
  max-width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: 2;
  position: relative;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const ModalTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.radius.circle};
`;

const ModalBody = styled.div`
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid ${props => props.theme.colors.lightGrey};
`;

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'small' | 'medium' | 'large';
};

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium' 
}) => {
  // Close on escape key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Prevent scrolling of body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Sempre rendereizar o modal, mas com visibilidade controlada
  // Isso evita o efeito de "piscada" durante remontagens
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick} data-testid="modal-overlay">
      <TechBackground zIndex={1} />
      <ModalContainer size={size}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>
            <IconComponent icon={FaIcons.FaTimes} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {children}
        </ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default Modal;