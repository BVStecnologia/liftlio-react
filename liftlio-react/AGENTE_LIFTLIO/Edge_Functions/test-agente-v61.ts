/**
 * Script de testes para o Agente v61
 * Execute cada teste para validar as tools e respostas
 */

// Casos de teste organizados por categoria
const testCases = [
  // 1. DAILY STATUS
  {
    name: "Resumo diário - português",
    input: {
      prompt: "como estamos hoje?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "daily_status",
    expectedFormat: "📊 **Resumo de hoje:**",
    maxLines: 5
  },
  {
    name: "Resumo diário - variação",
    input: {
      prompt: "qual o status de hoje?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "daily_status",
    maxLines: 5
  },

  // 2. LIST CHANNELS
  {
    name: "Listar canais",
    input: {
      prompt: "liste todos os canais",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "list_channels",
    expectedFormat: "📺 **",
    shouldContain: ["subs", "views"]
  },
  {
    name: "Quais canais monitorados",
    input: {
      prompt: "quais canais estamos monitorando?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "list_channels"
  },

  // 3. TODAY POSTS
  {
    name: "Posts de hoje",
    input: {
      prompt: "o que foi postado hoje?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "today_posts",
    expectedFormat: "📝 **Posts de hoje:**"
  },
  {
    name: "Postagens do dia",
    input: {
      prompt: "mostre as postagens de hoje",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "today_posts"
  },

  // 4. SCHEDULED POSTS
  {
    name: "Posts agendados",
    input: {
      prompt: "quais posts estão agendados?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "scheduled_posts"
  },

  // 5. PERFORMANCE
  {
    name: "Análise de performance",
    input: {
      prompt: "como está a performance?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "performance",
    expectedFormat: "📈 **Análise de Performance:**"
  },

  // 6. ENGAGEMENT
  {
    name: "Métricas de engajamento",
    input: {
      prompt: "mostre o engajamento",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "engagement",
    expectedFormat: "💫 **Métricas de Engajamento:**"
  },

  // 7. GENERAL QUESTIONS
  {
    name: "Pergunta geral",
    input: {
      prompt: "o que é o Liftlio?",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    expectedIntent: "general",
    maxLines: 4
  },

  // 8. EDGE CASES
  {
    name: "Pergunta muito curta",
    input: {
      prompt: "oi",
      context: { currentProject: { id: "58", name: "HW" } }
    },
    maxLines: 3
  },
  {
    name: "Sem projeto selecionado",
    input: {
      prompt: "como estamos hoje?",
      context: {}
    },
    shouldContain: ["projeto", "selecione"]
  }
];

// Função para executar teste
async function runTest(testCase: any) {
  console.log(`\n🧪 Teste: ${testCase.name}`);
  console.log(`   Prompt: "${testCase.input.prompt}"`);
  
  try {
    // Simular chamada à Edge Function
    const response = await fetch('https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY' // Substituir pela chave real
      },
      body: JSON.stringify(testCase.input)
    });

    const result = await response.json();
    
    // Validações
    console.log(`   Intent detectado: ${result.intent} (confiança: ${result.confidence})`);
    
    if (testCase.expectedIntent) {
      const intentMatch = result.intent === testCase.expectedIntent;
      console.log(`   ✓ Intent esperado: ${intentMatch ? '✅' : '❌'}`);
    }
    
    if (testCase.expectedFormat) {
      const formatMatch = result.response.includes(testCase.expectedFormat);
      console.log(`   ✓ Formato esperado: ${formatMatch ? '✅' : '❌'}`);
    }
    
    if (testCase.maxLines) {
      const lines = result.response.split('\n').length;
      const lengthOk = lines <= testCase.maxLines;
      console.log(`   ✓ Máximo ${testCase.maxLines} linhas: ${lengthOk ? '✅' : '❌'} (tem ${lines})`);
    }
    
    if (testCase.shouldContain) {
      testCase.shouldContain.forEach((term: string) => {
        const contains = result.response.toLowerCase().includes(term.toLowerCase());
        console.log(`   ✓ Contém "${term}": ${contains ? '✅' : '❌'}`);
      });
    }
    
    console.log(`\n   Resposta:\n   ${result.response.split('\n').map((l: string) => '   ' + l).join('\n')}`);
    
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
  }
}

// Script de execução dos testes
console.log("🚀 Iniciando testes do Agente v61\n");

// Para executar:
// 1. Substitua YOUR_ANON_KEY pela chave anônima do Supabase
// 2. Execute: deno run --allow-net test-agente-v61.ts

// Executar todos os testes
// testCases.forEach(runTest);

// Ou executar teste específico
// runTest(testCases[0]);

// Testes de SQL direto (para validar funções)
const sqlTests = [
  {
    name: "Test get_daily_briefing",
    query: `SELECT * FROM get_daily_briefing(58);`
  },
  {
    name: "Test get_all_channels_stats",
    query: `SELECT * FROM get_all_channels_stats(58, 5);`
  },
  {
    name: "Test get_posts_by_date",
    query: `SELECT * FROM get_posts_by_date(58, CURRENT_DATE);`
  }
];

console.log("\n📊 Queries SQL para testar no Supabase Dashboard:\n");
sqlTests.forEach(test => {
  console.log(`-- ${test.name}`);
  console.log(`${test.query}\n`);
});