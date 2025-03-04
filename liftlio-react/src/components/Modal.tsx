import React, { ReactNode, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import * as FaIcons from 'react-icons/fa';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndices.modal};
  animation: ${fadeIn} 0.3s ease;
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
  opacity: ${props => (props.isOpen ? 1 : 0)};
  transition: visibility 0.3s ease, opacity 0.3s ease;
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
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
  transition: all ${props => props.theme.transitions.default};
  
  &:hover {
    background-color: ${props => props.theme.colors.lightGrey};
    color: ${props => props.theme.colors.text};
  }
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
  
  if (!isOpen) return null;
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer size={size}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>
            {React.createElement(FaIcons.FaTimes)}
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