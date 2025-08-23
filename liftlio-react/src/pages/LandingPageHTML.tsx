import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // IMPORTANTE: Verificar se tem parâmetros OAuth antes de redirecionar
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.get('code');
    const hasOAuthState = urlParams.get('state');
    
    // Se tem parâmetros OAuth, NÃO redirecionar - deixar o OAuthHandler processar
    if (hasOAuthCode && hasOAuthState) {
      console.log('[LandingPageHTML] OAuth detectado, aguardando processamento...');
      // Não fazer nada - o OAuthHandler vai processar
      return;
    }
    
    // Só redirecionar para landing page HTML se NÃO for OAuth
    window.location.href = '/landing-page.html';
  }, []);
  
  // Mostrar loading enquanto processa OAuth ou redireciona
  return <div>Processando...</div>;
};

export default LandingPageHTML;