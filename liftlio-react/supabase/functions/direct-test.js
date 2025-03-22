import fetch from 'node-fetch';

// Usando os dados fornecidos no comando curl
const url = 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/claude-proxy';
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Adicionando o campo 'prompt' conforme solicitado pela função
const requestBody = { 
  name: 'Functions',
  prompt: 'Olá, estou testando a edge function do Claude. Por favor, responda com uma saudação simples.'
};

async function testDirectFetch() {
  try {
    console.log(`Fazendo requisição para: ${url}`);
    console.log('Corpo da requisição:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const statusCode = response.status;
    
    // Tenta obter a resposta como JSON ou texto
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    console.log(`Status da resposta: ${statusCode}`);
    console.log('Resposta:');
    console.log(responseData);
    
  } catch (error) {
    console.error('Erro ao fazer a requisição:', error);
  }
}

// Testa com um array de mensagens também
async function testWithMessages() {
  try {
    const messagesBody = {
      name: 'Functions',
      messages: [
        { role: 'user', content: 'Olá, estou testando a edge function do Claude. Como vai você?' }
      ]
    };
    
    console.log('\n\nTestando com o formato de mensagens:');
    console.log('Corpo da requisição:', JSON.stringify(messagesBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagesBody)
    });
    
    const statusCode = response.status;
    
    // Tenta obter a resposta como JSON ou texto
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    console.log(`Status da resposta: ${statusCode}`);
    console.log('Resposta:');
    console.log(responseData);
    
  } catch (error) {
    console.error('Erro ao fazer a requisição com mensagens:', error);
  }
}

// Executa os testes
await testDirectFetch();
await testWithMessages();