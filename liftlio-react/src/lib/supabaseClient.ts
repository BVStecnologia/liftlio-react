import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjUwOTM0NCwiZXhwIjoyMDQyMDg1MzQ0fQ.O-RO8VMAjfxZzZmDcyJeKABJJ2cn9OfIpapuxDENH8c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função auxiliar para chamar RPCs enquanto o TypeScript é atualizado
export async function callRPC(functionName: string, params: Record<string, any>) {
  return await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(params)
  }).then(res => res.json());
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