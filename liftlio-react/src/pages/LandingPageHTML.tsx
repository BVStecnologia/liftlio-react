import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // Verificar se há código OAuth na URL antes de redirecionar
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.get('code');
    const hasState = urlParams.get('state');
    
    // Só redirecionar se NÃO for um callback OAuth
    if (!hasOAuthCode || !hasState) {
      // Redirecionar para a landing page HTML
      window.location.href = '/landing-page.html';
    } else {
      console.log('[LandingPageHTML] OAuth callback detectado, aguardando processamento...');
    }
  }, []);

  return null;
};

export default LandingPageHTML;