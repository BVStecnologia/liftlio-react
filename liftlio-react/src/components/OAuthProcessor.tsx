import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { safeFetch } from '../utils/fetchWrapper';
import { useGlobalLoading } from '../context/LoadingContext';

interface OAuthProcessorProps {
  code: string;
  state: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Componente dedicado para processar OAuth callbacks
 * Isolado para evitar race conditions com outros componentes
 */
export const OAuthProcessor: React.FC<OAuthProcessorProps> = ({
  code,
  state,
  onComplete,
  onError
}) => {
  const navigate = useNavigate();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevenir processamento duplicado
    if (isProcessing) return;

    const processOAuth = async () => {
      setIsProcessing(true);
      console.log('[OAuthProcessor] Iniciando processamento OAuth');
      console.log('[OAuthProcessor] Code:', code.substring(0, 20) + '...');
      console.log('[OAuthProcessor] State (Project ID):', state);

      showGlobalLoader('Connecting YouTube', 'Processing authentication...');

      try {
        // Determinar o URI de redirecionamento correto
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        // Construir URI com porta quando necessário
        const redirectUri = port && port !== '80' && port !== '443'
          ? `${protocol}//${hostname}:${port}`
          : `${protocol}//${hostname}`;

        console.log('[OAuthProcessor] Usando redirect URI:', redirectUri);
        console.log('[OAuthProcessor] Hostname:', hostname);
        console.log('[OAuthProcessor] Port:', port || 'default');

        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
        const clientSecret = process.env.REACT_APP_GOOGLE_CLIENT_SECRET || "";

        // Validar configuração
        if (!clientId || !clientSecret) {
          throw new Error('Google OAuth credentials not configured');
        }

        // Criar dados do formulário para a solicitação de token
        const formData = new URLSearchParams();
        formData.append('code', code);
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('redirect_uri', redirectUri);
        formData.append('grant_type', 'authorization_code');

        console.log('[OAuthProcessor] Fazendo solicitação de token para o YouTube...');

        // Fazer a requisição de token
        const tokenResponse = await safeFetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          timeout: 30000
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('[OAuthProcessor] Erro na resposta do token:', errorData);
          throw new Error(
            errorData.error_description ||
            errorData.error ||
            `Token exchange failed (${tokenResponse.status})`
          );
        }

        const tokenData = await tokenResponse.json();
        console.log('[OAuthProcessor] Token recebido com sucesso');

        // Converter state para número (ID do projeto)
        const projectId = parseInt(state, 10);
        if (isNaN(projectId)) {
          throw new Error('Invalid project ID in state parameter');
        }

        // Verificar se a integração já existe
        console.log('[OAuthProcessor] Verificando integração existente para projeto ID:', projectId);
        const { data: existingData, error: queryError } = await supabase
          .from('Integrações')
          .select('*')
          .eq('PROJETO id', projectId)
          .eq('Tipo de integração', 'youtube');

        if (queryError) {
          console.error('[OAuthProcessor] Erro ao verificar integração:', queryError);
          throw queryError;
        }

        const expiresAt = tokenData.expires_in; // Em segundos

        if (existingData && existingData.length > 0) {
          // Atualizar integração existente
          console.log('[OAuthProcessor] Atualizando integração existente');
          const { error: updateError } = await supabase
            .from('Integrações')
            .update({
              "Token": tokenData.access_token,
              "Refresh token": tokenData.refresh_token,
              "expira em": expiresAt,
              "Ultima atualização": new Date().toISOString(),
              "ativo": true
            })
            .eq('PROJETO id', projectId)
            .eq('Tipo de integração', 'youtube');

          if (updateError) throw updateError;
        } else {
          // Inserir nova integração
          console.log('[OAuthProcessor] Criando nova integração');
          const { error: insertError } = await supabase
            .from('Integrações')
            .insert([{
              "PROJETO id": projectId,
              "Tipo de integração": "youtube",
              "Token": tokenData.access_token,
              "Refresh token": tokenData.refresh_token,
              "expira em": expiresAt,
              "Ultima atualização": new Date().toISOString(),
              "ativo": true
            }]);

          if (insertError) throw insertError;
        }

        // Atualizar o projeto
        console.log('[OAuthProcessor] Atualizando projeto');
        const { error: projectUpdateError } = await supabase
          .from('Projeto')
          .update({
            "Youtube Active": true,
            "status": "0" // Iniciar processamento
          })
          .eq('id', projectId);

        if (projectUpdateError) {
          console.error('[OAuthProcessor] Erro ao atualizar projeto:', projectUpdateError);
        }

        // Marcar onboarding como completo
        localStorage.setItem('integrationSuccess', 'true');
        localStorage.setItem('integrationTimestamp', Date.now().toString());
        localStorage.setItem('userCompletedOnboarding', 'true');
        localStorage.setItem('recentIntegration', 'true');

        // Limpar marcador após 60 segundos
        setTimeout(() => {
          localStorage.removeItem('recentIntegration');
        }, 60000);

        console.log('[OAuthProcessor] Integração concluída com sucesso!');

        // Aguardar um momento para garantir que tudo foi salvo
        await new Promise(resolve => setTimeout(resolve, 1000));

        hideGlobalLoader();

        // Chamar callback de sucesso se fornecido
        if (onComplete) {
          onComplete();
        }

        // Navegar para overview
        navigate('/overview', { replace: true });

      } catch (error) {
        console.error('[OAuthProcessor] Erro ao processar OAuth:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        hideGlobalLoader();

        // Chamar callback de erro se fornecido
        if (onError) {
          onError(error instanceof Error ? error : new Error('OAuth processing failed'));
        }

        // Mostrar erro ao usuário
        alert(`Error connecting to YouTube: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Navegar para integrations após erro
        navigate('/integrations', { replace: true });
      }
    };

    processOAuth();
  }, [code, state, navigate, showGlobalLoader, hideGlobalLoader, onComplete, onError, isProcessing]);

  // UI de processamento
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1b 100%)',
      color: '#fff'
    }}>
      <div style={{
        padding: '40px',
        borderRadius: '16px',
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {!error ? (
          <>
            <h2 style={{ marginBottom: '20px', color: '#8b5cf6' }}>
              Connecting to YouTube
            </h2>
            <p style={{ marginBottom: '20px', opacity: 0.8 }}>
              Please wait while we complete your YouTube integration.
            </p>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(139, 92, 246, 0.3)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '20px', color: '#ef4444' }}>
              Connection Failed
            </h2>
            <p style={{ marginBottom: '20px', opacity: 0.8, color: '#ef4444' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/integrations')}
              style={{
                padding: '10px 20px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthProcessor;