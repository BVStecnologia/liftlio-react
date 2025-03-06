import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (
    provider: 'google' | 'email', 
    credentials?: { email: string; password: string }
  ) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Configura o listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Carrega a sessão atual na inicialização
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const { session } = data
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (provider: 'google' | 'email', credentials?: { email: string; password: string }) => {
    try {
      if (provider === 'google') {
        // Para login com Google, precisamos garantir que o redirecionamento volte para a página inicial
        // Determine the correct redirect URL based on environment
        let redirectUrl = `${window.location.origin}/auth/callback`;
        
        // If we're in production at liftlio.fly.dev
        if (window.location.hostname === 'liftlio.fly.dev') {
          // Using only the origin without the path to handle Google's redirect peculiarities
          redirectUrl = 'https://liftlio.fly.dev';
          
          // Add explicit site URL to localStorage for cross-domain validation
          localStorage.setItem('siteUrl', 'https://liftlio.fly.dev');
        } else {
          // Store the development URL
          localStorage.setItem('siteUrl', window.location.origin);
        }
        
        console.log('Using redirect URL:', redirectUrl);
        
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
        const { error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
        if (error) throw error
      }
    } catch (error) {
      console.error('Error during login:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
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

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
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