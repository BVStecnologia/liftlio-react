/**
 * Utility functions for environment detection
 */

/**
 * Check if the application is running in production
 * @returns true if running on liftlio.com or liftlio.fly.dev
 */
export const isProduction = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'liftlio.com' || hostname === 'liftlio.fly.dev';
};

/**
 * Check if the application is running in development
 * @returns true if running on localhost or 127.0.0.1
 */
export const isDevelopment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

/**
 * Get the appropriate OAuth redirect URI based on environment
 * @returns The redirect URI for OAuth flows
 */
export const getOAuthRedirectUri = (): string => {
  const hostname = window.location.hostname;

  // Production environments
  if (hostname === 'liftlio.com' || hostname === 'liftlio.fly.dev') {
    return `https://${hostname}`;
  }

  // Development - use dynamic port
  const port = window.location.port || '3000';
  return `http://localhost:${port}`;
};

/**
 * Get the current environment name
 * @returns 'production' | 'development'
 */
export const getEnvironment = (): 'production' | 'development' => {
  return isProduction() ? 'production' : 'development';
};

/**
 * Log environment details for debugging
 */
export const logEnvironment = (context: string = ''): void => {
  const hostname = window.location.hostname;
  const env = getEnvironment();
  const redirectUri = getOAuthRedirectUri();

  console.log('----------------------');
  if (context) {
    console.log(`[${context}] Environment Details:`);
  } else {
    console.log('Environment Details:');
  }
  console.log('Hostname:', hostname);
  console.log('Environment:', env);
  console.log('OAuth Redirect URI:', redirectUri);
  console.log('----------------------');
};