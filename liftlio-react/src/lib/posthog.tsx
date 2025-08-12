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
    
    // Configure global error handlers with filtering
    window.onerror = function(message, source, lineno, colno, error) {
      // Ignorar erros de extensões do Chrome
      if (source && source.includes('chrome-extension://')) {
        return true; // Suprime o erro
      }
      
      // Ignorar erros específicos do PostHog com extensões
      if (error && error.message && error.message.includes('Failed to fetch')) {
        const stack = error.stack || '';
        if (stack.includes('chrome-extension://') || stack.includes('frame_ant.js')) {
          return true; // Suprime o erro
        }
      }
      
      if (error) {
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
      return false;
    };
    
    window.addEventListener('unhandledrejection', function(event) {
      // Ignorar erros de fetch causados por extensões
      const reason = event.reason;
      if (reason && reason.message && reason.message.includes('Failed to fetch')) {
        const stack = reason.stack || '';
        if (stack.includes('chrome-extension://') || stack.includes('frame_ant.js')) {
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