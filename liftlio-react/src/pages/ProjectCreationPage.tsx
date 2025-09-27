import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ProjectModal from '../components/ProjectModal';
import TechBackground from '../components/TechBackground';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import Integrations from './Integrations';

// Reutilizar componentes de estilo da página de login
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.bg.primary};
  position: relative;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 70px); // Altura total menos altura do header
  padding: 2rem;
  background-color: ${props => props.theme.colors.bg.primary};
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WelcomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem;
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  box-shadow: ${props => props.theme.shadows.lg};
  border-radius: ${props => props.theme.radius.md};
  background-color: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : props.theme.colors.white};
  color: ${props => props.theme.colors.text.primary};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 6px;
    background: ${props => props.theme.colors.gradient.primary};
  }

  @media (max-width: 768px) {
    padding: 2rem;
    max-width: 90%;
  }
`;

const Title = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  text-align: center;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text.secondary};
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Button = styled.button`
  padding: 14px 20px;
  background: ${props => props.theme.colors.gradient.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  width: 100%;
  margin-top: 1rem;
  box-shadow: ${props => props.theme.shadows.md};
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const IconContainer = styled.div`
  font-size: 50px;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1.5rem;
`;

// Container for step navigation
const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  
  /* Linha de conexão entre os pontos */
  &::before {
    content: '';
    position: absolute;
    top: 18px; /* Centralizado verticalmente nos pontos */
    left: 10%;
    right: 10%;
    height: 2px;
    background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.lightGrey};
    z-index: 0;
  }
`;

const StepDot = styled.div<{ active: boolean; completed: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => 
    props.completed 
      ? props.theme.colors.primary 
      : props.active 
        ? props.theme.name === 'dark' ? props.theme.colors.bg.secondary : props.theme.colors.white 
        : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.lightGrey};
  border: 2px solid ${props => 
    props.active || props.completed 
      ? props.theme.colors.primary 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.lightGrey};
  color: ${props => 
    props.completed 
      ? props.theme.colors.white 
      : props.active 
        ? props.theme.colors.primary 
        : props.theme.name === 'dark' ? props.theme.colors.text.secondary : props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.bold};
  transition: all 0.3s ease;
  box-shadow: ${props => 
    props.active
      ? '0 4px 8px rgba(0, 0, 0, 0.15)'
      : 'none'};
  position: relative;
  z-index: 1;
  
  &::after {
    content: '${props => props.completed ? '✓' : ''}';
    font-size: 16px;
  }
`;

const StepLabel = styled.div<{ active: boolean }>`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.active ? props.theme.colors.primary : (props.theme.name === 'dark' ? props.theme.colors.text.secondary : props.theme.colors.darkGrey)};
  margin-top: 10px;
  text-align: center;
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.medium};
  white-space: nowrap;
  max-width: 120px;
  line-height: 1.4;
`;

const StepContent = styled.div`
  width: 100%;
`;

const LogoutButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ProjectCreationPage: React.FC = () => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [projectCreated, setProjectCreated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Novo estado para evitar "piscar"
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { currentProject, hasIntegrations } = useProject();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();

  // Verificar apenas se o usuário está autenticado
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Verificar se o usuário já tem um projeto e integrações
  useEffect(() => {
    // Aguardar o contexto carregar completamente
    if (loading) return;

    if (currentProject) {
      setProjectCreated(true);
      setCurrentStep(2); // Avançar para a etapa de integrações

      if (hasIntegrations) {
        // Se já tiver integrações, redirecionar para o dashboard
        navigate('/dashboard');
        return; // Não remover o isInitializing para evitar piscar antes do redirect
      }
    }

    // Só remover o loading após verificar tudo
    setTimeout(() => {
      setIsInitializing(false);
    }, 100);
  }, [currentProject, hasIntegrations, navigate, loading]);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleProjectCreated = async (project: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Mostrar loading global imediatamente ao criar projeto
      showGlobalLoader('Creating Project', 'Setting up your new project...');
      setIsInitializing(true);

      // A estrutura do projeto deve corresponder à da tabela Projeto no Supabase
      const projectData = {
        "Project name": project.name,
        "description service": `Company or product name: ${project.company}\nAudience description: ${project.audience}`,
        "user": user.email,  // CORRIGIDO: adicionadas aspas para consistência
        "User id": user.id,
        "url service": project.link,
        "Keywords": project.keywords,
        "País": project.country === 'US' ? 'US' : 'BR' // Garantindo formato explícito
      };

      console.log('Creating project with data:', projectData);

      // Adicionando log detalhado para debug do campo país
      console.log('Valor do país recebido:', project.country);
      console.log('Valor do país após processamento:', projectData["País"]);

      // Inserir o novo projeto no Supabase
      const { data, error } = await supabase
        .from('Projeto')
        .insert([projectData])
        .select();

      // Logar a resposta do Supabase para verificar o que foi realmente salvo
      console.log('Resposta do Supabase após inserção:', { data, error });

      if (error) throw error;

      // Armazenar o ID do projeto criado no localStorage
      if (data && data[0]) {
        localStorage.setItem('currentProjectId', data[0].id.toString());

        // Aguardar um momento para garantir que o estado foi salvo
        await new Promise(resolve => setTimeout(resolve, 500));

        // Recarregar a página para atualizar o contexto
        // NOTA: Mantendo reload por enquanto mas com loading adequado
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error creating project:', error);

      // Esconder loader em caso de erro
      hideGlobalLoader();
      setIsInitializing(false);

      // Mostrar erro mais detalhado para diagnóstico
      if (error.message) {
        alert(`Error creating the project: ${error.message}. Please try again.`);
      } else {
        alert('Error creating the project. Please try again.');
      }
    }
  };
  
  // Renderizar a etapa atual
  const renderStep = () => {
    switch (currentStep) {
      case 1: // Criação de projeto
        return (
          <WelcomeContainer>
            <IconContainer>
              <span role="img" aria-label="folder icon">📁</span>
            </IconContainer>
            <Title>Welcome to Liftlio!</Title>
            <Description>
              The first step is to create a project to monitor. A project can be your product,
              service, or brand that you want to track across digital platforms.
            </Description>
            <Button onClick={() => setShowProjectModal(true)}>
              Create my first project
            </Button>
          </WelcomeContainer>
        );
      
      case 2: // Integrações
        return (
          <StepContent>
            <Integrations />
          </StepContent>
        );
        
      default:
        return null;
    }
  };
  
  // Exibir tela de carregamento enquanto verifica a autenticação e inicialização
  // Isso evita o "piscar" de componentes antes de decidir o que mostrar
  if (loading || isInitializing) {
    return null; // Retorna null para deixar o loader global do ProcessingWrapper visível
  }
  
  // Redirecionar para a página inicial se não estiver autenticado
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Não vamos mais usar abordagem de manipulação direta do DOM
  
  // Render dentro de uma div comum
  return (
    <div style={{ width: '100%', padding: '20px' }}>
      {/* Botão de Logout */}
      <LogoutButton onClick={handleLogout}>
        Logout
      </LogoutButton>

      {/* Cabeçalho com indicadores de passo */}
      <div style={{ marginBottom: '40px', maxWidth: '700px', margin: '0 auto' }}>
        <StepIndicator>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <StepDot active={currentStep === 1} completed={currentStep > 1}>
              {currentStep === 1 ? '1' : ''}
            </StepDot>
            <StepLabel active={currentStep === 1}>Create Project</StepLabel>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <StepDot active={currentStep === 2} completed={currentStep > 2}>
              {currentStep === 2 ? '2' : ''}
            </StepDot>
            <StepLabel active={currentStep === 2}>Connect Integrations</StepLabel>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <StepDot active={currentStep === 3} completed={currentStep > 3}>
              {currentStep === 3 ? '3' : ''}
            </StepDot>
            <StepLabel active={currentStep === 3}>View Dashboard</StepLabel>
          </div>
        </StepIndicator>
      </div>
      
      {/* Conteúdo do passo */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          {renderStep()}
        </div>
      </div>
      
      {/* Modal de projeto */}
      <ProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectCreationPage;