/**
 * Localhost Authentication Fallback Component
 *
 * This component provides alternative authentication methods for localhost development
 * when OAuth fails due to clock skew or other issues.
 *
 * ONLY shown on localhost when OAuth authentication fails.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { authenticateLocalhost, bypassOAuthForLocalhost, isLocalhost } from '../lib/localhostAuthHelper';

const Container = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid #8b5cf6;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
  z-index: 10000;
  color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
`;

const Title = styled.h3`
  margin: 0 0 0 10px;
  color: #8b5cf6;
  font-size: 16px;
`;

const Warning = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #ffc107;
  display: flex;
  align-items: flex-start;

  svg {
    margin-right: 8px;
    margin-top: 2px;
    flex-shrink: 0;
  }
`;

const Info = styled.div`
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid #2196f3;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #2196f3;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: #666;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  background: ${props =>
    props.variant === 'danger' ? '#dc3545' :
    props.variant === 'secondary' ? '#333' :
    '#8b5cf6'
  };
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    margin-right: 8px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #fff;
  }
`;

const Success = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid #4caf50;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #4caf50;
`;

interface LocalhostAuthFallbackProps {
  onClose?: () => void;
  visible?: boolean;
}

const LocalhostAuthFallback: React.FC<LocalhostAuthFallbackProps> = ({
  onClose,
  visible = true
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Only render on localhost
  if (!isLocalhost() || !visible) {
    return null;
  }

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await authenticateLocalhost({ email });

    if (result.success) {
      if (result.method === 'magic_link') {
        setMessage({
          type: 'success',
          text: 'Magic link sent! Check your email inbox.'
        });
      } else {
        window.location.reload();
      }
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Failed to send magic link'
      });
    }

    setLoading(false);
  };

  const handlePasswordAuth = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please enter both email and password' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await authenticateLocalhost({ email, password });

    if (result.success && result.method === 'password') {
      window.location.reload();
    } else if (result.success && result.method === 'magic_link') {
      setMessage({
        type: 'success',
        text: 'Password auth failed. Magic link sent instead.'
      });
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Authentication failed'
      });
    }

    setLoading(false);
  };

  const handleBypassOAuth = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await bypassOAuthForLocalhost(email);

    if (result.success) {
      if (result.method === 'anonymous_dev') {
        setMessage({
          type: 'info',
          text: result.warning || 'Dev session created. Refreshing...'
        });
        setTimeout(() => window.location.reload(), 1500);
      } else if (result.method === 'magic_link') {
        setMessage({
          type: 'success',
          text: 'Magic link sent as fallback!'
        });
      }
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Bypass failed'
      });
    }

    setLoading(false);
  };

  return (
    <Container>
      {onClose && (
        <CloseButton onClick={onClose}>×</CloseButton>
      )}

      <Header>
        <span style={{ fontSize: '20px' }}>🕐</span>
        <Title>Localhost Auth Fallback</Title>
      </Header>

      <Warning>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <div>
          <strong>OAuth Clock Skew Detected</strong><br />
          Use these alternative methods for localhost development
        </div>
      </Warning>

      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      {showPassword && (
        <Input
          type="password"
          placeholder="Enter your password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      )}

      <Button
        onClick={handleMagicLink}
        disabled={loading || !email}
      >
        <span style={{ fontSize: '16px' }}>✉️</span>
        Send Magic Link
      </Button>

      <Button
        variant="secondary"
        onClick={() => setShowPassword(!showPassword)}
        disabled={loading}
      >
        <span style={{ fontSize: '16px' }}>🔑</span>
        {showPassword ? 'Hide' : 'Use'} Password Auth
      </Button>

      {showPassword && (
        <Button
          onClick={handlePasswordAuth}
          disabled={loading || !email || !password}
        >
          Sign In with Password
        </Button>
      )}

      <Button
        variant="danger"
        onClick={handleBypassOAuth}
        disabled={loading || !email}
      >
        Bypass OAuth (Dev Only)
      </Button>

      {message && (
        message.type === 'success' ? (
          <Success>{message.text}</Success>
        ) : message.type === 'info' ? (
          <Info>{message.text}</Info>
        ) : (
          <Warning>{message.text}</Warning>
        )
      )}

      <Info>
        <strong>Note:</strong> This helper is only visible on localhost.
        Normal OAuth flow will be used in production.
      </Info>
    </Container>
  );
};

export default LocalhostAuthFallback;