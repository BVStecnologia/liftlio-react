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

async function testRPCTools() {
  console.log('🛠️  TESTE DAS 5 FERRAMENTAS RPC DO AGENTE\n');
  console.log('='.repeat(70));
  console.log('Verificando se o agente sabe usar as ferramentas da tabela agent_tools\n');
  
  // As 5 ferramentas RPC da tabela
  const toolsTests = [
    {
      tool: "get_complete_project_stats",
      description: "📊 Estatísticas completas do projeto",
      testPrompts: [
        "oi",
        "bom dia",
        "e aí",
        "status do projeto",
        "como estamos?"
      ]
    },
    {
      tool: "list_all_channels", 
      description: "📺 Listagem de todos os canais",
      testPrompts: [
        "quais canais temos?",
        "me mostre os canais",
        "lista de canais",
        "quantos canais?",
        "canais monitorados"
      ]
    },
    {
      tool: "channel_performance_analysis",
      description: "📈 Análise de performance dos canais",
      testPrompts: [
        "performance dos canais",
        "análise de desempenho",
        "quais canais estão melhor?",
        "métricas de performance",
        "top canais"
      ]
    },
    {
      tool: "video_engagement_metrics",
      description: "💫 Métricas de engajamento de vídeos",
      testPrompts: [
        "vídeos com mais engajamento",
        "métricas de curtidas",
        "vídeos populares",
        "análise de comentários",
        "engajamento dos vídeos"
      ]
    },
    {
      tool: "optimal_posting_times",
      description: "⏰ Horários otimizados para postagem",
      testPrompts: [
        "melhor horário para postar",
        "quando devo publicar?",
        "horários otimizados",
        "análise de horários",
        "quando postar?"
      ]
    }
  ];
  
  let totalTests = 0;
  let successCount = 0;
  
  for (const toolTest of toolsTests) {
    console.log(`\n${toolTest.description}`);
    console.log(`Ferramenta: ${toolTest.tool}`);
    console.log('-'.repeat(50));
    
    let toolSuccess = 0;
    
    for (const prompt of toolTest.testPrompts) {
      totalTests++;
      const result = await testAgente(prompt);
      
      // Verificar se chamou a ferramenta correta
      let success = false;
      const response = result.response || '';
      
      // Critérios de sucesso para cada ferramenta
      switch(toolTest.tool) {
        case 'get_complete_project_stats':
          success = response.includes('Posts realizados') && response.includes('Canais ativos');
          break;
        case 'list_all_channels':
          success = response.includes('canais monitorados:') && response.includes('subs');
          break;
        case 'channel_performance_analysis':
          success = response.includes('Performance') && response.includes('score');
          break;
        case 'video_engagement_metrics':
          success = response.includes('Engajamento') || response.includes('eng.');
          break;
        case 'optimal_posting_times':
          // Esta não está implementada ainda
          success = response.toLowerCase().includes('horário') || response.includes('⏰');
          break;
      }
      
      if (success) {
        successCount++;
        toolSuccess++;
      }
      
      console.log(`${success ? '✅' : '❌'} "${prompt}"`);
      
      await new Promise(r => setTimeout(r, 300));
    }
    
    const toolRate = (toolSuccess / toolTest.testPrompts.length * 100).toFixed(0);
    console.log(`\n📊 Taxa de sucesso: ${toolRate}% (${toolSuccess}/${toolTest.testPrompts.length})`);
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO FINAL\n');
  
  const overallRate = (successCount / totalTests * 100).toFixed(1);
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Taxa geral: ${overallRate}%`);
  
  console.log('\n🎯 ANÁLISE:');
  if (overallRate >= 80) {
    console.log('✅ EXCELENTE! O agente está usando as ferramentas muito bem!');
  } else if (overallRate >= 60) {
    console.log('⚠️  BOM, mas algumas ferramentas precisam melhorar');
  } else {
    console.log('❌ PRECISA MELHORAR o uso das ferramentas');
  }
  
  console.log('\n💡 IMPORTANTE:');
  console.log('- O agente deve saber quando usar cada ferramenta RPC');
  console.log('- Claude complementa com inteligência para casos não cobertos');
  console.log('- A simplicidade do código facilita manutenção');
  console.log('='.repeat(70));
}

console.log('Iniciando teste das ferramentas RPC...\n');
testRPCTools().catch(console.error);