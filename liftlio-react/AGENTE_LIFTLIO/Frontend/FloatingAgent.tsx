// 🤖 Componente FloatingAgent
// Localização atual: src/components/FloatingAgent.tsx
// Este arquivo é apenas uma referência - o arquivo real está em src/components/

/**
 * FloatingAgent Component
 * 
 * Widget flutuante que permite interação com o assistente AI do Liftlio.
 * Integra as 3 camadas do sistema de agente:
 * 1. Claude AI (resposta imediata)
 * 2. RAG System (busca contextual) - em desenvolvimento
 * 3. Suporte Humano (tickets) - planejado
 */

// Principais funcionalidades:
// - Chat em tempo real com Claude AI
// - Navegação entre páginas via comandos
// - Histórico de conversas na sessão
// - Animações suaves com Framer Motion
// - Design responsivo

// Endpoints utilizados:
// POST /functions/v1/agente-liftlio

// Estados do componente:
// - isOpen: boolean - controla se o chat está aberto
// - messages: Message[] - histórico de mensagens
// - input: string - texto atual do usuário
// - isLoading: boolean - indicador de carregamento

// Ações suportadas:
// - navigate: redireciona para páginas do sistema
// - create_ticket: cria ticket de suporte (futuro)
// - search_rag: busca no conhecimento (futuro)

// Exemplo de resposta com ação:
/*
{
  "content": "Levando você para o dashboard...",
  "action": "navigate",
  "data": {
    "path": "/dashboard"
  }
}
*/

// Para ver o código completo:
// /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/src/components/FloatingAgent.tsx