import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { ReactNode } from 'react'

// PostHog configuration
export const posthogConfig = {
  api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.posthog.com',
  // Configuração para contornar adblockers
  disable_session_recording: false,
  opt_out_capturing_by_default: false,
  capture_pageview: true,
  capture_pageleave: true,
  persistence: 'localStorage' as const,
  autocapture: true,
  capture_performance: true,
  session_recording: {
    recordCrossOriginIframes: true,
  },
  // Error tracking configuration
  _capture_errors: true,
  loaded: (posthog: any) => {
    // Verificar se está sendo bloqueado
    if (!posthog._loaded) {
      console.warn('PostHog pode estar sendo bloqueado por adblockers');
    }
    // Enable exception autocapture
    posthog.opt_in_capturing();
    console.log('PostHog loaded with error tracking enabled!');
    
    // Não sobrescrever window.onerror pois já está protegido no index.html
    // Apenas adicionar listener para capturar erros relevantes
    const originalOnerror = window.onerror;
    if (typeof originalOnerror === 'function') {
      // Encadear com o handler existente se possível
      const chainedHandler = function(message: any, source: any, lineno: any, colno: any, error: any) {
        // Primeiro chamar o handler de proteção do index.html
        const result = originalOnerror.call(window, message, source, lineno, colno, error);
        
        // Se o erro não foi suprimido e é relevante, capturar no PostHog
        if (!result && error && !source?.includes('chrome-extension://') && !source?.includes('frame_ant')) {
          posthog.captureException(error, {
            message,
            source,
            lineno,
            colno,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          });
        }
        
        return result;
      };
      
      // Tentar adicionar o handler sem sobrescrever (pode falhar se não-configurável)
      try {
        Object.defineProperty(window, 'onerror', {
          value: chainedHandler,
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Se não puder sobrescrever, tudo bem - a proteção do HTML já está ativa
        console.log('PostHog: Using existing error protection from HTML');
      }
    }
    
    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason;
      
      // Ignorar AbortErrors - são esperados quando requests são cancelados
      if (reason && (reason.name === 'AbortError' || reason.message === 'signal is aborted without reason')) {
        event.preventDefault();
        return;
      }
      
      // Ignorar TODOS os erros "Failed to fetch"
      if (reason && reason.message && reason.message.includes('Failed to fetch')) {
        event.preventDefault(); // Previne o erro de aparecer no console
        return;
      }
      
      // Ignorar erros relacionados a frame_ant ou extensões
      if (reason && reason.stack) {
        const stack = reason.stack;
        if (stack.includes('chrome-extension://') || stack.includes('frame_ant') || stack.includes('hoklmmgfnpapgjgcpechhaamimifchmp')) {
          event.preventDefault(); // Previne o erro de aparecer no console
          return;
        }
      }
      
      posthog.captureException(new Error(event.reason), {
        type: 'unhandledrejection',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });
  }
}

// PostHog Provider Component
interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const apiKey = process.env.REACT_APP_POSTHOG_KEY || 'phc_7ThenvcJ0m1UJfZH1sT7UygnN2eqSsiwm34xyC8u3Kb'
  
  if (!apiKey) {
    console.warn('PostHog key not found. Analytics will not be tracked.')
    return <>{children}</>
  }
  
  // Log para debug
  console.log('PostHog Provider iniciando com key:', apiKey.substring(0, 10) + '...')
  
  return (
    <PHProvider 
      apiKey={apiKey}
      options={posthogConfig}
    >
      {children}
    </PHProvider>
  )
}

export default posthog