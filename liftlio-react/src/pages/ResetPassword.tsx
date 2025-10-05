import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { supabase } from '../lib/supabaseClient'

// Ícones personalizados
const SpinnerIcon = () => <span className="icon-spinner">⟳</span>
const ErrorIcon = () => <span className="icon-error">⚠️</span>
const SuccessIcon = () => <span className="icon-success">✓</span>
const EmailIcon = () => <span className="icon-email">✉️</span>
const LockIcon = () => <span className="icon-lock">🔒</span>

// Animação de spin
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: ${props => props.theme.colors.bg.primary};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const Container = styled.div`
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
  z-index: 10;

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

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

const Icon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`

const Title = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
`

const Subtitle = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`

const Form = styled.form`
  width: 100%;
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
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  width: 100%;
  margin-top: 1.5rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: none;
  }

  .icon-spinner {
    display: inline-block;
    margin-right: 8px;
    animation: ${spin} 1s linear infinite;
  }
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};

  &:hover {
    color: #6366f1;
  }
`

const Message = styled.div<{ type: 'success' | 'error' }>`
  padding: 1rem;
  border-radius: ${props => props.theme.radius.sm};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: ${props => props.type === 'success'
    ? 'rgba(34, 197, 94, 0.1)'
    : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.type === 'success'
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)'};
  color: ${props => props.type === 'success' ? '#22c55e' : '#ef4444'};
  font-size: ${props => props.theme.fontSizes.sm};

  .icon-success,
  .icon-error {
    font-size: 1.25rem;
  }
`

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('request_password_reset', {
        p_email: email
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox.'
      })
      setEmail('')
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send reset link. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('validate_and_reset_password', {
        p_token: token,
        p_new_password: password
      })

      if (error) throw error

      if (data?.success) {
        setMessage({
          type: 'success',
          text: 'Password reset successfully! Redirecting to login...'
        })
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setMessage({
          type: 'error',
          text: data?.error || 'Failed to reset password'
        })
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to reset password. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <Container>
        <Header>
          <Icon>{token ? <LockIcon /> : <EmailIcon />}</Icon>
          <Title>Reset Password</Title>
          <Subtitle>
            {token
              ? 'Enter your new password below'
              : "Enter your email address and we'll send you a reset link"}
          </Subtitle>
        </Header>

        {message && (
          <Message type={message.type}>
            {message.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
            <span>{message.text}</span>
          </Message>
        )}

        {!token ? (
          <Form onSubmit={handleRequestReset}>
            <InputGroup>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </InputGroup>

            <Button type="submit" disabled={loading}>
              {loading && <SpinnerIcon />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleConfirmReset}>
            <InputGroup>
              <Label>New Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={loading}
              />
            </InputGroup>

            <InputGroup>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
            </InputGroup>

            <Button type="submit" disabled={loading}>
              {loading && <SpinnerIcon />}
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Form>
        )}

        <BackButton onClick={() => navigate('/login')}>
          ← Back to Login
        </BackButton>
      </Container>
    </PageContainer>
  )
}

export default ResetPassword
