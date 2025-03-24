import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type ProtectedRouteProps = {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  // Se estiver carregando, poderia mostrar um spinner ou tela de carregamento
  if (loading) {
    return <div>Carregando...</div>
  }

  // Se não estiver autenticado, redireciona para a página de login (rota raiz)
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Se estiver autenticado, renderiza os filhos (o conteúdo da rota protegida)
  return <>{children}</>
}

export default ProtectedRoute