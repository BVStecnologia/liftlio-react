import React, { useState } from 'react';
import styled from 'styled-components';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

const Container = styled.div`
  padding: 20px;
  margin: 20px;
  max-width: 800px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  background-color: ${props => props.theme.colors.bg.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 4px;
  font-size: 16px;
  background-color: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
`;

const Button = styled.button`
  padding: 10px 15px;
  background-color: ${props => props.theme.components.button.primary.bg};
  color: ${props => props.theme.components.button.primary.text};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: ${props => props.theme.components.button.primary.hover};
  }
  
  &:disabled {
    background-color: ${props => props.theme.components.button.primary.disabled};
    cursor: not-allowed;
  }
`;

const ResultContainer = styled.div`
  margin-top: 20px;
  border-top: 1px solid ${props => props.theme.colors.border.divider};
  padding-top: 15px;
`;

const ResultHeader = styled.h3`
  margin-bottom: 10px;
`;

const ResultBox = styled.pre`
  background-color: ${props => props.theme.colors.bg.tertiary};
  color: ${props => props.theme.colors.text.primary};
  padding: 15px;
  border-radius: 4px;
  overflow: auto;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 300px;
  border: 1px solid ${props => props.theme.colors.border.secondary};
`;

const Loader = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid ${props => props.theme.colors.border.secondary};
  border-radius: 50%;
  border-top-color: ${props => props.theme.colors.accent.primary};
  animation: spin 1s ease-in-out infinite;
  margin-left: 10px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const UrlDataTest = () => {
  const [url, setUrl] = useState('https://humanlikewriter.com');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestPayload, setRequestPayload] = useState<string>('');
  const [timeoutValue, setTimeoutValue] = useState<number>(30);
  
  // Adiciona opção de testar com url direta
  const [testMethod, setTestMethod] = useState<'direct' | 'supabase' | 'fetch'>('direct');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [payloadFormat, setPayloadFormat] = useState<'name' | 'url'>('name');
  
  // Função para fazer fetch com timeout
  const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = timeoutValue * 1000) => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };
  
  // Função para atualizar o progresso enquanto espera
  const startProgressTimer = (timeoutMs: number) => {
    setProgress(0);
    const intervalStep = 100; // atualizar a cada 100ms
    const totalSteps = timeoutMs / intervalStep;
    let currentStep = 0;
    
    const intervalId = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(Math.floor((currentStep / totalSteps) * 100), 99);
      setProgress(newProgress);
      
      if (currentStep >= totalSteps) {
        clearInterval(intervalId);
      }
    }, intervalStep);
    
    return () => clearInterval(intervalId);
  };
  
  const testUrlData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    setProgress(0);
    
    // Formatação correta do URL
    let formattedUrl = url;
    if (formattedUrl && !formattedUrl.match(/^https?:\/\//)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    // Payload que será enviado à edge function
    const payload = payloadFormat === 'name' 
      ? { name: formattedUrl } 
      : { url: formattedUrl };
    setRequestPayload(JSON.stringify(payload, null, 2));
    
    const timeoutMs = timeoutValue * 1000;
    const stopProgressTimer = startProgressTimer(timeoutMs);
    
    try {
      console.log('Testing URL data with payload:', payload);
      console.log('Using method:', testMethod);
      console.log('Timeout set to:', timeoutMs, 'ms');
      
      let data;
      
      if (testMethod === 'direct') {
        // Método 1: Chamada direta ao endpoint Supabase com fetch + timeout
        console.log('Calling Supabase endpoint directly with custom fetch');
        
        const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/Dados-da-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(payload)
        }, timeoutMs);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}\nDetalhe: ${errorText}`);
        }
        
        data = await response.json();
        console.log('Response received:', data);
      } 
      else if (testMethod === 'supabase') {
        // Método 2: Usando o cliente Supabase.js (supabase.functions.invoke)
        console.log('Using Supabase client library');
        
        try {
          // Importar sob demanda para não carregar desnecessariamente
          const { supabase } = await import('../lib/supabaseClient');
          
          // Usar fetch direto em vez de supabase.functions.invoke que pode não estar disponível
          const response = await fetch(`${supabaseUrl}/functions/v1/Dados-da-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na invocação via cliente Supabase: ${response.status} - ${response.statusText}\nDetalhe: ${errorText}`);
          }
          
          data = await response.json();
          console.log('Supabase client response:', data);
        } catch (supabaseError) {
          console.error('Supabase client error:', supabaseError);
          throw supabaseError;
        }
      } 
      else {
        // Método 3: Usando um proxy ou endpoint alternativo
        const endpoint = customEndpoint || 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/Dados-da-url';
        console.log('Calling through proxy:', endpoint);
        
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(payload)
        }, timeoutMs);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`HTTP error via proxy! Status: ${response.status} - ${response.statusText}\nDetalhe: ${errorText}`);
        }
        
        data = await response.json();
        console.log('Proxy response received:', data);
      }
      
      setResult(data);
      setProgress(100);
    } catch (err: unknown) {
      console.error('Error testing URL data:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError(`Timeout! A requisição excedeu ${timeoutValue} segundos (Method: ${testMethod})`);
        } else {
          setError(`${err.message} (Method: ${testMethod})`);
        }
      } else {
        setError(`Um erro desconhecido ocorreu (Method: ${testMethod})`);
      }
    } finally {
      stopProgressTimer();
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <h2>URL Data Extraction Test</h2>
      <p>Esta ferramenta envia uma URL para a Edge Function Dados-da-url e exibe o resultado.</p>
      
      <Form onSubmit={testUrlData}>
        <div>
          <label htmlFor="url">URL para testar:</label>
          <Input 
            id="url"
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Digite a URL para testar"
            required
          />
        </div>
        
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Método de Teste:</h4>
            <label>
              <input 
                type="radio" 
                name="method" 
                value="direct" 
                checked={testMethod === 'direct'} 
                onChange={() => setTestMethod('direct')}
              />
              Direto (Fetch com timeout)
            </label>
            <br />
            <label>
              <input 
                type="radio" 
                name="method" 
                value="supabase" 
                checked={testMethod === 'supabase'} 
                onChange={() => setTestMethod('supabase')}
              />
              Via Cliente Supabase
            </label>
            <br />
            <label>
              <input 
                type="radio" 
                name="method" 
                value="fetch" 
                checked={testMethod === 'fetch'} 
                onChange={() => setTestMethod('fetch')}
              />
              Proxy/Endpoint Alternativo
            </label>
          </div>
          
          <div>
            <h4>Formato do Payload:</h4>
            <label>
              <input 
                type="radio" 
                name="payloadFormat" 
                value="name" 
                checked={payloadFormat === 'name'} 
                onChange={() => setPayloadFormat('name')}
              />
              {"{ name: url }"} (Padrão)
            </label>
            <br />
            <label>
              <input 
                type="radio" 
                name="payloadFormat" 
                value="url" 
                checked={payloadFormat === 'url'} 
                onChange={() => setPayloadFormat('url')}
              />
              {"{ url: url }"} (Alternativo)
            </label>
          </div>
        </div>
        
        <div>
          <label htmlFor="timeout">Timeout (segundos):</label>
          <Input 
            id="timeout"
            type="number" 
            min="5"
            max="120"
            value={timeoutValue} 
            onChange={(e) => setTimeoutValue(parseInt(e.target.value) || 30)}
          />
        </div>
        
        {testMethod === 'fetch' && (
          <div>
            <label htmlFor="customEndpoint">URL de Endpoint Personalizado (opcional):</label>
            <Input 
              id="customEndpoint"
              type="text" 
              value={customEndpoint} 
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="URL de endpoint personalizado (deixe vazio para padrão)"
            />
          </div>
        )}
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Testando...' : 'Testar URL'}
        </Button>
      </Form>
      
      {loading && (
        <ResultContainer>
          <ResultHeader>Progresso: {progress}%</ResultHeader>
          <div style={{ width: '100%', height: '20px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${progress}%`, 
                height: '100%', 
                backgroundColor: '#4c84ff',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>
          <p>Aguarde... Isso pode levar até {timeoutValue} segundos.</p>
        </ResultContainer>
      )}
      
      {requestPayload && (
        <ResultContainer>
          <ResultHeader>Payload da Requisição:</ResultHeader>
          <ResultBox>{requestPayload}</ResultBox>
        </ResultContainer>
      )}
      
      {error && (
        <ResultContainer>
          <ResultHeader style={{ color: 'red' }}>Erro:</ResultHeader>
          <ResultBox style={{ color: 'red' }}>{error}</ResultBox>
        </ResultContainer>
      )}
      
      {result && (
        <ResultContainer>
          <ResultHeader>Resultado:</ResultHeader>
          <ResultBox>{JSON.stringify(result, null, 2)}</ResultBox>
        </ResultContainer>
      )}
    </Container>
  );
};

export default UrlDataTest;