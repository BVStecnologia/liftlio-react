import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // Verificar se há código OAuth na URL antes de redirecionar
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.get('code');
    const hasState = urlParams.get('state');
    
    // Verificar também se acabamos de completar OAuth (vindo do dashboard)
    const oauthCompleted = urlParams.get('oauth_completed') === 'true';
    const recentOAuth = localStorage.getItem('recentIntegration') === 'true';
    
    // Só redirecionar se NÃO for um callback OAuth e não for recente
    if (!hasOAuthCode && !hasState && !oauthCompleted && !recentOAuth) {
      // Redirecionar para a landing page HTML
      window.location.href = '/landing-page.html';
    } else {
      console.log('[LandingPageHTML] OAuth detectado ou em processamento, aguardando...');
    }
  }, []);

  // Mostrar loading enquanto processa OAuth
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0A0A0B'
    }}>
      <div>Processing...</div>
    </div>
  );
};

export default LandingPageHTML;