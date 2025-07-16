/**
 * Suite de Testes Automatizados para Sistema RAG
 * 
 * Objetivo: Validar funcionamento do RAG em diferentes cenários
 * Executar com: deno run --allow-net --allow-env suite_testes_rag_automatizada.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Configurações
const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const PROJECT_ID = '58'; // Projeto HW de teste

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Interface para resultado de teste
interface TestResult {
  name: string;
  prompt: string;
  passed: boolean;
  hasRAGData: boolean;
  ragResultsCount: number;
  responseTime: number;
  error?: string;
  expectedKeywords: string[];
  foundKeywords: string[];
  details?: any;
}

// Casos de teste
const testCases = [
  {
    name: "Busca por menções hoje",
    prompt: "como estão as menções postadas hoje?",
    expectedKeywords: ["postada", "14:11", "hoje", "13/07"],
    minRAGResults: 1
  },
  {
    name: "Busca por horário específico",
    prompt: "o que foi postado às 14:11?",
    expectedKeywords: ["14:11", "earnings", "breakdown", "Humanlike"],
    minRAGResults: 1
  },
  {
    name: "Busca por texto exato",
    prompt: "POSTAGEM REALIZADA",
    expectedKeywords: ["POSTAGEM", "REALIZADA", "status"],
    minRAGResults: 5
  },
  {
    name: "Busca por data completa",
    prompt: "listar postagens de 13 de julho de 2025",
    expectedKeywords: ["13/07/2025", "julho", "postagem"],
    minRAGResults: 1
  },
  {
    name: "Busca por produto específico",
    prompt: "quais menções falam sobre Humanlike Writer?",
    expectedKeywords: ["Humanlike", "Writer", "HW", "affiliate"],
    minRAGResults: 3
  },
  {
    name: "Busca por conteúdo específico",
    prompt: "postagem sobre earnings breakdown",
    expectedKeywords: ["earnings", "breakdown", "15:30"],
    minRAGResults: 1
  },
  {
    name: "Pergunta sobre métricas",
    prompt: "quantas menções foram postadas?",
    expectedKeywords: ["229", "menções", "total"],
    minRAGResults: 0 // Métricas gerais podem não usar RAG
  },
  {
    name: "Busca temporal relativa",
    prompt: "o que foi postado ontem?",
    expectedKeywords: ["postagem", "realizada"],
    minRAGResults: 0 // Pode não ter dados de ontem
  },
  {
    name: "Busca por status",
    prompt: "quais postagens estão com status posted?",
    expectedKeywords: ["posted", "status", "postagem"],
    minRAGResults: 3
  },
  {
    name: "Navegação básica",
    prompt: "ir para o dashboard",
    expectedKeywords: ["dashboard", "levando", "página"],
    minRAGResults: 0 // Navegação não precisa de RAG
  }
];

/**
 * Executa um teste individual
 */
async function runTest(testCase: any): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    name: testCase.name,
    prompt: testCase.prompt,
    passed: false,
    hasRAGData: false,
    ragResultsCount: 0,
    responseTime: 0,
    expectedKeywords: testCase.expectedKeywords,
    foundKeywords: []
  };

  try {
    // Invocar função
    const { data, error } = await supabase.functions.invoke('agente-liftlio', {
      body: {
        prompt: testCase.prompt,
        context: {
          currentProject: {
            id: PROJECT_ID,
            name: "HW",
            status: "active"
          },
          currentPage: "/dashboard"
        },
        userId: "test-suite-" + Date.now(),
        sessionId: crypto.randomUUID()
      }
    });

    result.responseTime = Date.now() - startTime;

    if (error) {
      result.error = error.message;
      return result;
    }

    // Analisar resposta
    result.hasRAGData = data.hasRAGData || false;
    result.ragResultsCount = data.debug?.ragResultsCount || 0;
    result.details = data.debug;

    // Verificar palavras-chave na resposta
    const responseText = (data.content || "").toLowerCase();
    result.foundKeywords = testCase.expectedKeywords.filter((keyword: string) => 
      responseText.includes(keyword.toLowerCase())
    );

    // Determinar se passou
    const hasEnoughRAGResults = result.ragResultsCount >= testCase.minRAGResults;
    const hasRequiredKeywords = result.foundKeywords.length > 0 || testCase.minRAGResults === 0;
    
    result.passed = hasEnoughRAGResults && hasRequiredKeywords;

    // Log detalhado para debug
    if (!result.passed) {
      console.log(`\n❌ Falha em: ${testCase.name}`);
      console.log(`   RAG: ${result.ragResultsCount}/${testCase.minRAGResults}`);
      console.log(`   Keywords: ${result.foundKeywords.length}/${testCase.expectedKeywords.length}`);
      console.log(`   Response preview: ${responseText.substring(0, 100)}...`);
    }

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log("🧪 Iniciando Suite de Testes RAG");
  console.log(`📍 Projeto: ${PROJECT_ID}`);
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`);

  const results: TestResult[] = [];
  
  // Executar testes sequencialmente para evitar sobrecarga
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Executando: ${testCase.name}...`);
    
    const result = await runTest(testCase);
    results.push(result);
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Relatório final
  console.log("\n📊 RELATÓRIO FINAL\n");
  console.log("=".repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const withRAG = results.filter(r => r.hasRAGData).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const avgRAGResults = results.reduce((sum, r) => sum + r.ragResultsCount, 0) / results.length;
  
  console.log(`✅ Testes aprovados: ${passed}/${testCases.length} (${(passed/testCases.length*100).toFixed(1)}%)`);
  console.log(`❌ Testes falhados: ${failed}`);
  console.log(`🔍 Testes com RAG: ${withRAG}`);
  console.log(`⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`📊 Média de resultados RAG: ${avgRAGResults.toFixed(1)}`);
  
  console.log("\n📋 Detalhes por Teste:");
  console.log("-".repeat(80));
  
  results.forEach((result, idx) => {
    const status = result.passed ? "✅" : "❌";
    const ragInfo = result.hasRAGData ? `RAG: ${result.ragResultsCount}` : "RAG: -";
    const keywordInfo = `Keywords: ${result.foundKeywords.length}/${result.expectedKeywords.length}`;
    
    console.log(`${status} ${idx + 1}. ${result.name}`);
    console.log(`   Prompt: "${result.prompt}"`);
    console.log(`   ${ragInfo} | ${keywordInfo} | Tempo: ${result.responseTime}ms`);
    
    if (result.error) {
      console.log(`   ⚠️  Erro: ${result.error}`);
    }
    
    if (!result.passed && result.details) {
      console.log(`   Debug: ${JSON.stringify(result.details)}`);
    }
    console.log();
  });

  // Salvar resultados em arquivo
  const reportData = {
    timestamp: new Date().toISOString(),
    projectId: PROJECT_ID,
    summary: {
      total: testCases.length,
      passed,
      failed,
      withRAG,
      avgResponseTime,
      avgRAGResults
    },
    results
  };

  try {
    await Deno.writeTextFile(
      `./test_results_${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(reportData, null, 2)
    );
    console.log("\n💾 Resultados salvos em arquivo JSON");
  } catch (e) {
    console.log("\n⚠️  Não foi possível salvar arquivo de resultados");
  }

  // Retornar código de saída apropriado
  if (failed > 0) {
    console.log("\n❌ Suite de testes falhou!");
    Deno.exit(1);
  } else {
    console.log("\n✅ Todos os testes passaram!");
    Deno.exit(0);
  }
}

// Verificar se tem ANON KEY
if (!SUPABASE_ANON_KEY) {
  console.error("❌ ERRO: SUPABASE_ANON_KEY não encontrada!");
  console.error("Configure a variável de ambiente:");
  console.error("export SUPABASE_ANON_KEY='sua-anon-key-aqui'");
  Deno.exit(1);
}

// Executar testes
runAllTests().catch(error => {
  console.error("❌ Erro fatal:", error);
  Deno.exit(1);
});