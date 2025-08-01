import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

export function PostHogTest() {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      console.log('PostHog está carregado! Enviando evento de teste...');
      
      // Enviar evento de teste
      posthog.capture('app_loaded', {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      
      // Identificar sessão anônima
      posthog.capture('$pageview');
      
      // Log para debug
      console.log('PostHog instance:', posthog);
      console.log('PostHog distinct_id:', posthog.get_distinct_id());
    } else {
      console.error('PostHog não está disponível!');
    }
  }, [posthog]);

  return null;
}