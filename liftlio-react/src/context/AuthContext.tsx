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
        console.log('Auth state changed:', _event, 'Session:', session ? 'Active' : 'None');
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Carrega a sessão atual na inicialização
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const { session } = data
      console.log('Initial session check:', session ? 'Found' : 'Not found', 'Environment:', window.location.hostname);
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