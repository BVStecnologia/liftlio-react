import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import GlobalStyle from './styles/GlobalStyle';
import { theme } from './styles/theme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Monitoring from './pages/Monitoring';
import Mentions from './pages/Mentions';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import YoutubeMonitoring from './pages/YoutubeMonitoring';
import LoginPage from './pages/LoginPage';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from './utils/IconHelper';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  
  @media (min-width: 769px) {
    flex-direction: row;
  }
  
  /* Applied to fix any possible issues with sidebar */
  position: relative;
  z-index: 0;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  background-color: ${props => props.theme.colors.background};
  width: 100%;
  
  @media (max-width: 768px) {
    padding-bottom: 60px; /* Space for mobile navigation button */
  }
`;

const ContentWrapper = styled.div`
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 16px 12px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 8px;
  }
`;

const MobileNavToggle = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${props => props.theme.shadows.md};
  z-index: 1001; /* Higher than sidebar (1000) to always be visible */
  border: none;
  font-size: 1.4rem;
  overflow: hidden;
  transition: all 0.3s ease;
  
  /* Light beam animation */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: lightBeam 3s infinite;
    z-index: 0;
  }
  
  /* Inner circle pulse effect */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: pulseCircle 2s infinite;
    z-index: 0;
  }
  
  /* Icon position above animations */
  svg {
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
    background: linear-gradient(145deg, #3a2655, #2D1D42);
    
    svg {
      transform: scale(1.1);
      filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9));
    }
    
    &::before {
      animation: lightBeam 1.5s infinite;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @keyframes lightBeam {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  
  @keyframes pulseCircle {
    0% {
      width: 0;
      height: 0;
      opacity: 1;
    }
    100% {
      width: 120%;
      height: 120%;
      opacity: 0;
    }
  }
  
  @media (min-width: 769px) {
    display: none;
  }
  
  @media (max-width: 480px) {
    width: 64px;
    height: 64px;
    bottom: 16px;
    right: 16px;
    font-size: 1.6rem;
  }
  
  @media (max-width: 400px) {
    width: 70px;
    height: 70px;
    bottom: 20px;
    right: 20px;
    font-size: 1.8rem;
  }
`;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={
              <ProtectedLayout 
                sidebarOpen={sidebarOpen} 
                toggleSidebar={toggleSidebar}
              />
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Componente de layout protegido
const ProtectedLayout = ({ sidebarOpen, toggleSidebar }: { sidebarOpen: boolean, toggleSidebar: () => void }) => {
  const { user, loading } = useAuth();
  
  // Aguardar o carregamento antes de decidir redirecionar
  if (loading) {
    const spinAnimation = keyframes`
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    `;
    
    const LoadingContainer = styled.div`
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      flex-direction: column;
    `;
    
    const Spinner = styled.div`
      font-size: 2rem;
      animation: ${spinAnimation} 1.5s linear infinite;
      display: inline-block;
    `;
    
    const LoadingText = styled.div`
      margin-top: 1rem;
    `;
    
    return (
      <LoadingContainer>
        <Spinner>⟳</Spinner>
        <LoadingText>Carregando...</LoadingText>
      </LoadingContainer>
    );
  }
  
  // Redirecionar para login se não estiver autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Se chegou aqui, o usuário está autenticado e o carregamento foi concluído
  return (
    <AppContainer>
      {/* Sidebar - desktop mode it's controlled by media query, mobile by state */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => toggleSidebar()} 
      />
      <MainContent>
        <Header />
        <ContentWrapper>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/mentions" element={<Mentions />} />
            <Route path="/youtube-monitoring" element={<YoutubeMonitoring />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </ContentWrapper>
      </MainContent>
      
      {/* Mobile navigation toggle button - always shows hamburger icon */}
      <MobileNavToggle onClick={toggleSidebar}>
        <IconComponent icon={FaIcons.FaBars} />
      </MobileNavToggle>
    </AppContainer>
  );
}

// Componente para lidar com callbacks de autenticação
const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // Quando os dados de autenticação forem carregados
    if (!loading) {
      // Redirecionar para a página principal se estiver autenticado
      if (user) {
        navigate('/', { replace: true });
      } else {
        // Se não estiver autenticado após o callback, redirecionar para o login
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);
  
  const spinAnimation = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  `;
  
  const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    flex-direction: column;
    background-color: ${props => props.theme.colors.background};
  `;
  
  const Spinner = styled.div`
    font-size: 2.5rem;
    color: ${props => props.theme.colors.primary};
    animation: ${spinAnimation} 1.5s linear infinite;
    display: inline-block;
  `;
  
  const LoadingText = styled.div`
    margin-top: 1rem;
    color: ${props => props.theme.colors.darkGrey};
    font-size: 1.125rem;
  `;
  
  return (
    <LoadingContainer>
      <Spinner>⟳</Spinner>
      <LoadingText>Verificando autenticação...</LoadingText>
    </LoadingContainer>
  );
};

export default App;
