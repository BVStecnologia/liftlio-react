import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import styled, { keyframes } from 'styled-components'
// Ícones personalizados
const SpinnerIcon = () => (
  <span className="icon-spinner">⟳</span>
);
const ErrorIcon = () => (
  <span className="icon-error">⚠️</span>
);
const SuccessIcon = () => (
  <span className="icon-success">✓</span>
);
const EmailIcon = () => (
  <span className="icon-email" style={{ marginRight: '10px' }}>✉️</span>
);

// Energy line animation for accents
const energyLineAnimation = keyframes`
  0% {
    opacity: 0.3;
    transform: scaleX(0.95);
    box-shadow: 0 0 5px #00a9db, 0 0 10px #00a9db;
  }
  50% {
    opacity: 0.8;
    transform: scaleX(1);
    box-shadow: 0 0 15px #2d3e50, 0 0 30px #2d3e50;
  }
  100% {
    opacity: 0.3;
    transform: scaleX(0.95);
    box-shadow: 0 0 5px #00a9db, 0 0 10px #00a9db;
  }
`;

const floatingAnimation = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
`;

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem;
  max-width: 450px;
  width: 100%;
  margin: 0 auto;
  box-shadow: ${props => props.theme.shadows.lg};
  border-radius: ${props => props.theme.radius.md};
  background-color: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : props.theme.colors.white};
  color: ${props => props.theme.colors.text.primary};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 6px;
    background: ${props => props.theme.colors.gradient.primary};
  }

  @media (max-width: 768px) {
    padding: 2rem;
    max-width: 90%;
  }
`

const LogoContainer = styled.div`
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`

const Logo = styled.div`
  font-size: 2.5rem;
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.name === 'dark' ? '#00a9db' : '#2d3e50'};
  margin-bottom: 0.5rem;
  letter-spacing: -0.5px;
  position: relative;
  z-index: 2;
  text-shadow: ${props => props.theme.name === 'dark' 
    ? '0 0 20px rgba(0, 169, 219, 0.5), 0 0 40px rgba(0, 169, 219, 0.3)' 
    : '0 1px 3px rgba(0, 169, 219, 0.2)'};
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, #00a9db 0%, #0080ff 100%)' 
    : 'none'};
  -webkit-background-clip: ${props => props.theme.name === 'dark' ? 'text' : 'initial'};
  -webkit-text-fill-color: ${props => props.theme.name === 'dark' ? 'transparent' : 'initial'};
  background-clip: ${props => props.theme.name === 'dark' ? 'text' : 'initial'};
`

const Tagline = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : props.theme.colors.darkGrey};
  text-align: center;
  margin-top: 0;
  margin-bottom: 0.5rem;
`

const PowerPhrase = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.name === 'dark' ? props.theme.colors.text.secondary : '#2d3e50'};
  text-align: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  margin-bottom: 1.5rem;
  animation: ${floatingAnimation} 3s ease-in-out infinite;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    width: 50%;
    height: 3px;
    bottom: -8px;
    left: 25%;
    background: linear-gradient(90deg, transparent, #00a9db, transparent);
  }
`

const Title = styled.h2`
  margin-bottom: 1.5rem;
  font-size: ${props => props.theme.fontSizes['2xl']};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  text-align: center;
`

const EnergyLine = styled.div`
  position: absolute;
  height: 3px;
  width: 60px;
  background: #00a9db;
  top: 20px;
  right: -30px;
  opacity: 0.8;
  animation: ${energyLineAnimation} 3s infinite;
  z-index: 1;
  border-radius: 2px;
  
  &::before, &::after {
    content: '';
    position: absolute;
    height: 6px;
    width: 6px;
    background: #00a9db;
    border-radius: 50%;
    top: -1.5px;
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
  }
`

const FormContainer = styled.div`
  width: 100%;
  margin-bottom: 1.5rem;
`

const InputGroup = styled.div`
  margin-bottom: 1rem;
  width: 100%;
`

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.medium};
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.sm};
  font-size: ${props => props.theme.fontSizes.md};
  transition: all ${props => props.theme.transitions.default};
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : props.theme.colors.white};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: #00a9db;
    box-shadow: 0 0 0 3px rgba(0, 169, 219, 0.2);
  }
`

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background: linear-gradient(90deg, #00a9db, #2d3e50);
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  width: 100%;
  margin-top: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 169, 219, 0.3);
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: none;
  }
  
  /* Light beam animation */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: all 0.8s ease;
    z-index: 1;
  }
  
  &:hover::after {
    left: 100%;
  }
`

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.white};
  color: ${props => props.theme.colors.text.primary};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  width: 100%;
  box-shadow: ${props => props.theme.shadows.sm};
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
    border-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : props.theme.colors.grey};
    background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#f8f9fa'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: none;
  }
  
  /* Light beam animation on hover */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.5),
      transparent
    );
    transition: all 0.5s ease;
    z-index: 1;
  }
  
  &:hover::after {
    left: 100%;
  }
`

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  width: 100%;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : props.theme.colors.lightGrey};
  }
  
  span {
    padding: 0 1rem;
    color: ${props => props.theme.colors.darkGrey};
    font-size: ${props => props.theme.fontSizes.sm};
  }
`

const ButtonContent = styled.span`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
`

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  
  .icon-spinner {
    animation: ${spin} 1.5s linear infinite;
    display: inline-block;
    font-size: 1.2rem;
  }
`


// Criar componentes de mensagem diretamente sem estender
const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  margin-top: 1.5rem;
  font-size: ${props => props.theme.fontSizes.sm};
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(239, 68, 68, 0.1)' : props.theme.colors.errorLight};
  padding: 0.8rem 1rem;
  border-radius: ${props => props.theme.radius.sm};
  width: 100%;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  
  span {
    margin-right: 0.5rem;
  }
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.colors.success};
  margin-top: 1.5rem;
  font-size: ${props => props.theme.fontSizes.sm};
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(52, 211, 153, 0.1)' : props.theme.colors.successLight};
  padding: 0.8rem 1rem;
  border-radius: ${props => props.theme.radius.sm};
  width: 100%;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  
  span {
    margin-right: 0.5rem;
  }
`;

const ToggleText = styled.span`
  margin-top: 1rem;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  text-align: center;
  cursor: pointer;
  
  span {
    color: ${props => props.theme.colors.secondary};
    text-decoration: underline;
    font-weight: ${props => props.theme.fontWeights.medium};
    
    &:hover {
      color: ${props => props.theme.colors.primary};
    }
  }
`

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '12px' }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const BackButton = styled(Button)`
  margin-top: 1rem;
  background: transparent;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6c757d'};
  box-shadow: none;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e9ecef'};
  
  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#dee2e6'};
  }
`;

const Footer = styled.div`
  margin-top: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.xs};
`

const Login: React.FC = () => {
  const { signIn, signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      await signIn('google')
    } catch (err) {
      setError((err as Error).message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      await signIn('email', { email, password })
    } catch (err) {
      setError((err as Error).message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      await signUp(email, password)
      setSuccess('Registration successful! Please check your email to confirm your account.')
      setIsSignUp(false)
    } catch (err) {
      setError((err as Error).message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginContainer>
      <LogoContainer>
        <EnergyLine />
        <Logo>Liftlio</Logo>
        <Tagline>Monitor your digital presence</Tagline>
      </LogoContainer>
      
      <PowerPhrase>Find your leads wherever they are</PowerPhrase>
      
      <Title>Welcome Back</Title>
      
      {isEmailLogin ? (
        <FormContainer>
          {isSignUp ? (
            <form onSubmit={handleSignUp}>
              <InputGroup>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword"
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </InputGroup>
              
              <Button 
                type="submit"
                disabled={loading}
              >
                <ButtonContent>
                  {loading ? (
                    <LoadingIndicator>
                      <SpinnerIcon />
                    </LoadingIndicator>
                  ) : 'Create Account'}
                </ButtonContent>
              </Button>
              
              <ToggleText onClick={() => {
                setIsSignUp(false)
                setError(null)
                setSuccess(null)
              }}>
                Already have an account? <span>Sign in</span>
              </ToggleText>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin}>
              <InputGroup>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </InputGroup>
              
              <Button 
                type="submit"
                disabled={loading}
              >
                <ButtonContent>
                  {loading ? (
                    <LoadingIndicator>
                      <SpinnerIcon />
                    </LoadingIndicator>
                  ) : 'Sign In'}
                </ButtonContent>
              </Button>
              
              <ToggleText onClick={() => {
                setIsSignUp(true)
                setError(null)
                setSuccess(null)
              }}>
                Don't have an account? <span>Sign up</span>
              </ToggleText>
            </form>
          )}
          
          <OrDivider>
            <span>OR</span>
          </OrDivider>
          
          <GoogleButton 
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
          >
            <ButtonContent>
              <GoogleIcon />
              Continue with Google
            </ButtonContent>
          </GoogleButton>
          
          <BackButton 
            onClick={() => {
              setIsEmailLogin(false)
              setError(null)
              setSuccess(null)
            }}
            type="button"
          >
            Back to Login Options
          </BackButton>
        </FormContainer>
      ) : (
        <>
          <GoogleButton 
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
          >
            <ButtonContent>
              {loading ? (
                <LoadingIndicator>
                  <SpinnerIcon />
                </LoadingIndicator>
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </ButtonContent>
          </GoogleButton>
          
          <OrDivider>
            <span>OR</span>
          </OrDivider>
          
          <Button 
            onClick={() => setIsEmailLogin(true)}
            type="button"
          >
            <ButtonContent>
              <EmailIcon />
              Sign in with Email
            </ButtonContent>
          </Button>
        </>
      )}
      
      {error && (
        <ErrorMessage>
          <ErrorIcon />
          {error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          <SuccessIcon />
          {success}
        </SuccessMessage>
      )}
      
      <Footer>
        By logging in, you agree to our Terms of Service and Privacy Policy
      </Footer>
    </LoginContainer>
  )
}

export default Login