import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // IMPORTANTE: Verificar se tem parâmetros OAuth antes de redirecionar
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.get('code');
    const hasOAuthState = urlParams.get('state');

    console.log('[LandingPageHTML] Verificando OAuth params:', {
      hasCode: !!hasOAuthCode,
      hasState: !!hasOAuthState,
      fullURL: window.location.href
    });

    // Se tem parâmetros OAuth, NÃO redirecionar - deixar o OAuthHandler processar
    if (hasOAuthCode && hasOAuthState) {
      console.log('[LandingPageHTML] OAuth detectado, aguardando processamento...');
      console.log('[LandingPageHTML] Code:', hasOAuthCode?.substring(0, 20) + '...');
      console.log('[LandingPageHTML] State (Project ID):', hasOAuthState);
      // Não fazer nada - o OAuthHandler vai processar
      return;
    }

    console.log('[LandingPageHTML] Sem OAuth, redirecionando para landing...');
    // Só redirecionar para landing page HTML se NÃO for OAuth
    window.location.href = '/landing-page.html';
  }, []);
  
  // Mostrar loading enquanto processa OAuth ou redireciona
  const urlParams = new URLSearchParams(window.location.search);
  const isOAuth = urlParams.get('code') && urlParams.get('state');

  if (isOAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1b 100%)',
        color: '#fff'
      }}>
        <div style={{
          padding: '40px',
          borderRadius: '16px',
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#8b5cf6' }}>
            Connecting YouTube...
          </h2>
          <p style={{ marginBottom: '20px', opacity: 0.8 }}>
            Please wait while we complete your YouTube integration.
          </p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <div>Redirecting...</div>;
};

export default LandingPageHTML;