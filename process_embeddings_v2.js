const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6InNlcnZpY2Utcm9sZSIsImlhdCI6MTcyNjUwOTM0NCwiZXhwIjoyMDQyMDg1MzQ0fQ.pUSVyu7iLH9OBJyDHgyJMXMdDMLvG9uSq3Q1teXAB64';

const messages = [
  {
    id: 65105,
    content: 'POSTAGEM REALIZADA em 20/07/2025 19:41. Tipo de mensagem: 2. Status: posted. Próxima postagem agendada para: 20/07/2025 19:41. Conteúdo postado: Humanlike Writer helps me create high-converting affiliate content that actually sounds authentic and builds trust with readers.. Projeto ID: 58. Relacionado ao vídeo ID: 27817. Relacionado ao comentário ID: 688784',
    metadata: {
      status: "posted",
      video_id: 27817,
      source_id: 65105,
      comment_id: 688784,
      message_id: 25941,
      project_id: 58,
      message_type: 2,
      source_table: "Settings_messages_posts",
      scheduled_time: "2025-07-20T19:41:00"
    }
  },
  {
    id: 65106,
    content: 'Mensagem agendada para 21/07/2025 00:42 (horário de Brasília). Status: pending. Conteúdo: LinkedIn articles have been great for my affiliate content too! I use Humanlike Writer to create engaging posts that really connect with my professional audience.. Projeto ID: 58. Relacionado ao vídeo ID: 27834. Relacionado ao comentário ID: 689365',
    metadata: {
      status: "pending",
      video_id: 27834,
      source_id: 65106,
      comment_id: 689365,
      message_id: 26044,
      project_id: 58,
      message_type: 2,
      source_table: "Settings_messages_posts",
      scheduled_time: "2025-07-21T00:42:00"
    }
  },
  {
    id: 65107,
    content: "Mensagem agendada para 20/07/2025 21:26 (horário de Brasília). Status: pending. Conteúdo: You're absolutely right - using content without permission is unethical and against platform rules. I've been using Humanlike Writer to create my own original affiliate content and it's working great.. Projeto ID: 58. Relacionado ao vídeo ID: 27832. Relacionado ao comentário ID: 689261",
    metadata: {
      status: "pending",
      video_id: 27832,
      source_id: 65107,
      comment_id: 689261,
      message_id: 26039,
      project_id: 58,
      message_type: 2,
      source_table: "Settings_messages_posts",
      scheduled_time: "2025-07-20T21:26:00"
    }
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
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ text: msg.content })
    });
    
    const embeddingData = await embeddingResponse.json();
    
    if (!embeddingData.embedding) {
      throw new Error('Falha ao gerar embedding: ' + JSON.stringify(embeddingData));
    }
    
    console.log('✅ Embedding gerado com sucesso');
    
    // 2. Inserir embedding no banco usando service key
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/rag_embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        content: msg.content,
        embedding: embeddingData.embedding,
        source_table: 'Settings_messages_posts',
        source_id: msg.id.toString(),
        metadata: msg.metadata
      })
    });
    
    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      throw new Error(`Erro ao inserir: ${error}`);
    }
    
    const result = await insertResponse.json();
    console.log(`✅ Embedding inserido com sucesso: ID ${result[0].id}`);
    
    // 3. Marcar como processado
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/Settings%20messages%20posts?id=eq.${msg.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        rag_processed: true,
        rag_processed_at: new Date().toISOString()
      })
    });
    
    if (updateResponse.ok) {
      console.log(`✅ Mensagem ${msg.id} marcada como processada`);
    } else {
      console.log(`⚠️ Aviso: Não foi possível marcar mensagem ${msg.id} como processada`);
    }
    
  } catch (error) {
    console.error(`❌ Erro processando mensagem ${msg.id}:`, error);
  }
}

// Processar todas as mensagens
async function main() {
  console.log('Iniciando processamento de embeddings com SERVICE KEY...');
  console.log('Processando 3 mensagens agendadas do projeto 58');
  
  for (const msg of messages) {
    await processMessage(msg);
    // Aguardar um pouco entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Processamento concluído!');
}

main();