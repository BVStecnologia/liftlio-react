const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

async function testAgent() {
  console.log('=== TESTE AGENTE v29 - VERIFICAÇÃO DE NÃO-ALUCINAÇÃO ===\n');
  
  const questions = [
    {
      prompt: "me diga exatamente quais são as mensagens agendadas, com datas e conteúdo",
      expectedBehavior: "Deve dizer que não tem acesso aos detalhes específicos"
    },
    {
      prompt: "quantas mensagens agendadas existem?",
      expectedBehavior: "Deve responder 2 baseado nas métricas"
    },
    {
      prompt: "qual o total de menções do projeto?",
      expectedBehavior: "Deve responder com número exato das métricas"
    }
  ];
  
  for (const q of questions) {
    console.log(`\n📝 PERGUNTA: "${q.prompt}"`);
    console.log(`🎯 COMPORTAMENTO ESPERADO: ${q.expectedBehavior}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          prompt: q.prompt,
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
          sessionId: 'test-session-456'
        })
      });
      
      const data = await response.json();
      console.log(`\n💬 RESPOSTA DO AGENTE:`);
      console.log(data.response || data.error);
      
      if (data.metadata) {
        console.log(`\n📊 METADADOS:`);
        console.log(`- RAG pesquisado: ${data.metadata.ragSearched}`);
        console.log(`- Resultados RAG: ${data.metadata.ragResults}`);
        console.log(`- Categorias: ${data.metadata.categories?.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ ERRO:', error);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

testAgent();