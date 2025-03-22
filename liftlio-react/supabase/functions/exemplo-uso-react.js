// Exemplo de como usar a edge function claude-proxy em um componente React

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ClaudeAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para enviar uma mensagem para o Claude via edge function
  const askClaude = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Invocando a edge function claude-proxy
      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: { 
          // Você pode usar o formato prompt ou messages
          // Formato prompt (texto simples)
          prompt: prompt,
          
          // Ou formato messages (mais flexível para conversas)
          /*
          messages: [
            { role: 'user', content: prompt }
          ]
          */
        },
      });
      
      if (error) {
        setError(`Erro ao chamar Claude: ${error.message}`);
      } else {
        // Extraindo a resposta do texto retornado por Claude
        const responseText = data.content[0]?.text || 'Sem resposta';
        setResponse(responseText);
      }
    } catch (e) {
      setError(`Erro inesperado: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claude-assistant">
      <h2>Assistente Claude</h2>
      
      <div className="prompt-container">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Digite sua pergunta para o Claude..."
          rows={4}
        />
        <button onClick={askClaude} disabled={loading || !prompt.trim()}>
          {loading ? 'Enviando...' : 'Perguntar ao Claude'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {response && (
        <div className="response-container">
          <h3>Resposta:</h3>
          <div className="response-text">
            {response}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeAssistant;