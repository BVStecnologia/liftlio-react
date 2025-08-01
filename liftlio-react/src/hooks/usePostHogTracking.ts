import { usePostHog } from 'posthog-js/react';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export function usePostHogTracking() {
  const posthog = usePostHog();
  const { user } = useAuth();

  // Identify user when they log in
  useEffect(() => {
    if (user && posthog) {
      posthog.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    }
  }, [user, posthog]);

  // Track page views (PostHog does this automatically, but this is for custom logic)
  const trackPageView = (pageName: string, properties?: Record<string, any>) => {
    posthog?.capture('$pageview', {
      page_name: pageName,
      ...properties,
    });
  };

  // Track custom events
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    posthog?.capture(eventName, properties);
  };

  // Track errors
  const trackError = (error: Error, context?: Record<string, any>) => {
    posthog?.captureException(error, {
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  // Reset user (on logout)
  const resetUser = () => {
    posthog?.reset();
  };

  return {
    trackPageView,
    trackEvent,
    trackError,
    resetUser,
    posthog,
  };
}