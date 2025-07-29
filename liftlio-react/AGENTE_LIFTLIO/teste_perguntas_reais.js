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
          currentProject: {
            id: "58",
            name: "HW"
          }
        }
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

async function testRealQuestions() {
  console.log('💬 TESTE COM PERGUNTAS REAIS E DIVERSIFICADAS\n');
  console.log('='.repeat(70));
  console.log('Simulando conversas reais de usuários do Liftlio\n');
  
  // Perguntas naturais que um usuário real faria
  const realConversations = [
    // Conversas informais
    "oi, tudo bem?",
    "e aí, como tá o sistema hoje?",
    "fala aí, alguma novidade?",
    "bom dia! me dá um resumo rápido",
    "opa, tudo funcionando?",
    
    // Pedidos diretos
    "me mostra todos os canais que a gente monitora",
    "quero ver os canais",
    "lista aí os canais pra mim",
    "tem quantos canais cadastrados?",
    "mostra os canais do youtube",
    
    // Perguntas sobre performance
    "como tá a performance geral?",
    "quais canais estão bombando?",
    "me mostra os melhores canais",
    "qual canal tá indo melhor?",
    "quero ver a análise de desempenho",
    
    // Sobre engajamento
    "quais vídeos tão com mais curtidas?",
    "tem algum vídeo bombando?",
    "mostra os vídeos mais comentados",
    "quero ver o engajamento",
    "qual vídeo tá dando mais resultado?",
    
    // Horários
    "qual o melhor horário pra postar?",
    "quando devo publicar meus vídeos?",
    "que horas é melhor postar?",
    "me ajuda com os horários",
    "quando os vídeos têm mais visualização?",
    
    // Perguntas complexas
    "preciso de um relatório completo de tudo",
    "me faz um resumo geral do projeto",
    "como está o projeto HW hoje?",
    "quero entender melhor os números",
    "explica o que cada métrica significa",
    
    // Perguntas fora do escopo (deve responder educadamente)
    "você pode me ajudar com Excel?",
    "sabe programar em Python?",
    "qual a previsão do tempo?",
    "me conta uma piada",
    "o que você acha do YouTube?",
    
    // Misturando português e inglês
    "show me the channels",
    "qual é a performance?",
    "list all videos",
    "mostra o engagement",
    "what's the best time to post?"
  ];
  
  console.log(`Testando ${realConversations.length} perguntas diversificadas...\n`);
  
  let goodResponses = 0;
  let contextualResponses = 0;
  let genericResponses = 0;
  
  for (const question of realConversations) {
    console.log(`\n👤 "${question}"`);
    
    const start = Date.now();
    const result = await testAgente(question);
    const elapsed = Date.now() - start;
    
    const response = result.response || 'ERRO';
    
    // Analisar qualidade da resposta
    let quality = "❓";
    
    if (response.includes('Posts realizados') || 
        response.includes('canais monitorados') ||
        response.includes('Performance') ||
        response.includes('Engajamento') ||
        response.includes('Minhas ferramentas')) {
      quality = "🎯"; // Usou ferramenta RPC específica
      goodResponses++;
    } else if (response.includes('Liftlio') || 
               response.includes('monitoramento') ||
               response.includes('YouTube') ||
               response.includes('canais')) {
      quality = "✅"; // Resposta contextualizada ao Liftlio
      contextualResponses++;
    } else {
      quality = "💭"; // Resposta genérica do Claude
      genericResponses++;
    }
    
    // Mostrar preview da resposta
    const preview = response.substring(0, 80) + (response.length > 80 ? '...' : '');
    console.log(`${quality} ${preview}`);
    console.log(`⏱️  ${elapsed}ms`);
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(70));
  console.log('📊 ANÁLISE DAS RESPOSTAS\n');
  
  const total = realConversations.length;
  console.log(`🎯 Ferramentas RPC usadas: ${goodResponses} (${(goodResponses/total*100).toFixed(0)}%)`);
  console.log(`✅ Respostas contextualizadas: ${contextualResponses} (${(contextualResponses/total*100).toFixed(0)}%)`);
  console.log(`💭 Respostas genéricas: ${genericResponses} (${(genericResponses/total*100).toFixed(0)}%)`);
  
  const successRate = ((goodResponses + contextualResponses) / total * 100).toFixed(0);
  
  console.log(`\n📈 Taxa de sucesso geral: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('✅ EXCELENTE! O agente está respondendo muito bem!');
  } else if (successRate >= 60) {
    console.log('⚠️  BOM, mas pode melhorar em algumas áreas');
  } else {
    console.log('❌ PRECISA MELHORAR as respostas');
  }
  
  console.log('\n💡 INSIGHTS:');
  console.log('- O agente precisa usar as ferramentas RPC quando apropriado');
  console.log('- Claude deve manter contexto do Liftlio mesmo em perguntas gerais');
  console.log('- Respostas devem ser úteis e específicas ao sistema');
  console.log('='.repeat(70));
}

console.log('Iniciando teste com perguntas reais e diversificadas...\n');
testRealQuestions().catch(console.error);