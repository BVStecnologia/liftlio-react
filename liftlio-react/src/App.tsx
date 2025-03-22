import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import LoginPage from './pages/LoginPage';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from './utils/IconHelper';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ProjectProvider } from './context/ProjectContext';

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

const FloatingMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2D1D42, #3b2659);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(35, 16, 54, 0.3), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.17, 0.67, 0.29, 0.96);
  isolation: isolate;
  
  /* Edge highlight */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0) 100%);
    opacity: 0.6;
    z-index: 1;
  }
  
  /* Light beam */
  &::after {
    content: '';
    position: absolute;
    width: 1.2px;
    height: 130%;
    top: -15%;
    left: -10%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 10%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0.05) 90%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(20deg);
    z-index: 2;
    box-shadow: 0 0 20px rgba(202, 125, 255, 0.7),
                0 0 40px rgba(202, 125, 255, 0.25);
    filter: blur(0.3px);
    opacity: 0.7;
    animation: navButtonBeam 6s cubic-bezier(0.17, 0.67, 0.29, 0.96) infinite;
    animation-delay: 1s;
  }
  
  @keyframes navButtonBeam {
    0% {
      left: -5%;
      opacity: 0;
      transform: rotate(20deg) translateY(0);
    }
    10% {
      opacity: 0.7;
    }
    60% {
      opacity: 0.7;
    }
    100% {
      left: 105%;
      opacity: 0;
      transform: rotate(20deg) translateY(0);
    }
  }
  
  /* Icon position above animations */
  svg {
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.3));
    transition: all 0.3s ease;
    font-size: 1.5rem;
  }
  
  &:hover {
    transform: translateY(-2px) scale(1.01);
    background: linear-gradient(135deg, #341f4c, #432e65);
    box-shadow: 0 7px 20px rgba(35, 16, 54, 0.4), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                0 0 15px rgba(131, 58, 244, 0.2);
    
    &::after {
      animation-duration: 3.8s;
      box-shadow: 0 0 25px rgba(202, 125, 255, 0.8),
                  0 0 50px rgba(202, 125, 255, 0.3);
    }
    
    &::before {
      opacity: 0.9;
    }
    
    svg {
      transform: scale(1.15);
      filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.99);
    box-shadow: 0 2px 10px rgba(35, 16, 54, 0.3), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  @media (max-width: 768px) {
    display: flex;
  }
`;


// Componente OAuthHandler para processar códigos de autorização do YouTube em qualquer rota
const OAuthHandler = () => {
  useEffect(() => {
    // Verificar se há um código de autorização do YouTube na URL
    const checkForYouTubeOAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const hasYouTubeScopes = urlParams.get('scope')?.includes('youtube');
      
      // Se temos um código de autorização e escopos do YouTube
      if (code && hasYouTubeScopes) {
        console.log('Código de autorização do YouTube detectado na URL:', code);
        console.log('ID do projeto no parâmetro state:', state);
        
        try {
          // Importar dinamicamente a biblioteca Supabase e o cliente
          const { supabase } = await import('./lib/supabaseClient');
          
          // Limpar os parâmetros da URL para evitar reprocessamento em recargas
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Construir os parâmetros para troca de token
          // Determinar o URI de redirecionamento correto com base no ambiente
          const isProduction = window.location.hostname === 'liftlio.fly.dev';
          const redirectUri = isProduction 
            ? 'https://liftlio.fly.dev' 
            : 'http://localhost:3000';
            
          console.log('Ambiente detectado:', isProduction ? 'Produção' : 'Desenvolvimento');
          console.log('Usando redirect URI:', redirectUri);
          
          const tokenEndpoint = 'https://oauth2.googleapis.com/token';
          const clientId = "360636127290-1k591hbvpen81oipjur2bsb1a7a6jo2o.apps.googleusercontent.com";
          const clientSecret = "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";
          
          // Criar dados do formulário para a solicitação de token
          const formData = new URLSearchParams();
          formData.append('code', code);
          formData.append('client_id', clientId);
          formData.append('client_secret', clientSecret);
          formData.append('redirect_uri', redirectUri);
          formData.append('grant_type', 'authorization_code');
          
          // Fazer a requisição de token
          console.log('Fazendo solicitação de token para o YouTube...');
          const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
          });
          
          // Processar a resposta
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(`Falha na troca de token: ${errorData.error_description || errorData.error || 'Erro desconhecido'}`);
          }
          
          const tokenData = await tokenResponse.json();
          console.log('Token recebido com sucesso, salvando no Supabase...');
          
          // Calcular tempo de expiração
          const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
          
          // Verificar se um projeto foi fornecido no parâmetro state
          if (state) {
            // Verificar se a integração já existe
            const { data: existingData } = await supabase
              .from('Integrações')
              .select('*')
              .eq('PROJETO id', state)
              .eq('Tipo de integração', 'youtube');
            
            if (existingData && existingData.length > 0) {
              // Atualizar integração existente
              const { error: updateError } = await supabase
                .from('Integrações')
                .update({
                  "Token": tokenData.access_token,
                  "Refresh token": tokenData.refresh_token,
                  "expira em": expiresAt,
                  "Ultima atualização": new Date().toISOString(),
                  "ativo": true
                })
                .eq('PROJETO id', state)
                .eq('Tipo de integração', 'youtube');
                
              if (updateError) throw updateError;
            } else {
              // Inserir nova integração
              const { error: insertError } = await supabase
                .from('Integrações')
                .insert([{
                  "PROJETO id": state,
                  "Tipo de integração": "youtube",
                  "Token": tokenData.access_token,
                  "Refresh token": tokenData.refresh_token,
                  "expira em": expiresAt,
                  "Ultima atualização": new Date().toISOString(),
                  "ativo": true
                }]);
                
              if (insertError) throw insertError;
            }
            
            // Mostrar mensagem de sucesso
            alert('Integração com YouTube concluída com sucesso!');
            
            // Redirecionar para a página de integrações após processamento
            if (window.location.pathname !== '/integrations') {
              window.location.href = '/integrations';
            }
          } else {
            alert('Erro: Nenhum ID de projeto encontrado para associar a esta integração.');
          }
        } catch (error) {
          console.error('Erro ao processar o código de autorização do YouTube:', error);
          alert(`Erro ao conectar ao YouTube: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    };
    
    // Executar verificação
    checkForYouTubeOAuth();
  }, []);
  
  return null; // Este componente não renderiza nada
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Root-level authentication handling
  // This handles tokens that arrive on any path, not just the callback path
  useEffect(() => {
    // Check if we have an auth token in the URL hash
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('Detected auth token, processing directly...');
      
      // Load the Supabase client here to process the token
      import('./lib/supabaseClient').then(({ supabase }) => {
        // The hash contains the session information - let's process it
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          console.log('Found access token, setting session...');
          
          // Let Supabase handle the token
          supabase.auth.getSession().then(({ data }) => {
            console.log('Session checked:', data.session ? 'Found' : 'Not found');
            
            // If we got a session, all is good - no redirect needed
            // The auth provider will handle the user state
          });
        }
      });
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <ProjectProvider>
          <Router>
            {/* Adicionar OAuthHandler para processar códigos do YouTube em qualquer rota */}
            <OAuthHandler />
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
        </ProjectProvider>
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
        <Header toggleSidebar={toggleSidebar} />
        <ContentWrapper>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/mentions" element={<Mentions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </ContentWrapper>
      </MainContent>
      
      {/* Floating hamburger menu button for mobile */}
      <FloatingMenuButton onClick={toggleSidebar}>
        <IconComponent icon={FaIcons.FaBars} />
      </FloatingMenuButton>
    </AppContainer>
  );
}

// Componente para lidar com callbacks de autenticação
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // Log all details for debugging
    console.log('AuthCallback: Running authentication callback handler');
    console.log('Current location:', window.location.href);
    console.log('User state:', user ? 'Logged in' : 'Not logged in');
    console.log('Loading state:', loading);
    
    // Check if there's an access token in the URL hash (direct hash redirect)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('Found access token in URL hash, processing...');
      
      try {
        // Need to manually process the hash for Supabase
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1) // remove the # character
        );
        
        if (hashParams.get('access_token')) {
          console.log('Successfully extracted access token');
          
          // Let Supabase handle the token
          import('./lib/supabaseClient').then(({ supabase }) => {
            // Check current session
            supabase.auth.getSession().then(({ data: sessionData }) => {
              if (sessionData.session) {
                console.log('Active session found, redirecting to home');
                navigate('/', { replace: true });
              } else {
                console.log('No active session, trying to establish one...');
                
                // Force a refresh based on the URL tokens
                setTimeout(() => {
                  navigate('/', { replace: true });
                }, 1000);
              }
            });
          });
        }
      } catch (error) {
        console.error('Error processing auth callback:', error);
        navigate('/login', { replace: true });
      }
    } else {
      // Normal callback handling
      if (!loading) {
        console.log('Standard callback flow, user:', user ? 'Found' : 'Not found');
        if (user) {
          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    }
  }, [user, loading, navigate, location]);
  
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
