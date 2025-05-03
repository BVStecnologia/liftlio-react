import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função auxiliar para chamar RPCs enquanto o TypeScript é atualizado
export async function callRPC(functionName: string, params: Record<string, any>) {
  console.log(`Chamando RPC: ${functionName} com parâmetros:`, params);
  
  // Configuração para aumentar o timeout para 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    
    // Verificar se a resposta HTTP foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na chamada RPC (${functionName}):`, response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Resposta da RPC (${functionName}):`, data);
    return data;
  } catch (error) {
    // Tratar timeout separadamente
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Timeout na chamada RPC (${functionName}) - excedeu 30 segundos`);
      throw new Error(`Timeout: A chamada para ${functionName} excedeu o limite de 30 segundos`);
    }
    
    console.error(`Erro na execução da RPC (${functionName}):`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Função auxiliar para chamar Edge Functions sem depender do suporte TypeScript
export async function callEdgeFunction(functionName: string, params: Record<string, any>) {
  // Configuração para aumentar o timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`Error calling edge function ${functionName}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    // Verificar se o erro é um objeto e tem a propriedade 'name'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout error: The request to ${functionName} took too long to respond (over 60 seconds)`);
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}