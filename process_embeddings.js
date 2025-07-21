const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

const messages = [
  {
    id: '65105',
    content: 'Mensagem agendada para 20/07/2025 19:41 (horário de Brasília). Status: pending. Conteúdo: Humanlike Writer helps me create high-converting affiliate content that actually sounds authentic and builds trust with readers.. Projeto ID: 58. Relacionado ao vídeo ID: 27817. Relacionado ao comentário ID: 688784'
  },
  {
    id: '65106', 
    content: 'Mensagem agendada para 21/07/2025 00:42 (horário de Brasília). Status: pending. Conteúdo: LinkedIn articles have been great for my affiliate content too! I use Humanlike Writer to create engaging posts that really connect with my professional audience.. Projeto ID: 58. Relacionado ao vídeo ID: 27834. Relacionado ao comentário ID: 689365'
  },
  {
    id: '65107',
    content: 'Mensagem agendada para 20/07/2025 21:26 (horário de Brasília). Status: pending. Conteúdo: You\'re absolutely right - using content without permission is unethical and against platform rules. I\'ve been using Humanlike Writer to create my own original affiliate content and it\'s working great.. Projeto ID: 58. Relacionado ao vídeo ID: 27832. Relacionado ao comentário ID: 689261'
  }
];

async function processMessage(msg) {
  console.log(`\nProcessando mensagem ${msg.id}...`);
  
  try {
    // 1. Gerar embedding
    const embeddingResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ text: msg.content })
    });
    
    const embeddingData = await embeddingResponse.json();
    
    if (!embeddingData.embedding) {
      throw new Error('Falha ao gerar embedding');
    }
    
    // 2. Inserir embedding no banco
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/rag_embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        content: msg.content,
        embedding: embeddingData.embedding,
        source_table: 'Settings_messages_posts',
        source_id: msg.id,
        metadata: {
          source_table: 'Settings_messages_posts',
          source_id: parseInt(msg.id),
          project_id: 58,
          processed_at: new Date().toISOString(),
          content_length: msg.content.length,
          content_preview: msg.content.substring(0, 100)
        }
      })
    });
    
    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      throw new Error(`Erro ao inserir: ${error}`);
    }
    
    const result = await insertResponse.json();
    console.log(`✅ Embedding criado com sucesso: ID ${result[0].id}`);
    
    // 3. Marcar como processado
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/Settings%20messages%20posts?id=eq.${msg.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        rag_processed: true,
        rag_processed_at: new Date().toISOString()
      })
    });
    
    if (updateResponse.ok) {
      console.log(`✅ Mensagem ${msg.id} marcada como processada`);
    }
    
  } catch (error) {
    console.error(`❌ Erro processando mensagem ${msg.id}:`, error);
  }
}

// Processar todas as mensagens
async function main() {
  console.log('Iniciando processamento de embeddings...');
  
  for (const msg of messages) {
    await processMessage(msg);
    // Aguardar um pouco entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nProcessamento concluído!');
}

main();