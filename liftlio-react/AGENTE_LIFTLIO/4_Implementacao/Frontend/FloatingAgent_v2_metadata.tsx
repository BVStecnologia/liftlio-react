// Melhorias sugeridas para o FloatingAgent.tsx
// Para implementar no arquivo original: src/components/FloatingAgent.tsx

// MUDANÇA 1: Adicionar state para debug info (linha ~380)
const [debugInfo, setDebugInfo] = useState<any>(null);
const [showDebug, setShowDebug] = useState(false); // Toggle para mostrar/esconder debug

// MUDANÇA 2: Atualizar processUserInput para capturar debug (linha ~495)
// Após: const { data, error } = await supabase.functions.invoke...

if (error) throw error;

// NOVO: Capturar informações de debug
if (data.debug) {
  setDebugInfo(data.debug);
  console.log('Debug info do agente:', data.debug);
}

// NOVO: Log detalhado para desenvolvimento
console.log('Resposta completa do agente:', {
  hasRAGData: data.hasRAGData,
  language: data.language,
  sessionId: data.sessionId,
  debug: data.debug
});

// Get response text
const responseText = data.content || data.responseText || 'I apologize, but I couldn\'t process your request.';

// MUDANÇA 3: Adicionar indicador visual quando RAG encontra dados
// Modificar addAgentMessage para incluir metadata
const addAgentMessage = useCallback((text: string, metadata?: any) => {
  setIsTyping(true);
  
  setTimeout(() => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
      hasRAGData: metadata?.hasRAGData || false,
      ragCount: metadata?.ragResultsCount || 0
    }]);
    setIsTyping(false);
    
    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  }, 1000 + Math.random() * 1000);
}, [isOpen]);

// Chamar com metadata
addAgentMessage(responseText, {
  hasRAGData: data.hasRAGData,
  ragResultsCount: data.debug?.ragResultsCount
});

// MUDANÇA 4: Adicionar componente de debug no footer (linha ~640)
// Após </ChatInput> e antes de <QuickActions>

{/* Debug Info Toggle */}
{process.env.NODE_ENV === 'development' && debugInfo && (
  <DebugToggle onClick={() => setShowDebug(!showDebug)}>
    <IconComponent icon={FaIcons.FaBug} />
    {debugInfo.ragResultsCount > 0 && (
      <DebugBadge>{debugInfo.ragResultsCount}</DebugBadge>
    )}
  </DebugToggle>
)}

{/* Debug Panel */}
{showDebug && debugInfo && (
  <DebugPanel>
    <h4>Debug Info</h4>
    <p>Version: {debugInfo.version}</p>
    <p>RAG Results: {debugInfo.ragResultsCount}</p>
    <p>Categories: {debugInfo.categoriesDetected?.join(', ')}</p>
    <p>Search Time: {debugInfo.ragSearchTime}ms</p>
    <p>Has RAG Data: {debugInfo.hasRAGData ? 'Yes' : 'No'}</p>
  </DebugPanel>
)}

// MUDANÇA 5: Adicionar styled components para debug (no início do arquivo)

const DebugToggle = styled.button`
  position: absolute;
  top: 16px;
  right: 60px;
  background: ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#f3f4f6'};
  border: 1px solid ${props => props.theme.name === 'dark' ? '#3d3d3d' : '#e5e7eb'};
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: ${props => props.theme.colors.text.secondary};
  
  &:hover {
    background: ${props => props.theme.name === 'dark' ? '#3d3d3d' : '#e5e7eb'};
  }
`;

const DebugBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #10b981;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: bold;
`;

const DebugPanel = styled.div`
  background: ${props => props.theme.name === 'dark' ? '#1a1a1a' : '#f9fafb'};
  border: 1px solid ${props => props.theme.name === 'dark' ? '#2d2d2d' : '#e5e7eb'};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  
  h4 {
    margin: 0 0 8px 0;
    color: ${props => props.theme.colors.text.primary};
  }
  
  p {
    margin: 4px 0;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

// MUDANÇA 6: Adicionar indicador RAG nas mensagens (modificar MessageBubble)
const MessageBubble = styled.div<{ isUser: boolean; hasRAGData?: boolean }>`
  max-width: 75%;
  padding: 10px 14px;
  border-radius: ${props => props.isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
  background: ${props => {
    if (props.isUser) {
      return 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)';
    }
    // Destacar mensagens com dados RAG
    if (props.hasRAGData) {
      return props.theme.name === 'dark' ? '#1e293b' : '#e0f2fe';
    }
    return props.theme.name === 'dark' ? '#2d2d2d' : '#f3f4f6';
  }};
  color: ${props => props.isUser ? 'white' : props.theme.colors.text.primary};
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  box-shadow: ${props => props.isUser ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'};
  
  ${props => props.hasRAGData && !props.isUser && `
    border-left: 3px solid #10b981;
  `}
`;

// E no render das mensagens:
<MessageBubble isUser={message.isUser} hasRAGData={message.hasRAGData}>
  {message.text}
  {message.ragCount > 0 && !message.isUser && (
    <RAGIndicator>
      <IconComponent icon={FaIcons.FaDatabase} />
      {message.ragCount} dados encontrados
    </RAGIndicator>
  )}
</MessageBubble>

const RAGIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: #10b981;
  opacity: 0.8;
  
  svg {
    font-size: 12px;
  }
`;

// BENEFÍCIOS DESSAS MUDANÇAS:
// 1. Debug visível em desenvolvimento
// 2. Indicação visual quando RAG encontra dados
// 3. Métricas de performance (tempo de busca)
// 4. Melhor troubleshooting
// 5. UX melhorada com feedback visual