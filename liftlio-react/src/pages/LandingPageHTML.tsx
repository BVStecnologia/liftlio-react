import React, { useEffect, useState } from 'react';
import OAuthProcessor from '../components/OAuthProcessor';

const LandingPageHTML: React.FC = () => {
  const [oauthParams, setOauthParams] = useState<{ code: string; state: string } | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // CRITICAL: Only process if we're actually on the root path
    // This prevents redirect loops when React Router incorrectly renders this component
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '') {
      console.log('[LandingPageHTML] Not on root path, skipping redirect. Current path:', currentPath);
      return;
    }

    // Verificar parâmetros OAuth imediatamente
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    console.log('[LandingPageHTML] Verificando OAuth params:', {
      hasCode: !!code,
      hasState: !!state,
      fullURL: window.location.href
    });

    if (code && state) {
      // OAuth detectado - processar com o componente dedicado
      console.log('[LandingPageHTML] OAuth detectado, processando com OAuthProcessor');
      setOauthParams({ code, state });

      // Limpar URL para evitar reprocessamento em refresh
      window.history.replaceState({}, document.title, '/');
    } else {
      // Sem OAuth - aguardar um pouco antes de redirecionar
      // para garantir que não há race condition
      console.log('[LandingPageHTML] Sem OAuth, aguardando antes de redirecionar...');
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 500); // Aguardar 500ms antes de decidir redirecionar

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (shouldRedirect) {
      console.log('[LandingPageHTML] Redirecionando para landing page...');
      window.location.href = '/landing-page.html';
    }
  }, [shouldRedirect]);

  // Se temos parâmetros OAuth, usar o OAuthProcessor
  if (oauthParams) {
    return (
      <OAuthProcessor
        code={oauthParams.code}
        state={oauthParams.state}
        onComplete={() => {
          console.log('[LandingPageHTML] OAuth processado com sucesso');
        }}
        onError={(error) => {
          console.error('[LandingPageHTML] Erro ao processar OAuth:', error);
        }}
      />
    );
  }

  // Enquanto decide se redireciona ou não
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0a0b',
      color: '#ffffff'
    }}>
      <div>Loading...</div>
    </div>
  );
};

export default LandingPageHTML;
