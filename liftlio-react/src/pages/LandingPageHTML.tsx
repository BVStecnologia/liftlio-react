import React, { useEffect } from 'react';

const LandingPageHTML: React.FC = () => {
  useEffect(() => {
    // Redirecionar para a landing page HTML
    window.location.href = '/landing-page.html';
  }, []);

  return null;
};

export default LandingPageHTML;