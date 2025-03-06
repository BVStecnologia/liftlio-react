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
      getUser: () => Promise<{ data: { user: User | null }; error: Error | null }>;
    };
    from: (table: string) => {
      select: (columns?: string) => any;
      insert: (values: any) => any;
      update: (values: any) => any;
      delete: () => any;
      eq: (column: string, value: any) => any;
      neq: (column: string, value: any) => any;
      gt: (column: string, value: any) => any;
      lt: (column: string, value: any) => any;
      gte: (column: string, value: any) => any;
      lte: (column: string, value: any) => any;
      is: (column: string, value: any) => any;
      in: (column: string, values: any[]) => any;
      contains: (column: string, value: any) => any;
      containedBy: (column: string, value: any) => any;
      rangeLt: (column: string, range: any) => any;
      rangeGt: (column: string, range: any) => any;
      rangeGte: (column: string, range: any) => any;
      rangeLte: (column: string, range: any) => any;
      overlap: (column: string, value: any) => any;
      textSearch: (column: string, query: string, options?: any) => any;
      filter: (column: string, operator: string, value: any) => any;
      match: (query: any) => any;
      single: () => any;
      order: (column: string, options?: any) => any;
      limit: (count: number) => any;
      range: (from: number, to: number) => any;
      maybeSingle: () => any;
    };
    channel: (topic: string) => {
      on: (type: string, config: any, callback: (payload: any) => void) => any;
      subscribe: () => any;
    };
  }

  export function createClient(url: string, key: string): SupabaseClient;
}
