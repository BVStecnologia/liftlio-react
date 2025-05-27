import React, { useEffect } from 'react'
import Login from '../components/Login'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

// Componente de ícone personalizado
const SpinnerIcon = () => <span className="icon-spinner">⟳</span>;

// Wave animation for the background
const waveAnimation = keyframes`
  0% {
    transform: translateX(-100%) scaleY(1);
  }
  50% {
    transform: translateX(-50%) scaleY(0.9);
  }
  100% {
    transform: translateX(0%) scaleY(1);
  }
`;

// Light beam animation across the screen
const lightBeamAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-100%) skewX(-15deg);
  }
  20% {
    opacity: 0.9;
  }
  40% {
    opacity: 0.7;
  }
  60% {
    opacity: 0.9;
  }
  80% {
    opacity: 0.5;
  }
  100% {
    opacity: 0;
    transform: translateX(100%) skewX(-15deg);
  }
`;

// Energy pulse animation for power nodes
const energyPulse = keyframes`
  0% {
    opacity: 0.6;
    box-shadow: 0 0 10px #00a9db,
                0 0 20px #2d3e50;
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 20px #00a9db,
                0 0 40px #2d3e50,
                0 0 60px #00a9db;
  }
  100% {
    opacity: 0.6;
    box-shadow: 0 0 10px #00a9db,
                0 0 20px #2d3e50;
  }
`;

const LoginPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: ${props => props.theme.colors.bg.primary};
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`

// Wave background elements
const WaveElement = styled.div`
  position: absolute;
  width: 200%;
  height: 200px;
  background: linear-gradient(90deg, 
    rgba(45, 29, 66, 0.05) 0%, 
    rgba(103, 58, 183, 0.03) 50%,
    rgba(45, 29, 66, 0.05) 100%
  );
  opacity: 0.2;
  border-radius: 50%;
  z-index: 0;
  animation: ${waveAnimation} 15s ease-in-out infinite alternate;
  
  &:nth-child(1) {
    top: 15%;
    height: 150px;
    animation-duration: 18s;
  }
  
  &:nth-child(2) {
    top: 45%;
    height: 180px;
    animation-duration: 22s;
    animation-delay: 2s;
  }
  
  &:nth-child(3) {
    top: 75%;
    height: 130px;
    animation-duration: 20s;
    animation-delay: 1s;
  }
`

// Light beams that shoot across the screen
const LightBeam = styled.div`
  position: absolute;
  height: 8px;
  width: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #00a9db 20%, 
    #2d3e50 50%,
    #00a9db 80%, 
    transparent 100%
  );
  opacity: 0;
  box-shadow: 0 0 15px #00a9db, 
              0 0 30px #2d3e50;
  z-index: 1;
  animation: ${lightBeamAnimation} 10s ease-in-out infinite;
  
  &:nth-child(4) {
    top: 25%;
    animation-duration: 6s;
    animation-delay: 1s;
    height: 3px;
  }
  
  &:nth-child(5) {
    top: 55%;
    animation-duration: 8s;
    animation-delay: 4s;
    height: 2px;
  }
  
  &:nth-child(6) {
    top: 78%;
    animation-duration: 7s;
    animation-delay: 2s;
    height: 4px;
  }
`

// Energy nodes that pulse with light
const EnergyNode = styled.div`
  position: absolute;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #2d3e50;
  animation: ${energyPulse} 4s ease-in-out infinite;
  z-index: 2;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 2px;
    background: #00a9db;
    opacity: 0.9;
    top: 50%;
    transform: translateY(-50%);
  }
  
  &::before {
    left: -100%;
    width: 30px;
  }
  
  &::after {
    right: -100%;
    width: 50px;
  }
  
  &:nth-child(7) {
    top: 18%;
    left: 15%;
    animation-delay: 0.5s;
    width: 8px;
    height: 8px;
  }
  
  &:nth-child(8) {
    top: 35%;
    right: 20%;
    animation-delay: 1.5s;
    width: 12px;
    height: 12px;
  }
  
  &:nth-child(9) {
    top: 65%;
    left: 25%;
    animation-delay: 1s;
    width: 10px;
    height: 10px;
  }
  
  &:nth-child(10) {
    top: 80%;
    right: 30%;
    animation-delay: 2s;
    width: 6px;
    height: 6px;
  }
`

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
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
  background-color: white;
`

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  color: #2d3e50;
  font-size: 2.5rem;
  
  .icon-spinner {
    animation: ${spin} 1.5s linear infinite;
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
    // O redirecionamento correto (dashboard ou create-project) será determinado no ProtectedLayout
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
      {/* Wave background elements */}
      <WaveElement />
      <WaveElement />
      <WaveElement />
      
      {/* Light beams animation */}
      <LightBeam />
      <LightBeam />
      <LightBeam />
      
      {/* Energy nodes with connecting lines */}
      <EnergyNode />
      <EnergyNode />
      <EnergyNode />
      <EnergyNode />
      
      <ContentWrapper>
        <Login />
      </ContentWrapper>
    </LoginPageContainer>
  )
}

export default LoginPage