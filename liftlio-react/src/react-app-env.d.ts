/// <reference types="react-scripts" />

declare module '@supabase/supabase-js' {
  export interface User {
    id: string;
    app_metadata: any;
    user_metadata: any;
    aud: string;
    email?: string;
  }

  export interface Session {
    provider_token?: string;
    access_token: string;
    expires_in?: number;
    expires_at?: number;
    refresh_token?: string;
    token_type: string;
    user: User;
  }

  export type AuthChangeEvent =
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'PASSWORD_RECOVERY';

  export interface SupabaseClient {
    auth: {
      onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => { 
        data: { subscription: { unsubscribe: () => void } }
      };
      getSession: () => Promise<{ data: { session: Session | null } }>;
      signInWithOAuth: (options: { provider: string; options?: any }) => Promise<{ error: Error | null }>;
      signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: Error | null }>;
      signUp: (credentials: { email: string; password: string }) => Promise<{ error: Error | null }>;
      signOut: () => Promise<{ error: Error | null }>;
    };
  }

  export function createClient(url: string, key: string): SupabaseClient;
}
