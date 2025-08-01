import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { usePostHogTracking } from '../hooks/usePostHogTracking';

// Exemplo 1: Usando o hook diretamente do posthog-js/react
export function ExampleComponent1() {
  const posthog = usePostHog();

  const handleClick = () => {
    // Capturar evento customizado
    posthog?.capture('button_clicked', {
      button_name: 'submit',
      page: 'example',
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <button onClick={handleClick}>
      Click me to track event
    </button>
  );
}

// Exemplo 2: Usando o hook customizado usePostHogTracking
export function ExampleComponent2() {
  const { trackEvent, trackError } = usePostHogTracking();

  const handleSubmit = async () => {
    try {
      // Track início da ação
      trackEvent('form_submission_started', {
        form_name: 'user_profile',
      });

      // Simular uma ação
      await someAsyncAction();

      // Track sucesso
      trackEvent('form_submission_completed', {
        form_name: 'user_profile',
        success: true,
      });
    } catch (error) {
      // Track erro
      trackError(error as Error, {
        action: 'form_submission',
        form_name: 'user_profile',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Submit</button>
    </form>
  );
}

// Exemplo 3: Tracking de página
export function PageWithTracking() {
  const { trackPageView } = usePostHogTracking();

  React.useEffect(() => {
    // Track visualização de página quando componente monta
    trackPageView('example_page', {
      section: 'documentation',
      user_type: 'logged_in',
    });
  }, [trackPageView]);

  return <div>Page content with automatic tracking</div>;
}

// Exemplo 4: Feature Flags
export function FeatureFlagExample() {
  const posthog = usePostHog();
  
  // Verificar se uma feature flag está ativa
  const isNewFeatureEnabled = posthog?.isFeatureEnabled('new-feature');
  const betaFeatureValue = posthog?.getFeatureFlag('beta-feature');

  return (
    <div>
      {isNewFeatureEnabled && (
        <div>New Feature is enabled!</div>
      )}
      
      {betaFeatureValue === 'variant-a' && (
        <div>Showing variant A of beta feature</div>
      )}
      
      {betaFeatureValue === 'variant-b' && (
        <div>Showing variant B of beta feature</div>
      )}
    </div>
  );
}

// Função simulada para o exemplo
async function someAsyncAction() {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}