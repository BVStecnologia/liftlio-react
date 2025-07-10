import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';

// Animações
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

// Styled Components
const FloatingButton = styled.button<{ hasNotification: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.theme.colors.accent.primary}, ${props => props.theme.colors.accent.secondary});
  border: none;
  color: white;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
  animation: ${fadeIn} 0.5s ease, ${props => props.hasNotification ? bounce : 'none'} 2s infinite;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
    width: 56px;
    height: 56px;
  }
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid ${props => props.theme.components.card.bg};
  animation: ${pulse} 2s infinite;
`;

const ChatWidget = styled.div<{ isOpen: boolean }>`
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 380px;
  height: 600px;
  background: ${props => props.theme.name === 'dark' ? '#1a1a1a' : '#ffffff'};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column;
  z-index: 999;
  animation: ${slideUp} 0.3s ease;
  border: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
  overflow: hidden;

  @media (max-width: 768px) {
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  @media (max-width: 480px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  background: ${props => props.theme.name === 'dark' ? '#0f0f0f' : '#f9fafb'};
  border-bottom: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
  gap: 12px;
`;

const AgentAvatar = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, ${props => props.theme.colors.accent.primary}, ${props => props.theme.colors.accent.secondary});
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const AgentInfo = styled.div`
  flex: 1;
`;

const AgentName = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const AgentStatus = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusDot = styled.span<{ isOnline: boolean }>`
  width: 8px;
  height: 8px;
  background: ${props => props.isOnline ? '#10b981' : '#6b7280'};
  border-radius: 50%;
  display: inline-block;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.text.secondary}30;
    border-radius: 3px;
  }
`;

const Message = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  margin-bottom: 12px;
  animation: ${fadeIn} 0.3s ease;
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 75%;
  padding: 10px 14px;
  border-radius: ${props => props.isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
  background: ${props => {
    if (props.isUser) {
      return `linear-gradient(135deg, ${props.theme.colors.accent.primary}, ${props.theme.colors.accent.secondary})`;
    }
    return props.theme.name === 'dark' ? '#2d2d2d' : '#f3f4f6';
  }};
  color: ${props => props.isUser ? 'white' : props.theme.colors.text.primary};
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
`;

const ChatFooter = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
`;

const ChatInput = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
  border-radius: 24px;
  background: ${props => props.theme.name === 'dark' ? '#0f0f0f' : '#f9fafb'};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: ${props => props.theme.colors.accent.primary};
    background: ${props => props.theme.name === 'dark' ? '#1a1a1a' : '#ffffff'};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.7;
  }
`;

const SendButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, ${props => props.theme.colors.accent.primary}, ${props => props.theme.colors.accent.secondary});
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px ${props => props.theme.colors.accent.primary}40;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 18px;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const QuickAction = styled.button`
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
  background: ${props => props.theme.name === 'dark' ? '#1a1a1a' : '#f9fafb'};
  color: ${props => props.theme.colors.text.secondary};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.accent.primary};
    color: ${props => props.theme.colors.accent.primary};
    background: ${props => props.theme.colors.accent.primary}10;
  }
`;

// Tipos
interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Componente Principal
const FloatingAgent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Olá! Sou o assistente Liftlio. Como posso ajudar você hoje?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Limpar notificações ao abrir
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Detectar mudança de página
  useEffect(() => {
    if (messages.length > 1 && !isOpen) {
      const pageNames: { [key: string]: string } = {
        '/dashboard': 'Dashboard',
        '/monitoring': 'Monitoramento',
        '/mentions': 'Menções',
        '/settings': 'Configurações',
        '/billing': 'Faturamento',
        '/integrations': 'Integrações'
      };

      const currentPage = pageNames[location.pathname] || 'página';
      
      if (location.pathname !== '/') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [location.pathname, isOpen, messages.length]);

  // Adicionar mensagem do agente
  const addAgentMessage = useCallback((text: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text,
        isUser: false,
        timestamp: new Date()
      }]);
      setIsTyping(false);
      
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, 1000 + Math.random() * 1000);
  }, [isOpen]);

  // Processar comando do usuário
  const processUserInput = useCallback((input: string) => {
    const lowerInput = input.toLowerCase();

    // Comandos de navegação
    if (lowerInput.includes('dashboard') || lowerInput.includes('painel')) {
      addAgentMessage('Levando você ao Dashboard...');
      setTimeout(() => navigate('/dashboard'), 1500);
      return;
    }

    if (lowerInput.includes('monitoramento') || lowerInput.includes('monitor')) {
      addAgentMessage('Abrindo a página de Monitoramento...');
      setTimeout(() => navigate('/monitoring'), 1500);
      return;
    }

    if (lowerInput.includes('menç')) {
      addAgentMessage('Mostrando suas Menções...');
      setTimeout(() => navigate('/mentions'), 1500);
      return;
    }

    if (lowerInput.includes('configur') || lowerInput.includes('settings')) {
      addAgentMessage('Acessando Configurações...');
      setTimeout(() => navigate('/settings'), 1500);
      return;
    }

    if (lowerInput.includes('integr')) {
      addAgentMessage('Abrindo Integrações...');
      setTimeout(() => navigate('/integrations'), 1500);
      return;
    }

    // Perguntas sobre o Liftlio
    if (lowerInput.includes('o que') && lowerInput.includes('liftlio')) {
      addAgentMessage('O Liftlio é uma plataforma de monitoramento de vídeos e análise de sentimentos. Ajudamos você a acompanhar o desempenho dos seus vídeos e entender o sentimento do seu público!');
      return;
    }

    if (lowerInput.includes('como') && (lowerInput.includes('funciona') || lowerInput.includes('usar'))) {
      addAgentMessage('O Liftlio monitora seus vídeos no YouTube, analisa comentários e fornece insights valiosos sobre o sentimento do público. Você pode ver métricas detalhadas no Dashboard e acompanhar menções em tempo real!');
      return;
    }

    if (lowerInput.includes('projeto') && currentProject) {
      addAgentMessage(`Você está trabalhando no projeto "${currentProject.name}". Este projeto está ${currentProject.status === '6' ? 'ativo e processando dados' : 'em configuração'}.`);
      return;
    }

    if (lowerInput.includes('ajuda') || lowerInput.includes('help')) {
      addAgentMessage('Posso ajudar você com:\n• Navegar entre as páginas\n• Explicar funcionalidades\n• Mostrar informações do projeto\n• Responder dúvidas sobre o Liftlio\n\nO que você gostaria de saber?');
      return;
    }

    // Respostas gerais
    const generalResponses = [
      'Interessante! Me conte mais sobre isso.',
      'Entendi. Como posso ajudar com isso?',
      'Ótima pergunta! Vou pensar em como posso ajudar.',
      'Hmm, não tenho certeza se entendi. Pode reformular?',
      'Estou aqui para ajudar! O que mais você precisa?'
    ];

    addAgentMessage(generalResponses[Math.floor(Math.random() * generalResponses.length)]);
  }, [addAgentMessage, navigate, currentProject]);

  // Enviar mensagem
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    // Adicionar mensagem do usuário
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    }]);

    // Processar input
    processUserInput(inputValue);

    // Limpar input
    setInputValue('');
  }, [inputValue, processUserInput]);

  // Quick actions
  const quickActions = [
    { label: 'Dashboard', action: () => processUserInput('ir para dashboard') },
    { label: 'Como funciona?', action: () => processUserInput('como funciona o liftlio') },
    { label: 'Ajuda', action: () => processUserInput('ajuda') }
  ];

  return (
    <>
      <FloatingButton 
        onClick={() => setIsOpen(!isOpen)}
        hasNotification={unreadCount > 0}
      >
        <IconComponent icon={isOpen ? FaIcons.FaTimes : FaIcons.FaComments} />
        {unreadCount > 0 && !isOpen && (
          <NotificationBadge>{unreadCount}</NotificationBadge>
        )}
      </FloatingButton>

      <ChatWidget isOpen={isOpen}>
        <ChatHeader>
          <AgentAvatar>
            <IconComponent icon={FaIcons.FaHeadset} />
          </AgentAvatar>
          <AgentInfo>
            <AgentName>Assistente Liftlio</AgentName>
            <AgentStatus>
              <StatusDot isOnline={true} />
              Sempre aqui para ajudar
            </AgentStatus>
          </AgentInfo>
          <CloseButton onClick={() => setIsOpen(false)}>
            <IconComponent icon={FaIcons.FaTimes} />
          </CloseButton>
        </ChatHeader>

        <ChatMessages>
          {messages.map(message => (
            <Message key={message.id} isUser={message.isUser}>
              <MessageBubble isUser={message.isUser}>
                {message.text}
              </MessageBubble>
            </Message>
          ))}
          {isTyping && (
            <Message isUser={false}>
              <MessageBubble isUser={false}>
                <span style={{ opacity: 0.7 }}>Digitando...</span>
              </MessageBubble>
            </Message>
          )}
          <div ref={messagesEndRef} />
        </ChatMessages>

        <ChatFooter>
          <ChatInput>
            <Input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <SendButton 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
            >
              <IconComponent icon={FaIcons.FaPaperPlane} />
            </SendButton>
          </ChatInput>
          
          <QuickActions>
            {quickActions.map((action, index) => (
              <QuickAction key={index} onClick={action.action}>
                {action.label}
              </QuickAction>
            ))}
          </QuickActions>
        </ChatFooter>
      </ChatWidget>
    </>
  );
};

export default FloatingAgent;