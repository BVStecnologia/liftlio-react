import React, { useState, useEffect, lazy, Suspense, startTransition } from 'react';
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
import { supabase } from './lib/supabaseClient';
// PostHog removed for performance optimization

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
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
const ContactPage = lazy(() => import('./pages/ContactPage'));

// Lazy load heavy components
const Sidebar = lazy(() => import('./components/Sidebar'));
const Header = lazy(() => import('./components/Header'));
const SubscriptionWarningBanner = lazy(() => import('./components/SubscriptionWarningBanner'));
const ProcessingWrapper = lazy(() => import('./components/ProcessingWrapperSimplified'));
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
  background: ${props => props.theme.name === 'dark'
    ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
    : 'linear-gradient(135deg, #8B5CF6, #A78BFA)'}; /* Cores roxas Liftlio */
  color: #FFFFFF;
  border: none;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3),
              inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
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

// OAuthHandler removido - processamento OAuth agora é feito no LandingPageHTML com OAuthProcessor dedicado

// Component that uses the global loading context
const AppContent: React.FC = () => {
  const { isGlobalLoading, loadingMessage, loadingSubMessage } = useGlobalLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  // DEBUG: Log para rastrear quando AppContent é renderizado
  console.log('[AppContent] Current URL: ' + window.location.pathname);

  const toggleSidebar = () => {
    // Se agente estiver aberto em mobile, fecha o agente primeiro
    if (window.innerWidth <= 768 && agentOpen) {
      setAgentOpen(false);
    }
    setSidebarOpen(!sidebarOpen);
  };

  const toggleAgent = () => {
    setAgentOpen(!agentOpen);
    // Close sidebar when opening agent on mobile
    if (window.innerWidth <= 768 && !agentOpen) {
      setSidebarOpen(false);
    }
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
        <Routes>
          {/* Landing page como ponto de entrada principal - força nova renderização */}
          <Route path="/" element={
            <Suspense fallback={null}>
              <LandingPageHTML key="landing-home" />
            </Suspense>
          } />
          <Route path="/login" element={
            <Suspense fallback={null}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="/reset-password" element={
            <Suspense fallback={null}>
              <ResetPassword />
            </Suspense>
          } />
          <Route path="/auth/callback" element={
            <Suspense fallback={null}>
              <AuthCallback />
            </Suspense>
          } />
          <Route path="/checkout" element={
            <Suspense fallback={null}>
              <CheckoutPage />
            </Suspense>
          } />
          <Route path="/liftlio-analytics" element={
            <Suspense fallback={null}>
              <LiftlioAnalytics />
            </Suspense>
          } />
          <Route path="/trends" element={
            <Suspense fallback={null}>
              <PublicLayout><LiftlioTrends /></PublicLayout>
            </Suspense>
          } />

          {/* Páginas institucionais */}
          {/* /about agora é servido como HTML estático em /public/about.html */}
          <Route path="/contato" element={
            <Suspense fallback={null}>
              <ContactPage />
            </Suspense>
          } />
          <Route path="/contact" element={
            <Suspense fallback={null}>
              <ContactPage />
            </Suspense>
          } />
          <Route path="/privacy" element={<StaticRedirect to="/privacy.html" />} />
          <Route path="/terms" element={<StaticRedirect to="/terms.html" />} />
          <Route path="/security" element={
            <Suspense fallback={null}>
              <Security />
            </Suspense>
          } />

          {/* Rota removida: Analytics Showcase (não utilizada) */}


          {/* Rotas protegidas - usar apenas uma rota com wildcard pois ProtectedLayout tem rotas internas */}
          <Route path="/*" element={
            <Suspense fallback={null}>
              <ProtectedLayout
                sidebarOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                agentOpen={agentOpen}
                toggleAgent={toggleAgent}
              />
            </Suspense>
          } />
        </Routes>
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
const ProtectedLayout = ({
  sidebarOpen,
  toggleSidebar,
  agentOpen,
  toggleAgent
}: {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  agentOpen: boolean;
  toggleAgent: () => void;
}) => {
  const { user, loading } = useAuth();
  const { isOnboarding, onboardingReady, hasProjects, isLoading, projectIntegrations, currentProject, setCurrentProject } = useProject();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const [displayState, setDisplayState] = useState<any>(null);
  const [checkingState, setCheckingState] = useState(true);
  const [lastCheckedProjectId, setLastCheckedProjectId] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // REMOVIDO: Toda lógica complexa de loading do ProtectedLayout
  // O loading agora é controlado APENAS por:
  // 1. ProcessingWrapper (refresh da página)
  // 2. Header (mudança de projeto)

  // Effect REMOVIDO - loading agora é controlado pelo ProcessingWrapper e Header
  // Não fazemos nada aqui para evitar conflitos
  
  // Effect simplificado - apenas marca como pronto quando tudo carrega
  useEffect(() => {
    // Verificar se acabamos de completar OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCompleted = urlParams.get('oauth_completed') === 'true';

    // Projeto em processamento - deixar ProcessingWrapper cuidar
    const projectStatus = parseInt(currentProject?.status || '0', 10);
    if (currentProject && projectStatus <= 5) {
      console.log('Projeto em processamento, deixando ProcessingWrapper controlar');
      setIsInitializing(false);
      setIsPageReady(true);
      if (oauthCompleted) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    // Quando tudo estiver carregado, marcar como pronto
    if (!loading && onboardingReady && !isLoading) {
      console.log('ProtectedLayout: Tudo carregado, marcando como pronto');
      setIsInitializing(false);
      setIsPageReady(true);
      // Limpar o parâmetro oauth_completed da URL se existir
      if (oauthCompleted) {
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1000);
      }
    }
  }, [loading, onboardingReady, isLoading, currentProject]);
  
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

  // 🔥 NOVO: Chamar SQL check_project_display_state PRIMEIRO
  // Isso elimina as "piscadas" mostrando o componente correto imediatamente
  useEffect(() => {
    const checkDisplayState = async () => {
      // Só checar se tiver usuário e tudo carregado
      if (!user?.email || loading || !onboardingReady) {
        return;
      }

      // 🔥 PROTEÇÃO ANTI-LOOP: Só executar se projeto OU status mudou
      const projectId: number | null = currentProject?.id ? Number(currentProject.id) : null;
      const projectStatus = currentProject?.status || '0';
      const currentKey = `${projectId}_${projectStatus}`; // Chave única: ID + Status
      const lastKey = lastCheckedProjectId ? `${lastCheckedProjectId}_${sessionStorage.getItem('lastCheckedStatus') || '0'}` : null;

      if (currentKey === lastKey) {
        console.log('[ProtectedLayout] Projeto e status não mudaram (ID:', projectId, 'Status:', projectStatus, '), pulando verificação');
        return;
      }

      console.log('[ProtectedLayout] Projeto ou status mudou de', lastKey, 'para', currentKey, '- verificando estado...');
      setCheckingState(true);

      try {
        const { data, error } = await supabase.rpc('check_project_display_state', {
          p_user_email: user.email,
          p_project_id: projectId
        });

        if (error) {
          console.error('[ProtectedLayout] Erro no RPC:', error);
          setCheckingState(false);
          return;
        }

        console.log('[ProtectedLayout] Estado retornado:', data);
        setDisplayState(data);

        // Atualizar último ID e status checados (protege contra loop)
        setLastCheckedProjectId(projectId);
        sessionStorage.setItem('lastCheckedStatus', projectStatus);

        setCheckingState(false);
      } catch (err) {
        console.error('[ProtectedLayout] Erro:', err);
        setCheckingState(false);
      }
    };

    // ⚡ DEBOUNCE: Esperar 300ms após última mudança antes de executar
    // Isso evita múltiplas chamadas SQL quando currentProject muda 4x em 2 segundos
    const debounceTimeout = setTimeout(() => {
      checkDisplayState();
    }, 300);

    // Limpar timeout se projeto mudar novamente antes dos 300ms
    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [user, loading, onboardingReady, currentProject?.id, currentProject?.status, lastCheckedProjectId]); // ✅ currentProject?.id e status adicionado COM proteção anti-loop + debounce

  // VERIFICAÇÃO DE ROTAS PÚBLICAS - Calcular antes de usar
  const publicRoutes = ['/trends', '/liftlio-analytics', '/about', '/privacy', '/terms', '/security'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Redirecionar para login se não autenticado (deve estar ANTES de qualquer return)
  useEffect(() => {
    if (!user && !isPublicRoute && !loading) {
      console.log('[ProtectedLayout] No user and not public route, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [user, isPublicRoute, loading, navigate]);

  // Verificação simplificada de integrações usando useMemo para evitar re-cálculos
  // IMPORTANTE: Mover hooks ANTES de qualquer return condicional
  const projectHasIntegrations = React.useMemo(() => {
    if (!currentProject) return false;

    // FILTRAR integrações do projeto atual - projectIntegrations pode conter de outros projetos!
    const currentProjectIntegrations = projectIntegrations.filter(
      integration => integration['PROJETO id'] === currentProject.id
    );

    return currentProjectIntegrations.length > 0;
  }, [currentProject, projectIntegrations]);

  // Função helper para determinar o tipo de layout a mostrar
  const getLayoutType = React.useCallback(() => {
    // Ordem de prioridade clara:
    if (loading || !onboardingReady || isLoading) return 'loading';
    if (!user) return 'login';
    if (!hasProjects) return 'create-project';

    // REMOVIDO: Verificação de integrações - ProcessingWrapper já faz isso via SQL
    // A SQL retorna display_component correto baseado em has_messages e has_integration
    // Duplicar essa lógica aqui causa race conditions e redirecionamentos errados

    // Verificar status do projeto
    // Projetos em processamento (status 0-5) vão pro dashboard
    const projectStatus = parseInt(currentProject?.status || '0', 10);
    if (currentProject && projectStatus <= 5) {
      console.log('[getLayoutType] Projeto em processamento (status:', projectStatus, '), indo para dashboard');
      return 'dashboard'; // ProcessingWrapper vai cuidar da visualização
    }

    // Verificar onboarding
    if (isOnboarding) {
      console.log('[getLayoutType] Em onboarding');
      return 'onboarding';
    }

    // Caso padrão: dashboard (ProcessingWrapper decide se mostra integrations)
    return 'dashboard';
  }, [
    loading,
    onboardingReady,
    isLoading,
    user,
    hasProjects,
    currentProject,
    isOnboarding
  ]);

  // Verificar se projeto está em processamento ANTES de decidir se retorna null
  const currentProjectStatus = parseInt(currentProject?.status || '0', 10);
  const isProjectProcessing = currentProject && currentProjectStatus <= 5;

  // Verificar se há parâmetros OAuth na URL antes de redirecionar
  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthCode = urlParams.get('code') !== null;
  const hasOAuthState = urlParams.get('state') !== null;

  // PRIORIDADE 1: Verificar autenticação ANTES de loading
  // Se não tem usuário E não é rota pública, mostrar loading de redirect
  if (!user && !isPublicRoute && !loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: getThemeBackground(),
        zIndex: 9999
      }}>
        <GlobalLoader message="Redirecting" subMessage="Taking you to login..." fullScreen={false} />
      </div>
    );
  }

  // PRIORIDADE 2: Loading states (só se tiver usuário ou for rota pública)
  // Não renderizar nada até estar pronto, EXCETO para projetos em processamento
  // Projetos em processamento devem renderizar o dashboard para que o ProcessingWrapper funcione
  if (!isProjectProcessing && (loading || !onboardingReady || isLoading || isInitializing || !isPageReady)) {
    console.log('[ProtectedLayout] Aguardando carregamento (não é projeto em processamento)');
    // Mostrar loading visual ao invés de tela preta
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: getThemeBackground(),
        zIndex: 9999
      }}>
        <GlobalLoader message="Loading" subMessage="Please wait..." fullScreen={false} />
      </div>
    );
  }

  // Se é projeto em processamento, permitir renderização mesmo durante loading
  if (isProjectProcessing) {
    console.log('[ProtectedLayout] Projeto em processamento detectado, permitindo renderização');
  }

  // Se é uma rota pública, não processar com ProtectedLayout
  if (isPublicRoute) {
    console.log('[ProtectedLayout] Route is public, returning null');
    return null;
  }

  // REMOVIDO: Bloco showGlobalLoader órfão que causava loading perpétuo
  // OAuth é processado em AuthCallback, não precisa mostrar loading aqui

  // Se chegou aqui, o usuário está autenticado e o carregamento foi concluído

  // 🔥 NOVO: Mostrar loading enquanto SQL está verificando
  if (checkingState || !displayState) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: getThemeBackground(),
        zIndex: 9999
      }}>
        <GlobalLoader message="Loading" subMessage="Preparing your workspace..." fullScreen={false} />
      </div>
    );
  }

  // 🔥 NOVO: Renderizar baseado no display_component retornado pela SQL
  // Isso elimina as "piscadas" indo diretamente para o componente correto
  if (displayState?.display_component === 'create_project') {
    return (
      <AppContainer>
        <MainContent>
          <Routes>
            <Route path="*" element={<Navigate to="/create-project" replace />} />
            <Route path="/create-project" element={<SubscriptionGate><ProjectCreationPage /></SubscriptionGate>} />
          </Routes>
        </MainContent>
      </AppContainer>
    );
  }

  if (displayState?.display_component === 'need_integration') {
    console.log('[ProtectedLayout] SQL indica need_integration, renderizando Integrations');
    return (
      <AppContainer>
        <Suspense fallback={null}>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => toggleSidebar()}
            onOpenAgent={toggleAgent}
            isAgentOpen={agentOpen}
          />
        </Suspense>
        <MainContent>
          <Suspense fallback={null}>
            <Header toggleSidebar={toggleSidebar} />
          </Suspense>
          <ContentWrapper>
            <SubscriptionGate><Integrations /></SubscriptionGate>
          </ContentWrapper>
        </MainContent>
        <FloatingMenuButton onClick={toggleSidebar}>
          <IconComponent icon={FaBars} />
        </FloatingMenuButton>
        <Suspense fallback={null}>
          <FloatingAgent
            externalIsOpen={agentOpen}
            onExternalToggle={toggleAgent}
          />
        </Suspense>
      </AppContainer>
    );
  }

  if (displayState?.display_component === 'setup_processing') {
    console.log('[ProtectedLayout] SQL indica setup_processing, renderizando tela de processamento COM layout');
    const progress = displayState?.progress_percentage || 0;
    const message = displayState?.processing_message || 'Processing...';
    const status = displayState?.project_status || 0;

    const ProcessStep = ({ number, label, active, completed }: {
      number: number;
      label: string;
      active?: boolean;
      completed?: boolean;
    }) => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        opacity: completed || active ? 1 : 0.5
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: completed ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' :
                      active ? 'rgba(139, 92, 246, 0.2)' :
                      'rgba(255, 255, 255, 0.1)',
          border: active ? '2px solid #8b5cf6' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: completed || active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
          transition: 'all 0.3s ease',
          boxShadow: active ? '0 0 20px rgba(139, 92, 246, 0.4)' :
                     completed ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
        }}>
          {completed ? '✓' : number}
        </div>
        <div style={{
          flex: 1,
          fontSize: '14px',
          color: completed || active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
          fontWeight: active ? '500' : 'normal'
        }}>
          {label}
          {active && (
            <span style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: '#a855f7',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              Processing...
            </span>
          )}
        </div>
      </div>
    );

    const steps = [
      { number: 1, label: 'Starting project setup' },
      { number: 2, label: 'Connecting to YouTube API' },
      { number: 3, label: 'Analyzing channel and videos' },
      { number: 4, label: 'Processing engagement metrics' },
      { number: 5, label: 'Analyzing comments with AI' },
      { number: 6, label: 'Generating insights and reports' },
      { number: 7, label: 'Finalizing initial processing' }
    ];

    return (
      <AppContainer>
        <Suspense fallback={null}>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => toggleSidebar()}
            onOpenAgent={toggleAgent}
            isAgentOpen={agentOpen}
          />
        </Suspense>
        <MainContent>
          <Suspense fallback={null}>
            <Header toggleSidebar={toggleSidebar} />
          </Suspense>
          <ContentWrapper>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 200px)',
              padding: '20px',
              width: '100%'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(30, 30, 30, 0.95) 100%)',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '600px',
                width: '100%',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                margin: '0 auto'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center'
                }}>
                  Setting Up Your Project
                </h2>

                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  {message}
                </p>

                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginBottom: '30px',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  This may take a few minutes on your first setup while we analyze your content
                </p>

                <div style={{ marginBottom: '30px' }}>
                  {steps.map((step, index) => (
                    <ProcessStep
                      key={step.number}
                      number={step.number}
                      label={step.label}
                      active={index === status}
                      completed={index < status}
                    />
                  ))}
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  height: '8px',
                  overflow: 'hidden',
                  marginTop: '20px'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                    height: '100%',
                    width: `${progress}%`,
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                  }} />
                </div>

                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '10px',
                  textAlign: 'center'
                }}>
                  {progress}% Complete
                </p>
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.6; }
                }
              `}</style>
            </div>
          </ContentWrapper>
        </MainContent>
        <FloatingMenuButton onClick={toggleSidebar}>
          <IconComponent icon={FaBars} />
        </FloatingMenuButton>
        <Suspense fallback={null}>
          <FloatingAgent
            externalIsOpen={agentOpen}
            onExternalToggle={toggleAgent}
          />
        </Suspense>
      </AppContainer>
    );
  }

  if (displayState?.display_component === 'integration_disabled') {
    console.log('[ProtectedLayout] SQL indica integration_disabled');
    return (
      <AppContainer>
        <Suspense fallback={null}>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => toggleSidebar()}
            onOpenAgent={toggleAgent}
            isAgentOpen={agentOpen}
          />
        </Suspense>
        <MainContent>
          <Suspense fallback={null}>
            <Header toggleSidebar={toggleSidebar} />
          </Suspense>
          <ContentWrapper>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 200px)',
              textAlign: 'center'
            }}>
              <div>
                <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Integration Disabled</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
                  Your YouTube integration is currently disabled. Please reconnect to continue.
                </p>
                <button
                  onClick={() => navigate('/integrations')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Go to Integrations
                </button>
              </div>
            </div>
          </ContentWrapper>
        </MainContent>
        <FloatingMenuButton onClick={toggleSidebar}>
          <IconComponent icon={FaBars} />
        </FloatingMenuButton>
        <Suspense fallback={null}>
          <FloatingAgent
            externalIsOpen={agentOpen}
            onExternalToggle={toggleAgent}
          />
        </Suspense>
      </AppContainer>
    );
  }

  // 🔥 NOVO: Se SQL retornou 'dashboard' ou qualquer outro caso não específico,
  // continuar para renderizar o layout completo com todas as rotas abaixo.
  // A SQL já validou que o usuário tem projeto com integração e pode ver o dashboard.
  console.log('[ProtectedLayout] SQL indica dashboard ou caso padrão, renderizando layout completo');

  // NOTA: Código abaixo (hasProjects checks, layoutType, etc) ainda é executado
  // para casos edge e rotas especiais, mas a decisão principal vem da SQL acima.

  // Redirecionar para a página de criação de projeto se o usuário não tiver projetos
  // MAS NÃO redirecionar se está carregando (pode ser uma troca de projeto)
  if (!hasProjects && !isLoading) {
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

  // REMOVIDO: case 'integration-setup' - ProcessingWrapper agora decide via SQL

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

  // REMOVIDO: A lógica de processamento já é tratada pelo ProcessingWrapper
  // O ProcessingWrapper decide internamente se mostra a tela de processamento ou o conteúdo
  // Não precisamos duplicar essa lógica aqui

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
          <Suspense fallback={null}>
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => toggleSidebar()}
              onOpenAgent={toggleAgent}
              isAgentOpen={agentOpen}
            />
          </Suspense>
          <MainContent>
            <Suspense fallback={null}>
              <Header toggleSidebar={toggleSidebar} />
            </Suspense>
            <Suspense fallback={null}>
              <SubscriptionWarningBanner />
            </Suspense>
            <ContentWrapper>
              {/* Removido Suspense aninhado para evitar múltiplos loadings */}
              <Routes>
                {/* Removida rota "/" duplicada - já definida nas rotas públicas */}
                <Route path="/dashboard" element={<SubscriptionGate><ProcessingWrapper><Overview /></ProcessingWrapper></SubscriptionGate>} />
                <Route path="/analytics" element={<SubscriptionGate><Analytics /></SubscriptionGate>} />
                <Route path="/monitoring" element={<SubscriptionGate><ProcessingWrapper><Monitoring /></ProcessingWrapper></SubscriptionGate>} />
                <Route path="/mentions" element={<SubscriptionGate><ProcessingWrapper><Mentions /></ProcessingWrapper></SubscriptionGate>} />
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
          <Suspense fallback={null}>
            <FloatingAgent
              externalIsOpen={agentOpen}
              onExternalToggle={toggleAgent}
            />
          </Suspense>
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
