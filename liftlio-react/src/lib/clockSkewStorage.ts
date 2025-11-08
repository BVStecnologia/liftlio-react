/**
 * Custom storage adapter for Supabase that handles clock skew issues in development
 *
 * This adapter adds a small time buffer to JWT validation to prevent
 * "issued in the future" errors caused by minor clock differences between
 * the client and Supabase's auth servers.
 *
 * Only applies in development - production should use standard storage.
 */

const CLOCK_SKEW_BUFFER_SECONDS = 10; // 10 second tolerance for clock drift

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class ClockSkewTolerantStorage implements StorageAdapter {
  private isLocalhost: boolean;

  constructor() {
    // Only apply skew tolerance on localhost
    this.isLocalhost = typeof window !== 'undefined' &&
                       (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1');
  }

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const item = localStorage.getItem(key);
    if (!item || !this.isLocalhost) return item;

    try {
      const session = JSON.parse(item);

      // Only modify auth session data
      if (session && session.access_token && session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at;

        // If token appears to be issued in the future (clock skew)
        // add buffer to prevent immediate expiration
        if (expiresAt < now - 60) { // Token expired over 1 minute ago
          console.warn('[ClockSkewStorage] Detected expired token, may have clock skew');
        }

        // Decode JWT to check iat (issued at) claim
        try {
          const [, payload] = session.access_token.split('.');
          const decoded = JSON.parse(atob(payload));
          const issuedAt = decoded.iat;
          const currentTime = Math.floor(Date.now() / 1000);

          // Check if token was "issued in the future" (clock is behind server)
          if (issuedAt > currentTime) {
            const skewSeconds = issuedAt - currentTime;
            console.warn(`[ClockSkewStorage] Clock skew detected: ${skewSeconds}s behind server`);
            console.warn('[ClockSkewStorage] Please sync your system clock: w32tm /resync');

            // Add buffer to expires_at to compensate for clock skew
            session.expires_at = expiresAt + CLOCK_SKEW_BUFFER_SECONDS;

            return JSON.stringify(session);
          }
        } catch (decodeError) {
          console.error('[ClockSkewStorage] Failed to decode JWT:', decodeError);
        }
      }

      return item;
    } catch (parseError) {
      // If not JSON, return as-is
      return item;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}

// Export singleton instance
export const clockSkewStorage = new ClockSkewTolerantStorage();

/**
 * Alternative: Disable session persistence in development
 * This forces re-authentication on each page load but avoids clock skew issues
 */
export const getStorageConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' &&
                      (window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1');

  if (isDevelopment && isLocalhost) {
    console.log('[Storage Config] Using clock skew tolerant storage for localhost');
    return {
      persistSession: true,
      storage: clockSkewStorage
    };
  }

  // Production: use default localStorage
  return {
    persistSession: true
  };
};
