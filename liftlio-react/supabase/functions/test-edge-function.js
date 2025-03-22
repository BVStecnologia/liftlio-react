import { createClient } from '@supabase/supabase-js';

// Usar as mesmas credenciais do projeto principal
const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Testa a invocação da edge function claude-proxy com prompt simples
 */
async function testWithPrompt() {
  try {
    console.log('Conectado ao Supabase em:', supabaseUrl);
    console.log('Testando Edge Function com prompt:');
    
    const { data, error } = await supabase.functions.invoke('claude-proxy', {
      body: { 
        prompt: 'Olá Claude! Por favor, responda com uma saudação simples.'
      },
    });
    
    if (error) {
      console.error('❌ Erro ao invocar a edge function:', error);
    } else {
      console.log('✅ Resposta recebida com sucesso!');
      console.log('Resposta da edge function:', data);
    }
  } catch (e) {
    console.error('❌ Exceção ao executar o teste:', e);
  }
}

/**
 * Testa a invocação da edge function claude-proxy com formato messages
 */
async function testWithMessages() {
  try {
    console.log('\n\nTestando Edge Function com messages:');
    
    const { data, error } = await supabase.functions.invoke('claude-proxy', {
      body: { 
        messages: [
          { role: 'user', content: 'Olá Claude, estou testando a edge function. Como está o clima hoje?' }
        ]
      },
    });
    
    if (error) {
      console.error('❌ Erro ao invocar a edge function:', error);
    } else {
      console.log('✅ Resposta recebida com sucesso!');
      console.log('Resposta da edge function:', data);
    }
  } catch (e) {
    console.error('❌ Exceção ao executar o teste:', e);
  }
}

// Executa os testes
console.log('=== TESTANDO EDGE FUNCTION CLAUDE-PROXY ===');
await testWithPrompt();
await testWithMessages();
console.log('=== TESTES CONCLUÍDOS ===');