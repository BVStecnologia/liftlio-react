const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

async function testAgente(prompt) {
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
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

async function quickDiverseTest() {
  console.log('🚀 TESTE RÁPIDO E DIVERSIFICADO\n');
  console.log('='.repeat(50));
  
  // Perguntas bem variadas
  const diverseQuestions = [
    // Informal
    "e aí, tudo bem?",
    "fala aí",
    
    // Diretas sobre ferramentas
    "quais suas capacidades?",
    "o que você sabe fazer?",
    
    // Sobre canais
    "quantos canais temos?",
    "mostra os canais aí",
    
    // Performance
    "como tá o desempenho?",
    "qual canal tá melhor?",
    
    // Engajamento
    "tem vídeo bombando?",
    "mostra os mais curtidos",
    
    // Complexas
    "preciso de um relatório",
    "analisa tudo pra mim",
    
    // Fora do escopo
    "sabe Python?",
    "me ajuda com Excel?",
    
    // Em inglês
    "show me the stats",
    "list channels please"
  ];
  
  let rpcUsed = 0;
  let contextual = 0;
  let total = diverseQuestions.length;
  
  console.log(`Testando ${total} perguntas diversificadas...\n`);
  
  for (const q of diverseQuestions) {
    const result = await testAgente(q);
    const resp = result.response || '';
    
    // Análise rápida
    if (resp.includes('Posts realizados') || 
        resp.includes('canais monitorados:') ||
        resp.includes('Performance') ||
        resp.includes('Engajamento')) {
      rpcUsed++;
      console.log(`✅ "${q}" → Usou RPC`);
    } else if (resp.includes('Liftlio') || resp.includes('YouTube')) {
      contextual++;
      console.log(`💡 "${q}" → Contextualizado`);
    } else {
      console.log(`💭 "${q}" → Claude genérico`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO:');
  console.log(`- RPC usado: ${rpcUsed}/${total} (${(rpcUsed/total*100).toFixed(0)}%)`);
  console.log(`- Contextualizado: ${contextual}/${total} (${(contextual/total*100).toFixed(0)}%)`);
  console.log(`- Taxa geral: ${((rpcUsed+contextual)/total*100).toFixed(0)}%`);
  
  if ((rpcUsed + contextual) / total >= 0.7) {
    console.log('\n✅ O agente está respondendo bem!');
  }
}

quickDiverseTest().catch(console.error);