/**
 * Localhost Authentication Helper
 *
 * This utility provides fallback authentication methods for localhost development
 * when OAuth clock skew issues prevent normal authentication flow.
 *
 * IMPORTANT: This is for development only and should NEVER be used in production.
 */

import { supabase } from './supabaseClient';

interface LocalAuthOptions {
  email: string;
  password?: string;
  skipOAuth?: boolean;
}

/**
 * Alternative authentication method for localhost development
 * Uses magic link or password authentication as a fallback when OAuth fails
 */
export async function authenticateLocalhost(options: LocalAuthOptions) {
  const { email, password, skipOAuth = false } = options;

  // Only use on localhost
  if (!isLocalhost()) {
    throw new Error('This authentication method is only available on localhost');
  }

  console.log('[LocalAuth] Starting localhost authentication fallback');

  try {
    // Clear any existing sessions first
    clearAuthStorage();

    // Option 1: Try password authentication if provided
    if (password) {
      console.log('[LocalAuth] Attempting password authentication');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error && data.session) {
        console.log('[LocalAuth] Password authentication successful');
        return { success: true, session: data.session, method: 'password' };
      }

      if (error) {
        console.error('[LocalAuth] Password authentication failed:', error);
      }
    }

    // Option 2: Use magic link as fallback
    console.log('[LocalAuth] Sending magic link to email');
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback'
      }
    });

    if (!magicLinkError) {
      console.log('[LocalAuth] Magic link sent successfully');
      return {
        success: true,
        method: 'magic_link',
        message: 'Check your email for the login link'
      };
    }

    console.error('[LocalAuth] Magic link failed:', magicLinkError);
    return {
      success: false,
      error: magicLinkError?.message || 'Authentication failed'
    };

  } catch (error) {
    console.error('[LocalAuth] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if current environment is localhost
 */
export function isLocalhost(): boolean {
  return typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1');
}

/**
 * Clear all auth-related storage to prevent stale token issues
 */
export function clearAuthStorage(): void {
  if (!isLocalhost()) return;

  const authKeys = [
    'supabase.auth.token',
    'supabase.auth.token.local',
    'sb-auth-token',
    'sb-suqjifkhmekcdflwowiw-auth-token',
    'sb-cdnzajygbcujwcaoswpi-auth-token'
  ];

  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
  });

  console.log('[LocalAuth] Cleared all auth storage');
}

/**
 * Bypass OAuth and use direct Supabase authentication for localhost
 * This completely skips Google OAuth and uses Supabase's built-in auth
 */
export async function bypassOAuthForLocalhost(email: string): Promise<any> {
  if (!isLocalhost()) {
    throw new Error('OAuth bypass is only available on localhost');
  }

  console.log('[LocalAuth] Bypassing OAuth, using direct Supabase auth');

  // Clear any existing sessions
  clearAuthStorage();
  await supabase.auth.signOut();

  // Create a development session using anonymous sign in
  // This is useful for testing without real authentication
  if (process.env.NODE_ENV === 'development') {
    try {
      // Try to sign in anonymously for development
      const { data, error } = await supabase.auth.signInAnonymously();

      if (!error && data.session) {
        console.log('[LocalAuth] Anonymous session created for development');

        // Store a flag to identify this as a dev session
        localStorage.setItem('dev_session_bypass', 'true');
        localStorage.setItem('dev_session_email', email);

        return {
          success: true,
          session: data.session,
          method: 'anonymous_dev',
          warning: 'Using anonymous session for development. Some features may be limited.'
        };
      }
    } catch (anonError) {
      console.error('[LocalAuth] Anonymous sign in not enabled or failed:', anonError);
    }
  }

  // Fallback to magic link
  return authenticateLocalhost({ email });
}

/**
 * Get stored development session info
 */
export function getDevSessionInfo(): { isDevSession: boolean; email?: string } {
  if (!isLocalhost()) {
    return { isDevSession: false };
  }

  const isDevSession = localStorage.getItem('dev_session_bypass') === 'true';
  const email = localStorage.getItem('dev_session_email');

  return { isDevSession, email: email || undefined };
}

/**
 * Manual token refresh for localhost
 * Forces a token refresh to resolve clock skew issues
 */
export async function forceTokenRefresh(): Promise<boolean> {
  if (!isLocalhost()) return false;

  try {
    console.log('[LocalAuth] Forcing token refresh');
    const { data, error } = await supabase.auth.refreshSession();

    if (!error && data.session) {
      console.log('[LocalAuth] Token refreshed successfully');
      return true;
    }

    console.error('[LocalAuth] Token refresh failed:', error);
    return false;
  } catch (error) {
    console.error('[LocalAuth] Unexpected error during refresh:', error);
    return false;
  }
}