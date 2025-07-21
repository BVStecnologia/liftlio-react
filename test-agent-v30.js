const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

async function testAgent() {
  console.log('=== TESTE AGENTE v30 (versão 38) - VERIFICAÇÃO FINAL ===\n');
  
  const questions = [
    "me diga exatamente quais são as mensagens agendadas, com datas e conteúdo",
    "quantas mensagens estão agendadas para hoje?",
    "qual o conteúdo das mensagens agendadas?"
  ];
  
  for (const prompt of questions) {
    console.log(`\n📝 PERGUNTA: "${prompt}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt,
          context: {
            currentProject: {
              id: '58',
              name: 'HW'
            },
            currentPage: 'mentions',
            visibleData: {
              channelsCount: 10,
              videosCount: 5,
              totalMentions: 150,
              todayMentions: 3,
              keywords: ['affiliate', 'marketing']
            }
          },
          userId: 'test-user-123',
          sessionId: 'test-session-789'
        })
      });
      
      const data = await response.json();
      console.log(`\n💬 RESPOSTA DO AGENTE:`);
      console.log(data.response || data.error);
      
      if (data.metadata) {
        console.log(`\n📊 METADADOS:`);
        console.log(`- RAG pesquisado: ${data.metadata.ragSearched}`);
        console.log(`- Resultados RAG: ${data.metadata.ragResults}`);
        console.log(`- Resultados após filtro: ${data.metadata.filteredResults || 'N/A'}`);
      }
      
    } catch (error) {
      console.error('❌ ERRO:', error);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n✅ TESTE CONCLUÍDO - Verifique se o agente:');
  console.log('1. NÃO inventou datas ou conteúdos');
  console.log('2. Apenas disse que existem 2 mensagens agendadas');
  console.log('3. Informou que não tem acesso aos detalhes');
}

testAgent();