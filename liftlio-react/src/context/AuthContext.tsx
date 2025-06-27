import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, callRPC } from '../lib/supabaseClient'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { handleNetworkError, isNetworkError, retryNetworkRequest } from '../utils/networkErrorHandler'

type SubscriptionInfo = {
  subscription: {
    id: number
    status: string
    plan_name: string
    cancelled_at: string | null
    is_production: boolean
    mentions_limit: number
    next_billing_date: string
    days_until_billing: number
    is_in_grace_period: boolean
  }
  mentions_available: number
  has_active_subscription: boolean
}

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  subscription: SubscriptionInfo | null
  checkingSubscription: boolean
  signIn: (
    provider: 'google' | 'email', 
    credentials?: { email: string; password: string }
  ) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkSubscription: (forceCheck?: boolean) => Promise<void>
  clearSubscriptionCache: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [checkingSubscription, setCheckingSubscription] = useState(false)
  const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState<number>(0)
  
  // Função para limpar cache da assinatura
  const clearSubscriptionCache = () => {
    console.log('Limpando cache da assinatura...');
    setLastSubscriptionCheck(0);
  }

  useEffect(() => {
    // Configura o listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', _event, 'Session:', session ? 'Active' : 'None');
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Carrega a sessão atual na inicialização
    const loadSession = async () => {
      try {
        const { data } = await retryNetworkRequest(
          () => supabase.auth.getSession(),
          3,
          1000
        );
        
        const { session } = data;
        console.log('Initial session check:', session ? 'Found' : 'Not found', 'Environment:', window.location.hostname);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        const errorMessage = handleNetworkError(error);
        console.error('Error fetching initial session:', errorMessage, error);
        
        // If it's a network error, we might still have a cached session
        if (isNetworkError(error)) {
          // Try to get cached session from localStorage
          const cachedAuth = localStorage.getItem('sb-suqjifkhmekcdflwowiw-auth-token');
          if (cachedAuth) {
            try {
              const parsed = JSON.parse(cachedAuth);
              if (parsed?.currentSession || parsed?.access_token) {
                const cachedSession = parsed.currentSession || parsed;
                setSession(cachedSession);
                setUser(cachedSession.user);
                console.log('Using cached session due to network error');
              }
            } catch (e) {
              console.error('Failed to parse cached auth:', e);
            }
          }
        }
        
        // Always set loading to false
        setLoading(false);
      }
    };
    
    loadSession();

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (provider: 'google' | 'email', credentials?: { email: string; password: string }) => {
    try {
      if (provider === 'google') {
        // Para login com Google, precisamos garantir que o redirecionamento volte para a página inicial
        // Always use the full callback URL for consistency
        const redirectUrl = `${window.location.origin}/auth/callback`;
        
        console.log('Using redirect URL:', redirectUrl);
        console.log('Current environment:', window.location.hostname);
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        })
        
        if (error) throw error
        
        // Para o Google OAuth, como ele redireciona para outra página e volta,
        // a função continuará executando apenas se a autenticação não redirecionar
        // O que acontece em casos de erro
        console.log("OAuth sign-in initiated")
        
      } else if (provider === 'email' && credentials) {
        console.log('Attempting email login for:', credentials.email);
        const { error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
        console.log('Email login result:', error ? 'Failed' : 'Success', error?.message || '');
        if (error) throw error
      }
    } catch (error) {
      console.error('Error during login:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Limpar o projeto atual do localStorage ao fazer logout
      localStorage.removeItem('currentProjectId');
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      console.error('Error during signup:', error)
      throw error
    }
  }

  const checkSubscription = async (forceCheck = false) => {
    if (!user) {
      setSubscription(null);
      return;
    }
    
    // Cache de 30 segundos para evitar verificações excessivas
    const now = Date.now();
    const cacheTime = 30000; // 30 segundos
    
    if (!forceCheck && lastSubscriptionCheck && (now - lastSubscriptionCheck < cacheTime)) {
      console.log('Usando cache da assinatura');
      return;
    }
    
    setCheckingSubscription(true);
    try {
      const data = await callRPC('check_user_subscription', {});
      
      console.log('Resposta da RPC check_user_subscription:', data);
      
      // Verificar se é um objeto direto com as propriedades esperadas
      if (data && data.has_active_subscription !== undefined) {
        // A RPC está retornando diretamente o objeto
        setSubscription(data);
        setLastSubscriptionCheck(now);
        console.log('Assinatura verificada com sucesso:', data);
        console.log('has_active_subscription:', data.has_active_subscription);
      } 
      // Verificar formato de array (caso anterior)
      else if (data && Array.isArray(data) && data.length > 0 && data[0].check_user_subscription) {
        // A RPC retorna um array com um objeto que contém check_user_subscription
        const subscriptionData = data[0].check_user_subscription;
        setSubscription(subscriptionData);
        setLastSubscriptionCheck(now);
        console.log('Assinatura verificada com sucesso (formato array):', subscriptionData);
        console.log('has_active_subscription:', subscriptionData.has_active_subscription);
      } else {
        console.log('Nenhuma assinatura encontrada - formato de dados não reconhecido');
        setSubscription(null);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      setSubscription(null);
    } finally {
      setCheckingSubscription(false);
    }
  };
  
  // Verificar assinatura quando o usuário mudar
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription(null);
    }
  }, [user]);

  const value = {
    session,
    user,
    loading,
    subscription,
    checkingSubscription,
    signIn,
    signUp,
    signOut,
    checkSubscription,
    clearSubscriptionCache,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}