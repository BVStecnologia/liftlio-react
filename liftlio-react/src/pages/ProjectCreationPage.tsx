import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ProjectModal from '../components/ProjectModal';
import TechBackground from '../components/TechBackground';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// Reutilizar componentes de estilo da página de login
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  position: relative;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 70px); // Altura total menos altura do header
  padding: 2rem;
  background-color: ${props => props.theme.colors.background};
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
  background-color: ${props => props.theme.colors.white};
  color: ${props => props.theme.colors.text};
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
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  text-align: center;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.darkGrey};
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

const ProjectCreationPage: React.FC = () => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Verificar apenas se o usuário está autenticado
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
    // Não verificamos mais projetos aqui, pois a lógica de redirecionamento
    // com base em projetos agora está no ProtectedLayout
  }, [user, loading, navigate]);
  
  const handleProjectCreated = async (project: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // A estrutura do projeto deve corresponder à da tabela Projeto no Supabase
      const projectData = {
        "Project name": project.name,
        "description service": `Company or product name: ${project.company}\nAudience description: ${project.audience}`,
        user: user.email,
        "User id": user.id,
        "url service": project.link,
        "Keywords": project.keywords,
        "País": project.country // Certificando que seja "US" ou "BR"
      };
      
      console.log('Creating project with data:', projectData);
      
      // Inserir o novo projeto no Supabase
      const { data, error } = await supabase
        .from('Projeto')
        .insert([projectData]);
      
      if (error) throw error;
      
      // Redirecionar para o dashboard após criar o projeto
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      // Mostrar erro mais detalhado para diagnóstico
      if (error.message) {
        alert(`Error creating the project: ${error.message}. Please try again.`);
      } else {
        alert('Error creating the project. Please try again.');
      }
    }
  };
  
  // Exibir tela de carregamento enquanto verifica a autenticação
  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <p>Loading...</p>
      </div>
    );
  }
  
  // Redirecionar para a página inicial se não estiver autenticado
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <PageContainer>
      <ContentWrapper>
        <TechBackground />
        
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
      </ContentWrapper>
      
      <ProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleProjectCreated}
      />
    </PageContainer>
  );
};

export default ProjectCreationPage;