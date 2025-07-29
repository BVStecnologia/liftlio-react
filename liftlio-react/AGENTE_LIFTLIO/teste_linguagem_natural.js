const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

async function testAgente(prompt) {
  console.log(`\n🗣️  "${prompt}"`);
  
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
          currentProject: { id: "58", name: "HW" }
        }
      })
    });
    
    const data = await response.json();
    console.log(`🤖 ${data.response}\n`);
    return data;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}\n`);
    return { error: error.message };
  }
}

async function testNaturalLanguage() {
  console.log('🧠 TESTE DE LINGUAGEM NATURAL - v68\n');
  console.log('='.repeat(60));
  console.log('Testando se Claude responde na mesma língua e usa ferramentas inteligentemente\n');
  
  // Testes em português
  console.log('🇧🇷 PORTUGUÊS:');
  await testAgente("oi, tudo bem?");
  await testAgente("quais as métricas do projeto?");
  await testAgente("me mostra os canais que temos");
  await testAgente("como está a performance?");
  await testAgente("quais vídeos têm mais engajamento?");
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Testes em inglês
  console.log('\n🇺🇸 ENGLISH:');
  await testAgente("hello, how are you?");
  await testAgente("what are the project metrics?");
  await testAgente("show me the channels we have");
  await testAgente("how is the performance?");
  await testAgente("which videos have more engagement?");
  
  console.log('='.repeat(60));
  console.log('✅ Teste concluído!\n');
}

testNaturalLanguage().catch(console.error);