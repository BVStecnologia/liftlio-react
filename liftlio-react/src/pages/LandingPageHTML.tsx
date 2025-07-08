import React, { useEffect, useState } from 'react';

const LandingPageHTML: React.FC = () => {
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  
  useEffect(() => {
    // Verificar se há código OAuth na URL antes de redirecionar
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.get('code');
    const hasState = urlParams.get('state');
    
    // Se temos OAuth, aguardar processamento
    if (hasOAuthCode && hasState) {
      console.log('[LandingPageHTML] OAuth detectado, aguardando processamento...');
      setIsProcessingOAuth(true);
      
      // Aguardar um tempo maior para o OAuthHandler processar
      // Isso dá tempo para o OAuthHandler executar e fazer o redirect
      setTimeout(() => {
        // Se ainda estivermos aqui após 5 segundos, algo deu errado
        // Então redirecionamos para a landing page
        const currentUrl = new URLSearchParams(window.location.search);
        if (currentUrl.get('code') && currentUrl.get('state')) {
          console.error('[LandingPageHTML] OAuth não foi processado após 5s, redirecionando...');
          window.location.href = '/landing-page.html';
        }
      }, 5000);
      
      return; // Não fazer mais nada se estamos processando OAuth
    }
    
    // Verificar também se acabamos de completar OAuth (vindo do dashboard)
    const oauthCompleted = urlParams.get('oauth_completed') === 'true';
    const recentOAuth = localStorage.getItem('recentIntegration') === 'true';
    
    // Só redirecionar se NÃO for relacionado a OAuth
    if (!oauthCompleted && !recentOAuth) {
      // Pequeno delay para garantir que não há OAuth em andamento
      setTimeout(() => {
        window.location.href = '/landing-page.html';
      }, 100);
    }
  }, []);

  // Se estamos processando OAuth, mostrar loading
  if (isProcessingOAuth) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0B',
        color: '#fff'
      }}>
        <div>
          <h2>Processing YouTube Authorization...</h2>
          <p>Please wait while we complete the integration.</p>
        </div>
      </div>
    );
  }

  // Caso contrário, mostrar loading genérico
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0A0A0B'
    }}>
      <div>Loading...</div>
    </div>
  );
};

export default LandingPageHTML;