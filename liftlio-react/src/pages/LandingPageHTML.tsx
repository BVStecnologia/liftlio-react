import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // Sempre redirecionar para a landing page HTML
    window.location.href = '/landing-page.html';
  }, []);
  
  // Mostrar nada enquanto redireciona
  return null;
};

export default LandingPageHTML;