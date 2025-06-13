import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { retryNetworkRequest } from '../utils/networkErrorHandler'
import { safeFetch, detectExtensionIssues } from '../utils/fetchWrapper'

export const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I'

// Detect extension issues early
if (typeof window !== 'undefined') {
  detectExtensionIssues();
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função auxiliar para chamar RPCs enquanto o TypeScript é atualizado
export async function callRPC(functionName: string, params: Record<string, any>) {
  console.log(`Chamando RPC: ${functionName} com parâmetros:`, params);
  
  return retryNetworkRequest(async () => {
    const response = await safeFetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
      timeout: 30000
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
  }, 3, 1000);
}

// Função auxiliar para chamar Edge Functions sem depender do suporte TypeScript
export async function callEdgeFunction(functionName: string, params: Record<string, any>) {
  return retryNetworkRequest(async () => {
    const response = await safeFetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
      timeout: 60000
    });
    
    if (!response.ok) {
      throw new Error(`Error calling edge function ${functionName}: ${response.statusText}`);
    }
    
    return await response.json();
  }, 3, 1000);
}