import React, { useEffect } from 'react'
import Login from '../components/Login'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import TechBackground from '../components/TechBackground'
// Componente de ícone personalizado
const SpinnerIcon = () => <span className="icon-spinner">⟳</span>;

const LoginPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: ${props => props.theme.colors.background};
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const ContentWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`

const LoadingSpinner = styled.div`
  color: ${props => props.theme.colors.primary};
  font-size: 2.5rem;
  
  .icon-spinner {
    display: inline-block;
  }
`

const LoadingText = styled.p`
  color: ${props => props.theme.colors.darkGrey};
  margin-top: 1rem;
  font-size: ${props => props.theme.fontSizes.lg};
`

const LoginPage: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Se o usuário já estiver autenticado, redireciona para o dashboard
    if (user && !loading) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  // Se estiver carregando, mostra uma mensagem de carregamento com spinner
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner>
          <SpinnerIcon />
        </LoadingSpinner>
        <LoadingText>Carregando...</LoadingText>
      </LoadingContainer>
    )
  }

  return (
    <LoginPageContainer>
      <TechBackground />
      <ContentWrapper>
        <Login />
      </ContentWrapper>
    </LoginPageContainer>
  )
}

export default LoginPage