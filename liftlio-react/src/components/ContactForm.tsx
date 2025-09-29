import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import { Send } from 'lucide-react';

// Container wrapper para centralizar tudo
const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 80px;
`;

// Título
const Title = styled.h2`
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 48px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 16px;
    margin-bottom: 32px;
  }
`;

// Formulário COM PADDING e CENTRALIZADO
const Form = styled.form`
  width: 100%;
  max-width: 700px;
  margin: 0 auto;

  /* ADICIONAR VISUAL DE CONTAINER */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;

  /* MUITO PADDING INTERNO */
  padding: 60px;

  @media (max-width: 768px) {
    padding: 30px 20px;
    max-width: 100%;
  }
`;

// Linha com 2 campos
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Campo único (largura total)
const FullRow = styled.div`
  margin-bottom: 24px;
`;

// Input
const Input = styled.input`
  width: 100%;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 16px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #7c3aed;
    background: rgba(255, 255, 255, 0.08);
  }
`;

// Textarea
const Textarea = styled.textarea`
  width: 100%;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-family: inherit;
  min-height: 150px;
  resize: vertical;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #7c3aed;
    background: rgba(255, 255, 255, 0.08);
  }
`;

// Botão
const Button = styled.button`
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 32px;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Mensagem
const Alert = styled.div<{ $success?: boolean }>`
  margin-top: 24px;
  padding: 16px;
  border-radius: 8px;
  background: ${props => props.$success
    ? 'rgba(34, 197, 94, 0.1)'
    : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$success
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)'};
  color: ${props => props.$success ? '#22c55e' : '#ef4444'};
`;

// Texto pequeno de proteção reCAPTCHA
const RecaptchaNotice = styled.div`
  margin-top: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;

  a {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

// Declaração global para grecaptcha
declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  // Chave do site reCAPTCHA v3
  const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LdH-NgrAAAAACAZ0XdawCbRWk4L8vYimr1V92F0';

  useEffect(() => {
    // Carrega o script do reCAPTCHA v3
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.onload = () => {
      setRecaptchaLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll('script[src*="recaptcha"]');
      scripts.forEach(script => script.remove());
    };
  }, [SITE_KEY]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recaptchaLoaded || !window.grecaptcha) {
      setMessage({ text: 'reCAPTCHA not loaded. Please refresh the page.', success: false });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Executa o reCAPTCHA v3 (invisível)
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(SITE_KEY, { action: 'submit' }).then(async (token: string) => {
          try {
            // USA FUNÇÃO SQL/RPC DIRETAMENTE - MAIS EFICIENTE!
            const { data, error } = await supabase.rpc('verify_recaptcha_and_save_contact', {
              recaptcha_token: token,
              form_data: formData
            });

            if (error) throw error;

            if (data?.success) {
              setMessage({
                text: data.message || 'Message sent successfully! We\'ll get back to you soon.',
                success: true
              });
              setFormData({ name: '', email: '', company: '', phone: '', subject: '', message: '' });
            } else {
              // Bot detected or error
              setMessage({
                text: data?.error || 'Failed to send message. Please try again.',
                success: false
              });

              // Log the score if bot detected
              if (data?.score && data.score < 0.5) {
                console.log(`🤖 Bot detected! Score: ${data.score}`);
              }
            }
          } catch (err: any) {
            console.error('Error:', err);
            setMessage({
              text: 'Failed to send message. Please try again.',
              success: false
            });
          } finally {
            setIsSubmitting(false);
          }
        });
      });
    } catch (err) {
      console.error('reCAPTCHA error:', err);
      setMessage({ text: 'Security check failed. Please try again.', success: false });
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection>
      <Title>Send Us a Message</Title>
      <Subtitle>We'll get back to you within 24 hours</Subtitle>

      <Form onSubmit={handleSubmit}>
        <Row>
          <Input
            type="text"
            placeholder="Your Name *"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            type="email"
            placeholder="Your Email *"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </Row>

        <Row>
          <Input
            type="text"
            placeholder="Company"
            value={formData.company}
            onChange={(e) => setFormData({...formData, company: e.target.value})}
          />
          <Input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </Row>

        <FullRow>
          <Input
            type="text"
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
          />
        </FullRow>

        <FullRow>
          <Textarea
            placeholder="Your Message *"
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            required
          />
        </FullRow>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : (
            <>
              Send Message <Send size={18} />
            </>
          )}
        </Button>

        <RecaptchaNotice>
          This site is protected by reCAPTCHA and the Google{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          apply.
        </RecaptchaNotice>

        {message && (
          <Alert $success={message.success}>
            {message.text}
          </Alert>
        )}
      </Form>
    </FormSection>
  );
};

export default ContactForm;