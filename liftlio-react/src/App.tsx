import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import GlobalStyle from './styles/GlobalStyle';
import { GlobalThemeStyles, useGlobalTheme } from './styles/GlobalThemeSystem';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { LoadingProvider, useGlobalLoading } from './context/LoadingContext';
import { RealtimeProvider } from './context/RealtimeProvider';
import { ExtensionWarning } from './components/ExtensionWarning';
import GlobalLoader from './components/GlobalLoader';
import { IconComponent } from './utils/IconHelper';
import { FaBars } from 'react-icons/fa';
import ErrorBoundary from './components/ErrorBoundary';
// PostHog removed for performance optimization

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPageHTML = lazy(() => import('./pages/LandingPageHTML'));
const Overview = lazy(() => import('./pages/Overview'));
const Analytics = lazy(() => import('./pages/Analytics'));
const LiftlioAnalytics = lazy(() => import('./pages/LiftlioAnalytics'));
const LiftlioTrends = lazy(() => import('./pages/LiftlioTrends'));
const PublicLayout = lazy(() => import('./components/PublicLayout'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Mentions = lazy(() => import('./pages/Mentions'));
const Settings = lazy(() => import('./pages/Settings'));
const Billing = lazy(() => import('./pages/Billing'));
const Integrations = lazy(() => import('./pages/Integrations'));
const ProjectCreationPage = lazy(() => import('./pages/ProjectCreationPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
// About, Privacy, Terms agora são servidas como HTML estático da pasta public
const Security = lazy(() => import('./pages/Security'));

// Lazy load heavy components
const Sidebar = lazy(() => import('./components/Sidebar'));
const Header = lazy(() => import('./components/Header'));
const SubscriptionWarningBanner = lazy(() => import('./components/SubscriptionWarningBanner'));
const ProcessingWrapper = lazy(() => import('./components/ProcessingWrapper'));
// const UrlDataTest = lazy(() => import('./components/UrlDataTest')); // Removido - componente de teste
const SubscriptionGate = lazy(() => import('./components/SubscriptionGate'));
const FloatingAgent = lazy(() => import('./components/FloatingAgent'));

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

// Componente para redirecionar para arquivos HTML estáticos na pasta public
const StaticRedirect: React.FC<{ to: string }> = ({ to }) => {
  React.useEffect(() => {
    // Usar window.location.href para fazer um redirecionamento completo
    // Isso garante que o arquivo HTML estático seja servido corretamente
    window.location.href = to;
  }, [to]);
  
  // Mostrar um loading breve enquanto redireciona
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0a0a0a',
      color: '#ffffff'
    }}>
      <div>Redirecting...</div>
    </div>
  );
};

const FloatingMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.theme.colors.primaryDark}, ${props => props.theme.colors.primary}); /* Accent color (10%) for button background */
  color: ${props => props.theme.colors.secondary}; /* Secondary color (30%) for button icon */
  border: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 
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
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.7),
                0 0 40px rgba(255, 255, 255, 0.25);
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
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primaryLight}); /* Accent colors (10%) for hover state */
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.4), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                0 0 15px rgba(255, 255, 255, 0.2);
    
    &::after {
      animation-duration: 3.8s;
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.8),
                  0 0 50px rgba(255, 255, 255, 0.3);
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
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

// Helper function to get theme-aware background color
const getThemeBackground = (): string => {
  const savedTheme = localStorage.getItem('darkMode');
  
  if (savedTheme !== null) {
    return savedTheme === 'true' ? '#0A0A0B' : '#f0f2f5';
  }
  
  // If no preference, use time-based theme
  const currentHour = new Date().getHours();
  const isDarkMode = currentHour >= 18 || currentHour < 6;
  return isDarkMode ? '#0A0A0B' : '#f0f2f5';
};

// Componente OAuthHandler para processar códigos de autorização do YouTube em qualquer rota
const OAuthHandler = () => {
  const { hideGlobalLoader } = useGlobalLoading();
  const location = useLocation();
  
  useEffect(() => {
    // IMPORTANTE: Não processar OAuth em rotas públicas
    const publicRoutes = ['/trends', '/liftlio-analytics', '/about', '/privacy', '/terms', '/security'];
    if (publicRoutes.includes(location.pathname)) {
      console.log('[OAuthHandler] Skipping OAuth check on public route:', location.pathname);
      return;
    }
    
    // Log imediato para debug
    console.log('[OAuthHandler] Iniciando verificação OAuth');
    console.log('[OAuthHandler] URL atual:', window.location.href);
    
    // Verificar se há um código de autorização do YouTube na URL
    const checkForYouTubeOAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      console.log('[OAuthHandler] Parâmetros detectados:', { code: !!code, state });
      
      // Se temos um código de autorização e um state (ID do projeto)
      // O state indica que veio do nosso fluxo de OAuth do YouTube
      if (code && state) {
        console.log('Código de autorização do YouTube detectado na URL:', code);
        console.log('ID do projeto no parâmetro state:', state);
        
        try {
          // Importar dinamicamente a biblioteca Supabase e o cliente
          const { supabase } = await import('./lib/supabaseClient');
          
          // Limpar os parâmetros da URL para evitar reprocessamento em recargas
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Construir os parâmetros para troca de token
          // Determinar o URI de redirecionamento correto com base no ambiente
          const hostname = window.location.hostname;
          const isProduction = hostname === 'liftlio.fly.dev' || hostname === 'liftlio.com';
          const redirectUri = isProduction 
            ? `https://${hostname}` 
            : 'http://localhost:3000';
            
          console.log('Ambiente detectado:', isProduction ? 'Produção' : 'Desenvolvimento');
          console.log('Usando redirect URI:', redirectUri);
          
          const tokenEndpoint = 'https://oauth2.googleapis.com/token';
          const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
          const clientSecret = process.env.REACT_APP_GOOGLE_CLIENT_SECRET || "";
          
          // Criar dados do formulário para a solicitação de token
          const formData = new URLSearchParams();
          formData.append('code', code);
          formData.append('client_id', clientId);
          formData.append('client_secret', clientSecret);
          formData.append('redirect_uri', redirectUri);
          formData.append('grant_type', 'authorization_code');
          
          // Fazer a requisição de token
          console.log('Fazendo solicitação de token para o YouTube...');
          // Importar safeFetch dinamicamente
          const { safeFetch } = await import('./utils/fetchWrapper');
          const tokenResponse = await safeFetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            timeout: 30000
          });
          
          // Processar a resposta
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(`Falha na troca de token: ${errorData.error_description || errorData.error || 'Erro desconhecido'}`);
          }
          
          const tokenData = await tokenResponse.json();
          console.log('Token recebido com sucesso, salvando no Supabase...');
          
          // Armazenar o tempo de expiração diretamente em segundos
          const expiresAt = tokenData.expires_in; // Valor em segundos (ex: 3599)
          
          // Verificar se um projeto foi fornecido no parâmetro state
          if (state) {
            // Verificar se a integração já existe
            console.log('Verificando integração existente para projeto ID:', state);
            const projectId = parseInt(state, 10); // Converter para número
            const { data: existingData, error: queryError } = await supabase
              .from('Integrações')
              .select('*')
              .eq('PROJETO id', projectId)
              .eq('Tipo de integração', 'youtube');
              
            console.log('Consulta de integração:', existingData ? `${existingData.length} encontradas` : 'Nenhuma', queryError || '');
            
            if (existingData && existingData.length > 0) {
              // Atualizar integração existente
              console.log('Atualizando integração existente para projeto ID:', projectId);
              const { data: updateData, error: updateError } = await supabase
                .from('Integrações')
                .update({
                  "Token": tokenData.access_token,
                  "Refresh token": tokenData.refresh_token,
                  "expira em": expiresAt,
                  "Ultima atualização": new Date().toISOString(),
                  "ativo": true
                })
                .eq('PROJETO id', projectId)
                .eq('Tipo de integração', 'youtube')
                .select();
                
              console.log('Resultado da atualização:', updateData ? 'Sucesso' : 'Falha', updateError || '');
                
              if (updateError) throw updateError;
            } else {
              // Inserir nova integração
              console.log('Criando nova integração com PROJETO id:', state);
              const { data: insertData, error: insertError } = await supabase
                .from('Integrações')
                .insert([{
                  "PROJETO id": parseInt(state, 10),  // Convertendo string para número
                  "Tipo de integração": "youtube",
                  "Token": tokenData.access_token,
                  "Refresh token": tokenData.refresh_token,
                  "expira em": expiresAt,
                  "Ultima atualização": new Date().toISOString(),
                  "ativo": true
                }])
                .select();
              
              console.log('Resultado da inserção:', insertData ? 'Sucesso' : 'Falha', insertError || '');
                
              if (insertError) throw insertError;
            }
            
            // ALTERAÇÃO: Marcamos a integração como bem-sucedida e
            // registramos que o usuário completou o onboarding para evitar
            // que ele volte ao modo onboarding ao desconectar integrações
            localStorage.setItem('integrationSuccess', 'true');
            localStorage.setItem('integrationTimestamp', Date.now().toString());
            localStorage.setItem('userCompletedOnboarding', 'true');
            
            // Adicionar marcador de "integração recente" para prevenir inicialização duplicada
            // Este marcador será verificado antes de iniciar um novo fluxo OAuth
            localStorage.setItem('recentIntegration', 'true');
            
            // Marcar que devemos ir para o dashboard após OAuth
            localStorage.setItem('postOAuthDestination', '/dashboard');
            
            // Configurar expiração do marcador (60 segundos)
            setTimeout(() => {
              localStorage.removeItem('recentIntegration');
            }, 60000); // Remover após 60 segundos
            
            // Forçar a atualização do estado de onboarding para completar o fluxo
            try {
              // Atualizar diretamente na tabela de integrações - tornar ativo
              const { data: finalUpdateData, error: finalUpdateError } = await supabase
                .from('Integrações')
                .update({
                  "ativo": true
                })
                .eq('PROJETO id', projectId)
                .eq('Tipo de integração', 'youtube')
                .select();
                
              console.log('Ativação final da integração:', 
                finalUpdateData ? 'Sucesso' : 'Falha', 
                finalUpdateError || '');
              
              // Primeiro, atualizar o campo Youtube Active na tabela Projeto
              const { data: projectUpdateData, error: projectUpdateError } = await supabase
                .from('Projeto')
                .update({
                  "Youtube Active": true
                })
                .eq('id', projectId)
                .select();
                
              console.log('Atualização do campo Youtube Active no projeto:', 
                projectUpdateData ? 'Sucesso' : 'Falha', 
                projectUpdateError || '');
                
              // Segundo, atualizar o campo Integrações na tabela Projeto
              // Precisamos do ID da integração que acabamos de criar ou atualizar
              // Se já existia uma integração anterior, usamos esse ID
              let integracaoId = null;
              if (existingData && existingData.length > 0) {
                integracaoId = existingData[0].id;
              }
              // Se não existia e acabamos de criar uma, precisamos buscar o ID dela
              else {
                // Buscar a integração recém-criada para obter o ID
                const { data: newIntegrationData } = await supabase
                  .from('Integrações')
                  .select('id')
                  .eq('PROJETO id', projectId)
                  .eq('Tipo de integração', 'youtube')
                  .limit(1);
                  
                if (newIntegrationData && newIntegrationData.length > 0) {
                  integracaoId = newIntegrationData[0].id;
                }
              }
              
              if (integracaoId) {
                console.log('Atualizando campo Integrações do projeto com o ID da integração:', integracaoId);
                
                const { data: integracaoUpdateData, error: integracaoUpdateError } = await supabase
                  .from('Projeto')
                  .update({
                    "Integrações": integracaoId
                  })
                  .eq('id', projectId)
                  .select();
                  
                console.log('Atualização do campo Integrações no projeto:', 
                  integracaoUpdateData ? 'Sucesso' : 'Falha', 
                  integracaoUpdateError || '');
              } else {
                console.error('Não foi possível atualizar o campo Integrações porque não temos o ID da integração');
              }
              
              // Verificar se o projeto já tem mensagens antes de definir o status para 0
              const { data: mensagensExistentes, error: mensagensError } = await supabase
                .from('Mensagens')
                .select('id')
                .eq('project_id', projectId)
                .limit(1);
                
              console.log('Verificação de mensagens existentes:', 
                mensagensExistentes ? `${mensagensExistentes.length} encontradas` : 'Nenhuma', 
                mensagensError || '');
              
              // Apenas definir o status para 0 se o projeto ainda não tiver mensagens
              if (!mensagensExistentes || mensagensExistentes.length === 0) {
                console.log('Projeto ainda não tem mensagens, iniciando processamento (status=0)');
                const { data: statusUpdateData, error: statusUpdateError } = await supabase
                  .from('Projeto')
                  .update({
                    "status": "0"
                  })
                  .eq('id', projectId)
                  .select();
                  
                console.log('Atualização do campo status do projeto para iniciar processamento:', 
                  statusUpdateData ? 'Sucesso' : 'Falha', 
                  statusUpdateError || '');
              } else {
                console.log('Projeto já tem mensagens, mantendo o status atual');
              }
              
              console.log('Integração marcada como ativa com sucesso');
            } catch (updateError) {
              console.error('Erro ao marcar integração como ativa:', updateError);
            }
            
            // Redirecionar para o dashboard para que o usuário possa ver a animação de processamento
            // Uma vez que o dashboard está envolvido pelo ProcessingWrapper, ele mostrará a tela de carregamento
            console.log('Redirecionando para o dashboard para mostrar o processamento...');
            
            // Aguardar um momento para garantir que o token foi salvo e a sessão esteja disponível
            // Em produção, pode haver mais latência, então aumentamos o delay
            setTimeout(() => {
              // Remover o loading global antes de redirecionar
              hideGlobalLoader();
              // Adicionar um parâmetro especial na URL para indicar que acabamos de processar OAuth
              // Isso ajudará o ProtectedLayout a saber que deve aguardar a sessão carregar
              window.location.replace('/dashboard?oauth_completed=true');
            }, 2500);
          } else {
            alert('Erro: Nenhum ID de projeto encontrado para associar a esta integração.');
          }
        } catch (error) {
          console.error('Erro ao processar o código de autorização do YouTube:', error);
          // Remover o loading global em caso de erro também
          hideGlobalLoader();
          alert(`Erro ao conectar ao YouTube: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    };
    
    // Executar verificação
    checkForYouTubeOAuth();
  }, [hideGlobalLoader, location.pathname]);
  
  return null; // Este componente não renderiza nada
};

// Component that uses the global loading context
const AppContent: React.FC = () => {
  const { isGlobalLoading, loadingMessage, loadingSubMessage } = useGlobalLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // DEBUG: Log para rastrear quando AppContent é renderizado
  console.log('[AppContent] Current URL: ' + window.location.pathname);
  
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
    <>
      {/* Global loading overlay */}
      {isGlobalLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          backgroundColor: getThemeBackground()
        }}>
          <GlobalLoader 
            message={loadingMessage} 
            subMessage={loadingSubMessage} 
            fullScreen={true} 
          />
        </div>
      )}
      
      <Router>
        {/* Adicionar aviso de extensão para todos os usuários */}
        <ExtensionWarning />
        {/* Adicionar OAuthHandler para processar códigos do YouTube em qualquer rota */}
        <OAuthHandler />
        <Suspense fallback={<GlobalLoader message="Loading" subMessage="Please wait..." />}>
          <Routes>
          {/* Landing page como ponto de entrada principal - força nova renderização */}
          <Route path="/" element={<LandingPageHTML key="landing-home" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/liftlio-analytics" element={<LiftlioAnalytics />} />
          <Route path="/trends" element={<PublicLayout><LiftlioTrends /></PublicLayout>} />
          
          {/* Páginas institucionais - Redirecionamento para HTML estático */}
          <Route path="/about" element={<StaticRedirect to="/about.html" />} />
          <Route path="/privacy" element={<StaticRedirect to="/privacy.html" />} />
          <Route path="/terms" element={<StaticRedirect to="/terms.html" />} />
          <Route path="/security" element={<Security />} />
          
          {/* Rota removida: Analytics Showcase (não utilizada) */}
          
          
          {/* Rotas protegidas - usar apenas uma rota com wildcard pois ProtectedLayout tem rotas internas */}
          <Route path="/*" element={<ProtectedLayout sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />} />
        </Routes>
        </Suspense>
      </Router>
    </>
  );
};

// Main App component with all providers
function App() {
  console.log('[App] Starting with path: ' + window.location.pathname);
  // Analytics removed for performance optimization

  // PREVENÇÃO DE RECARREGAMENTO AO MUDAR DE ABA
  // Este código impede que o Supabase recarregue a página quando você sai e volta
  // Para desativar: comente ou remova todo o useEffect abaixo
  useEffect(() => {
    // Intercepta o evento de mudança de visibilidade da aba
    const handleVisibilityChange = (e: Event) => {
      // Para o evento imediatamente, impedindo que o Supabase o detecte
      e.stopImmediatePropagation();
    };
    
    // Intercepta o evento de foco da janela
    const handleWindowFocus = (e: Event) => {
      // Para o evento imediatamente, impedindo refreshs automáticos
      e.stopImmediatePropagation();
    };
    
    // Adiciona os listeners com prioridade máxima (capture phase)
    window.addEventListener('visibilitychange', handleVisibilityChange, true);
    window.addEventListener('focus', handleWindowFocus, true);
    
    // Limpa os listeners quando o componente é desmontado
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange, true);
      window.removeEventListener('focus', handleWindowFocus, true);
    };
  }, []);
  // FIM DA PREVENÇÃO DE RECARREGAMENTO
  
  return (
    <ErrorBoundary>
      {/* PostHog removed for performance */}
        <ThemeProvider>
          <LanguageProvider>
            <GlobalStyle />
            <LoadingProvider>
              <AuthProvider>
                <ProjectProvider>
                  <RealtimeProvider>
                    <AppContent />
                  </RealtimeProvider>
                </ProjectProvider>
              </AuthProvider>
            </LoadingProvider>
          </LanguageProvider>
        </ThemeProvider>
    </ErrorBoundary>
  );
}


// Componente de layout protegido
const ProtectedLayout = ({ sidebarOpen, toggleSidebar }: { sidebarOpen: boolean, toggleSidebar: () => void }) => {
  const { user, loading } = useAuth();
  const { isOnboarding, onboardingReady, hasProjects, isLoading, projectIntegrations, currentProject } = useProject();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado para controlar se o ProcessingWrapper está verificando
  const [isProcessingWrapperChecking, setIsProcessingWrapperChecking] = useState(false);
  // NOVO: Flag para prevenir múltiplas chamadas do GlobalLoader
  const [globalLoaderControlled, setGlobalLoaderControlled] = useState(false);
  
  // Effect para mostrar loading global até TUDO estar pronto
  useEffect(() => {
    // IMPORTANTE: Se ProcessingWrapper está no controle, não interferir
    if (globalLoaderControlled) {
      console.log('[GlobalLoader Control] ProcessingWrapper está no controle, ProtectedLayout não interfere');
      return;
    }
    
    // Debug para entender o que está travando
    console.log('[DEBUG CRÍTICO] ProtectedLayout Loading State:', {
      loading,
      onboardingReady,
      isLoading, 
      isInitializing,
      isPageReady,
      currentProject: currentProject?.id,
      projectStatus: currentProject?.status,
      isProcessingWrapperChecking,
      globalLoaderControlled,
      timestamp: new Date().toISOString()
    });
    
    // IMPORTANTE: Se já está pronto, NÃO mostrar GlobalLoader
    if (isPageReady) {
      console.log('[DEBUG CRÍTICO] Página já está pronta, garantindo que GlobalLoader está escondido');
      hideGlobalLoader();
      return;
    }
    
    // IMPORTANTE: Se o projeto tem status <= 5 ou 6 sem mensagens, delegar para ProcessingWrapper
    const projectStatus = parseInt(currentProject?.status || '0', 10);
    if (currentProject && (projectStatus <= 5 || isProcessingWrapperChecking)) {
      console.log('[DEBUG CRÍTICO] Projeto em processamento ou verificação, delegando para ProcessingWrapper');
      // Marcar que ProcessingWrapper está no controle
      setGlobalLoaderControlled(true);
      // Garantir que GlobalLoader está escondido
      hideGlobalLoader();
      // Marcar como pronto para não interferir
      setIsInitializing(false);
      setIsPageReady(true);
      return;
    }
    
    // NOVA VERIFICAÇÃO: Se estamos apenas trocando de projeto (não é carga inicial)
    // Verificar se já temos um projeto anterior carregado
    const lastProjectId = sessionStorage.getItem('lastProjectId');
    const isProjectSwitch = lastProjectId && currentProject && lastProjectId !== currentProject.id.toString();
    
    if (isProjectSwitch) {
      console.log('[DEBUG CRÍTICO] Detectada troca de projeto, NÃO mostrar GlobalLoader');
      // Durante troca de projeto, não mostrar GlobalLoader
      hideGlobalLoader();
      // Marcar como pronto rapidamente
      setIsInitializing(false);
      setIsPageReady(true);
      // Resetar controle do ProcessingWrapper
      setGlobalLoaderControlled(false);
      return;
    }
    
    // Só mostrar loading INICIAL quando realmente necessário (primeira carga)
    // E APENAS se ProcessingWrapper não está no controle
    if (!isPageReady && !lastProjectId && !globalLoaderControlled && (loading || !onboardingReady || isLoading)) {
      console.log('[DEBUG CRÍTICO] MOSTRANDO GLOBALLOADER INICIAL - Condições:', {
        loading,
        onboardingReady,
        isLoading,
        isPageReady,
        lastProjectId,
        globalLoaderControlled
      });
      showGlobalLoader('Loading', 'Preparing your workspace');
    } else if (isPageReady || (!loading && onboardingReady && !isLoading)) {
      console.log('[DEBUG CRÍTICO] ESCONDENDO GLOBALLOADER - Página pronta ou condições satisfeitas');
      // IMPORTANTE: Esconder o loader quando as condições não forem mais verdadeiras
      hideGlobalLoader();
    }
  }, [loading, onboardingReady, isLoading, isPageReady, showGlobalLoader, hideGlobalLoader, currentProject, isProcessingWrapperChecking, globalLoaderControlled]);
  
  // Effect para garantir que mostramos loading até tudo estar pronto
  useEffect(() => {
    // Verificar se acabamos de completar OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCompleted = urlParams.get('oauth_completed') === 'true';
    
    // IMPORTANTE: Se o projeto tem status <= 5 OU ProcessingWrapper está no controle
    const projectStatus = parseInt(currentProject?.status || '0', 10);
    if (currentProject && (projectStatus <= 5 || globalLoaderControlled)) {
      console.log('Projeto em processamento ou ProcessingWrapper no controle, pulando lógica de loading');
      setIsInitializing(false);
      setIsPageReady(true);
      hideGlobalLoader();
      if (oauthCompleted) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }
    
    // NÃO processar se ProcessingWrapper está verificando
    if (isProcessingWrapperChecking) {
      console.log('ProcessingWrapper está verificando, aguardando...');
      // Garantir que GlobalLoader está escondido durante verificação
      hideGlobalLoader();
      return;
    }
    
    // Debug
    console.log('ProtectedLayout Ready Check:', {
      loading,
      onboardingReady,
      isLoading,
      globalLoaderControlled,
      shouldHideLoader: !loading && onboardingReady && !isLoading
    });
    
    // Só remover o loading quando TODAS as condições estiverem resolvidas
    if (!loading && onboardingReady && !isLoading) {
      console.log('ProtectedLayout: Condições satisfeitas, removendo loader em', oauthCompleted ? 3000 : 500, 'ms');
      // Delay reduzido para evitar travamento
      const delay = oauthCompleted ? 3000 : 500;
      const timer = setTimeout(() => {
        console.log('ProtectedLayout: Removendo GlobalLoader definitivamente');
        setIsInitializing(false);
        setIsPageReady(true);
        // Garantir que o loader está escondido
        hideGlobalLoader();
        // Resetar controle se necessário
        setGlobalLoaderControlled(false);
        // Limpar o parâmetro oauth_completed da URL
        if (oauthCompleted) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [loading, onboardingReady, isLoading, hideGlobalLoader, currentProject, isProcessingWrapperChecking, globalLoaderControlled]);
  
  // Verificar se temos um destino pós-OAuth pendente
  useEffect(() => {
    const postOAuthDestination = localStorage.getItem('postOAuthDestination');
    if (postOAuthDestination && user && !loading && !isLoading) {
      console.log('Redirecionando para destino pós-OAuth:', postOAuthDestination);
      localStorage.removeItem('postOAuthDestination');
      // Usar navigate em vez de window.location para evitar recarregamento
      navigate(postOAuthDestination, { replace: true });
    }
  }, [user, loading, isLoading, navigate]);
  
  // Verificação simplificada de integrações usando useMemo para evitar re-cálculos
  // IMPORTANTE: Mover hooks ANTES de qualquer return condicional
  const projectHasIntegrations = React.useMemo(() => {
    if (!currentProject) return false;
    
    // projectIntegrations já vem filtrado do contexto para o projeto atual
    // Só precisamos verificar se tem alguma integração
    return projectIntegrations.length > 0;
  }, [currentProject, projectIntegrations]);
  
  // Função helper para determinar o tipo de layout a mostrar
  const getLayoutType = React.useCallback(() => {
    // Ordem de prioridade clara:
    if (loading || !onboardingReady || isLoading) return 'loading';
    if (!user) return 'login';
    if (!hasProjects) return 'create-project';
    
    // IMPORTANTE: Verificar status do projeto ANTES de verificar integração
    // Projetos em processamento (status 0-5) devem ir direto pro dashboard
    // para que o ProcessingWrapper possa mostrar as 6 etapas
    const projectStatus = parseInt(currentProject?.status || '0', 10);
    if (currentProject && projectStatus <= 5) {
      console.log('[getLayoutType] Projeto em processamento (status:', projectStatus, '), indo para dashboard');
      return 'dashboard'; // ProcessingWrapper vai cuidar da visualização
    }

    // Projeto com status > 5 mas sem integrações
    if (currentProject && !projectHasIntegrations) {
      console.log('[getLayoutType] Projeto sem integrações, indo para setup');
      return 'integration-setup';
    }
    
    // Verificar onboarding
    if (isOnboarding) {
      console.log('[getLayoutType] Em onboarding');
      return 'onboarding';
    }
    
    // Caso padrão: dashboard
    return 'dashboard';
  }, [
    loading,
    onboardingReady,
    isLoading,
    user,
    hasProjects,
    currentProject,
    projectHasIntegrations,
    isOnboarding
  ]);
  
  // Verificar se projeto está em processamento ANTES de decidir se retorna null
  const currentProjectStatus = parseInt(currentProject?.status || '0', 10);
  const isProjectProcessing = currentProject && currentProjectStatus <= 5;

  // Verificar se há parâmetros OAuth na URL antes de redirecionar
  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthCode = urlParams.get('code') !== null;
  const hasOAuthState = urlParams.get('state') !== null;

  // Não renderizar nada até estar pronto, EXCETO para projetos em processamento
  // Projetos em processamento devem renderizar o dashboard para que o ProcessingWrapper funcione
  if (!isProjectProcessing && (loading || !onboardingReady || isLoading || isInitializing || !isPageReady)) {
    console.log('[ProtectedLayout] Aguardando carregamento (não é projeto em processamento)');
    return null;
  }

  // Se é projeto em processamento, permitir renderização mesmo durante loading
  if (isProjectProcessing) {
    console.log('[ProtectedLayout] Projeto em processamento detectado, permitindo renderização');
  }

  // VERIFICAÇÃO DE ROTAS PÚBLICAS - APÓS TODOS OS HOOKS
  const publicRoutes = ['/trends', '/liftlio-analytics', '/about', '/privacy', '/terms', '/security'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Se é uma rota pública, não processar com ProtectedLayout
  if (isPublicRoute) {
    console.log('[ProtectedLayout] Route is public, returning null');
    return null;
  }
  if (hasOAuthCode && hasOAuthState && !isProjectProcessing && !isPublicRoute) {
    console.log('[ProtectedLayout] OAuth em andamento, aguardando processamento...');
    showGlobalLoader('Processing', 'Connecting to YouTube');
    // Removido return null - permitir que o componente continue renderizando
  }

  // Redirecionar para a página inicial (login) se não estiver autenticado
  // MAS NÃO redirecionar se é uma rota pública
  if (!user && !isPublicRoute) {
    console.log('[ProtectedLayout] No user and not public route, redirecting to landing-page.html');
    // Adicionar delay para capturar logs
    setTimeout(() => {
      window.location.href = '/landing-page.html';
    }, 1000);
    return <div>Redirecting to login...</div>;
  }

  // Se chegou aqui, o usuário está autenticado e o carregamento foi concluído

  // Redirecionar para a página de criação de projeto se o usuário não tiver projetos
  if (!hasProjects) {
    return (
      <AppContainer>
        <MainContent>
          {/* Header escondido na primeira etapa de criação de projeto */}
          <Routes>
            <Route path="*" element={<Navigate to="/create-project" replace />} />
            <Route path="/create-project" element={<SubscriptionGate><ProjectCreationPage /></SubscriptionGate>} />
          </Routes>
        </MainContent>
      </AppContainer>
    );
  }

  const layoutType = getLayoutType();

  // Log para debug simplificado
  console.log('Layout Decision:', {
    type: layoutType,
    projectId: currentProject?.id,
    hasIntegrations: projectHasIntegrations,
    integrationCount: projectIntegrations.length
  });
  
  // Renderizar layout baseado no tipo determinado
  if (layoutType === 'integration-setup') {
    return (
      <AppContainer>
        {/* SEM SIDEBAR - projeto sem integração não mostra menu lateral */}
        <MainContent style={{ width: '100%' }}>
          <Header toggleSidebar={toggleSidebar} />
          <ContentWrapper>
            <Routes>
              <Route path="*" element={<Navigate to="/integrations" replace />} />
              <Route path="/integrations" element={<SubscriptionGate><Integrations /></SubscriptionGate>} />
            </Routes>
          </ContentWrapper>
        </MainContent>
      </AppContainer>
    );
  }
  
  // Layout de onboarding - esconder completamente a sidebar
  if (layoutType === 'onboarding') {
    return (
      <Routes>
        <Route path="*" element={
          <div 
            style={{ 
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "#f0f2f5",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header fixo simples */}
            <div 
              style={{ 
                height: "70px", 
                backgroundColor: "#1e2a3d",
                color: "white",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                fontWeight: "bold",
                fontSize: "24px"
              }}
            >
              LIFTLIO
            </div>
            
            {/* Container de conteúdo */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              <ProjectCreationPage />
            </div>
          </div>
        } />
      </Routes>
    );
  }
  
  // Interface completa para usuários que já completaram o onboarding
  // Ou usuários que estão adicionando novo projeto (sempre mostrar header)
  return (
    <Routes>
      {/* Rota para criação de projeto - sem Sidebar e sem Header */}
      <Route path="/create-project" element={
        <SubscriptionGate>
          <AppContainer>
            <MainContent style={{ width: '100%' }}>
              {/* Header removido da página de criação de projeto */}
              <ContentWrapper>
                <ProjectCreationPage />
              </ContentWrapper>
            </MainContent>
          </AppContainer>
        </SubscriptionGate>
      } />
      
      {/* Todas as outras rotas - com Sidebar */}
      <Route path="*" element={
        <AppContainer>
          {/* Sidebar - desktop mode it's controlled by media query, mobile by state */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => toggleSidebar()} 
          />
          <MainContent>
            <Header toggleSidebar={toggleSidebar} />
            <SubscriptionWarningBanner />
            <ContentWrapper>
              <Routes>
                {/* Removida rota "/" duplicada - já definida nas rotas públicas */}
                <Route path="/dashboard" element={<SubscriptionGate><ProcessingWrapper onCheckingStateChange={setIsProcessingWrapperChecking}><Overview /></ProcessingWrapper></SubscriptionGate>} />
                <Route path="/analytics" element={<SubscriptionGate><Analytics /></SubscriptionGate>} />
                <Route path="/monitoring" element={<SubscriptionGate><ProcessingWrapper onCheckingStateChange={setIsProcessingWrapperChecking}><Monitoring /></ProcessingWrapper></SubscriptionGate>} />
                <Route path="/mentions" element={<SubscriptionGate><ProcessingWrapper onCheckingStateChange={setIsProcessingWrapperChecking}><Mentions /></ProcessingWrapper></SubscriptionGate>} />
                <Route path="/settings" element={<SubscriptionGate><Settings /></SubscriptionGate>} />
                <Route path="/billing" element={<SubscriptionGate><Billing /></SubscriptionGate>} />
                <Route path="/integrations" element={<SubscriptionGate><Integrations /></SubscriptionGate>} />
                {/* <Route path="/url-test" element={<SubscriptionGate><UrlDataTest /></SubscriptionGate>} /> */}
                {/* Removed duplicate trends and analytics routes - they are defined as public routes */}
                <Route path="*" element={(() => {
                  console.log(`[ProtectedLayout Internal Catch-all] Redirecting ${window.location.pathname} to /dashboard`);
                  return <Navigate to="/dashboard" replace />;
                })()} />
              </Routes>
            </ContentWrapper>
          </MainContent>
          
          {/* Floating hamburger menu button for mobile */}
          <FloatingMenuButton onClick={toggleSidebar}>
            <IconComponent icon={FaBars} />
          </FloatingMenuButton>
          
          {/* Floating Agent Widget */}
          <FloatingAgent />
        </AppContainer>
      } />
    </Routes>
  );
}

// Componente para lidar com callbacks de autenticação
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { showGlobalLoader } = useGlobalLoading();
  
  useEffect(() => {
    // Mostrar loading global durante callback
    showGlobalLoader('Authenticating', 'Verifying your credentials');
    
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
                console.log('Active session found, redirecting to dashboard');
                navigate('/dashboard', { replace: true });
              } else {
                console.log('No active session, trying to establish one...');
                
                // Force a refresh based on the URL tokens
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
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
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    }
  }, [user, loading, navigate, location, showGlobalLoader]);
  
  // Loading global está sendo mostrado
  return null;
};

export default App;
