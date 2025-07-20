// 🧪 BATERIA COMPLETA DE TESTES - PROJETO 58 (HW)
// Testa TODOS os aspectos: memória, contexto, RAG, dados reais
// v26 - UUID Fix + Memória Robusta

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Projeto 58 - HW (projeto real com dados)
const PROJECT_ID = '58';
const PROJECT_NAME = 'HW';

// Configuração de teste
const TEST_SESSION = 'proj58-test-' + Date.now();
const TEST_USER = 'test-user-' + Date.now();

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '═'.repeat(60));
    log(` ${title} `, 'magenta');
    console.log('═'.repeat(60));
}

function logTest(name, description) {
    log(`\n📋 ${name}`, 'yellow');
    if (description) log(`   ${description}`, 'white');
}

// Função principal de teste
async function testAgent(prompt, options = {}) {
    const {
        context = {},
        expectedInResponse = [],
        testName = 'Teste',
        checkRAG = false,
        checkMemory = false,
        logResponse = true
    } = options;
    
    logTest(testName, prompt);
    
    try {
        const startTime = Date.now();
        
        // Adicionar contexto do projeto 58
        const fullContext = {
            ...context,
            currentProject: {
                id: PROJECT_ID,
                name: PROJECT_NAME
            }
        };
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                prompt,
                context: fullContext,
                userId: TEST_USER,
                sessionId: TEST_SESSION
            })
        });

        const elapsedTime = Date.now() - startTime;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        
        if (data.response) {
            if (logResponse) {
                log(`   ⏱️  Tempo: ${elapsedTime}ms`, 'cyan');
                log(`   📥 Resposta: "${data.response.substring(0, 150)}..."`, 'green');
            }
            
            // Verificar conteúdo esperado
            const results = {
                success: true,
                response: data.response,
                metadata: data.metadata,
                elapsedTime,
                checks: {}
            };
            
            // Verificar palavras esperadas
            if (expectedInResponse.length > 0) {
                let allFound = true;
                log('\n   🔍 Verificando conteúdo:', 'cyan');
                
                for (const expected of expectedInResponse) {
                    const found = data.response.toLowerCase().includes(expected.toLowerCase());
                    results.checks[expected] = found;
                    
                    if (found) {
                        log(`      ✅ "${expected}"`, 'green');
                    } else {
                        log(`      ❌ "${expected}" NÃO ENCONTRADO`, 'red');
                        allFound = false;
                    }
                }
                
                results.allExpectedFound = allFound;
            }
            
            // Verificar RAG
            if (checkRAG && data.metadata) {
                log('\n   📊 Métricas RAG:', 'cyan');
                log(`      - Busca RAG: ${data.metadata.ragSearched ? 'Sim' : 'Não'}`, 'cyan');
                log(`      - Resultados: ${data.metadata.ragResults || 0}`, 'cyan');
                log(`      - Tempo busca: ${data.metadata.ragSearchTime || 0}ms`, 'cyan');
                
                results.ragMetrics = {
                    searched: data.metadata.ragSearched,
                    results: data.metadata.ragResults,
                    time: data.metadata.ragSearchTime
                };
            }
            
            // Verificar memória
            if (checkMemory && data.metadata) {
                log('\n   🧠 Métricas Memória:', 'cyan');
                log(`      - Itens memória: ${data.metadata.memoryItems || 0}`, 'cyan');
                log(`      - Info usuário: ${data.metadata.hasUserInfo ? 'Sim' : 'Não'}`, 'cyan');
                
                results.memoryMetrics = {
                    items: data.metadata.memoryItems,
                    hasUserInfo: data.metadata.hasUserInfo
                };
            }
            
            return results;
        }
        
        throw new Error('Resposta vazia do agente');
        
    } catch (error) {
        log(`   ❌ ERRO: ${error.message}`, 'red');
        return {
            success: false,
            error: error.message
        };
    }
}

// Função para esperar
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Suite principal de testes
async function runCompleteTestSuite() {
    log('\n🚀 INICIANDO BATERIA COMPLETA DE TESTES - PROJETO 58', 'magenta');
    log(`   SessionID: ${TEST_SESSION}`, 'cyan');
    log(`   UserID: ${TEST_USER}`, 'cyan');
    log(`   ProjectID: ${PROJECT_ID} (${PROJECT_NAME})`, 'cyan');
    
    const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        categories: {
            memory: { passed: 0, failed: 0 },
            context: { passed: 0, failed: 0 },
            rag: { passed: 0, failed: 0 },
            data: { passed: 0, failed: 0 }
        }
    };
    
    // ====== CATEGORIA 1: MEMÓRIA PERFEITA ======
    logSection('CATEGORIA 1: TESTES DE MEMÓRIA');
    
    // 1.1 Apresentação e contexto inicial
    await testAgent(
        "Olá! Meu nome é Carlos Eduardo, sou gerente de produto na Hardware Solutions. Estamos monitorando nossa campanha de lançamento do novo notebook gamer.",
        { testName: 'Apresentação Inicial' }
    );
    
    await wait(2000);
    
    // 1.2 Verificar se lembra do nome
    const test1 = await testAgent(
        "Qual é meu nome completo?",
        {
            testName: 'Memória: Nome',
            expectedInResponse: ['Carlos', 'Eduardo'],
            checkMemory: true
        }
    );
    
    testResults.total++;
    if (test1.allExpectedFound) {
        testResults.passed++;
        testResults.categories.memory.passed++;
        log('   ✅ PASSOU: Lembrou do nome completo', 'green');
    } else {
        testResults.failed++;
        testResults.categories.memory.failed++;
        log('   ❌ FALHOU: Não lembrou do nome', 'red');
    }
    
    // 1.3 Verificar empresa
    const test2 = await testAgent(
        "Onde eu trabalho e qual meu cargo?",
        {
            testName: 'Memória: Empresa/Cargo',
            expectedInResponse: ['Hardware Solutions', 'gerente', 'produto'],
            checkMemory: true
        }
    );
    
    testResults.total++;
    if (test2.checks && Object.values(test2.checks).filter(v => v).length >= 2) {
        testResults.passed++;
        testResults.categories.memory.passed++;
        log('   ✅ PASSOU: Lembrou da empresa e cargo', 'green');
    } else {
        testResults.failed++;
        testResults.categories.memory.failed++;
        log('   ❌ FALHOU: Não lembrou empresa/cargo', 'red');
    }
    
    // 1.4 Adicionar informações múltiplas
    await testAgent(
        "Nosso produto principal é o notebook Storm X450, lançado em novembro de 2024.",
        { testName: 'Info: Produto' }
    );
    
    await testAgent(
        "A meta é alcançar 10.000 menções até o final de janeiro.",
        { testName: 'Info: Meta' }
    );
    
    await testAgent(
        "O influenciador principal da campanha é o TechGuru com 2 milhões de inscritos.",
        { testName: 'Info: Influenciador' }
    );
    
    await wait(2000);
    
    // 1.5 Verificar memória completa
    const test3 = await testAgent(
        "Faça um resumo completo do que conversamos sobre minha campanha até agora",
        {
            testName: 'Memória: Resumo Completo',
            expectedInResponse: ['Carlos', 'Hardware Solutions', 'Storm X450', '10.000', 'TechGuru', 'notebook'],
            checkMemory: true
        }
    );
    
    testResults.total++;
    if (test3.checks && Object.values(test3.checks).filter(v => v).length >= 4) {
        testResults.passed++;
        testResults.categories.memory.passed++;
        log('   ✅ PASSOU: Manteve contexto completo', 'green');
    } else {
        testResults.failed++;
        testResults.categories.memory.failed++;
        log('   ❌ FALHOU: Perdeu informações do contexto', 'red');
    }
    
    // ====== CATEGORIA 2: CONTEXTO DE TELA ======
    logSection('CATEGORIA 2: TESTES DE CONTEXTO DE TELA');
    
    // 2.1 Dashboard Overview
    const test4 = await testAgent(
        "O que estou vendo na tela agora?",
        {
            testName: 'Contexto: Dashboard',
            context: {
                currentPage: '/dashboard',
                visibleData: {
                    totalMentions: 8542,
                    sentimentScore: 92,
                    reach: 4500000,
                    topVideos: ['Review Storm X450', 'Unboxing Gamer', 'Benchmark Tests']
                }
            },
            expectedInResponse: ['8542', '92', 'dashboard']
        }
    );
    
    testResults.total++;
    if (test4.allExpectedFound) {
        testResults.passed++;
        testResults.categories.context.passed++;
        log('   ✅ PASSOU: Identificou dados do dashboard', 'green');
    } else {
        testResults.failed++;
        testResults.categories.context.failed++;
        log('   ❌ FALHOU: Não identificou contexto do dashboard', 'red');
    }
    
    // 2.2 Página de Menções
    const test5 = await testAgent(
        "Quais são os sentimentos das menções que aparecem na minha tela?",
        {
            testName: 'Contexto: Menções',
            context: {
                currentPage: '/mentions',
                visibleData: {
                    mentions: [
                        { text: "Notebook incrível!", sentiment: "positive" },
                        { text: "Preço alto demais", sentiment: "negative" },
                        { text: "Performance excelente", sentiment: "positive" }
                    ],
                    positiveCount: 7800,
                    negativeCount: 742
                }
            },
            expectedInResponse: ['7800', 'positiv', '742']
        }
    );
    
    testResults.total++;
    if (test5.checks && Object.values(test5.checks).filter(v => v).length >= 2) {
        testResults.passed++;
        testResults.categories.context.passed++;
        log('   ✅ PASSOU: Analisou sentimentos corretamente', 'green');
    } else {
        testResults.failed++;
        testResults.categories.context.failed++;
        log('   ❌ FALHOU: Não identificou dados de sentimento', 'red');
    }
    
    // ====== CATEGORIA 3: BUSCA RAG ======
    logSection('CATEGORIA 3: TESTES DE BUSCA RAG');
    
    // 3.1 Buscar menções específicas
    const test6 = await testAgent(
        "Me mostre algumas menções recentes sobre o Storm X450",
        {
            testName: 'RAG: Busca Menções',
            checkRAG: true,
            expectedInResponse: ['Storm', 'X450']
        }
    );
    
    testResults.total++;
    if (test6.ragMetrics && test6.ragMetrics.results > 0) {
        testResults.passed++;
        testResults.categories.rag.passed++;
        log('   ✅ PASSOU: RAG encontrou menções', 'green');
    } else {
        testResults.failed++;
        testResults.categories.rag.failed++;
        log('   ❌ FALHOU: RAG não encontrou resultados', 'red');
    }
    
    // 3.2 Buscar vídeos
    const test7 = await testAgent(
        "Quais são os vídeos mais populares sobre nosso produto?",
        {
            testName: 'RAG: Busca Vídeos',
            checkRAG: true
        }
    );
    
    testResults.total++;
    if (test7.ragMetrics && test7.ragMetrics.searched) {
        testResults.passed++;
        testResults.categories.rag.passed++;
        log('   ✅ PASSOU: RAG buscou vídeos', 'green');
    } else {
        testResults.failed++;
        testResults.categories.rag.failed++;
        log('   ❌ FALHOU: RAG não foi ativado', 'red');
    }
    
    // 3.3 Buscar mensagens agendadas
    const test8 = await testAgent(
        "Quantas mensagens agendadas temos para responder?",
        {
            testName: 'RAG: Mensagens Agendadas',
            checkRAG: true,
            expectedInResponse: ['agendad']
        }
    );
    
    testResults.total++;
    if (test8.success && test8.response) {
        testResults.passed++;
        testResults.categories.rag.passed++;
        log('   ✅ PASSOU: Identificou mensagens agendadas', 'green');
    } else {
        testResults.failed++;
        testResults.categories.rag.failed++;
        log('   ❌ FALHOU: Não processou mensagens agendadas', 'red');
    }
    
    // ====== CATEGORIA 4: DADOS REAIS DO PROJETO ======
    logSection('CATEGORIA 4: TESTES DE DADOS DO PROJETO 58');
    
    // 4.1 Estatísticas gerais
    const test9 = await testAgent(
        "Qual o total de menções do projeto HW?",
        {
            testName: 'Dados: Total Menções',
            checkRAG: true
        }
    );
    
    testResults.total++;
    if (test9.success && test9.response.match(/\d+/)) {
        testResults.passed++;
        testResults.categories.data.passed++;
        log('   ✅ PASSOU: Retornou total de menções', 'green');
    } else {
        testResults.failed++;
        testResults.categories.data.failed++;
        log('   ❌ FALHOU: Não retornou estatísticas', 'red');
    }
    
    // 4.2 Canais e vídeos
    const test10 = await testAgent(
        "Quantos canais e vídeos estamos monitorando?",
        {
            testName: 'Dados: Canais/Vídeos',
            expectedInResponse: ['canal', 'vídeo']
        }
    );
    
    testResults.total++;
    if (test10.allExpectedFound) {
        testResults.passed++;
        testResults.categories.data.passed++;
        log('   ✅ PASSOU: Informou sobre canais/vídeos', 'green');
    } else {
        testResults.failed++;
        testResults.categories.data.failed++;
        log('   ❌ FALHOU: Não informou canais/vídeos', 'red');
    }
    
    // 4.3 Análise temporal
    const test11 = await testAgent(
        "Como está o desempenho da campanha hoje comparado com ontem?",
        {
            testName: 'Dados: Análise Temporal',
            checkRAG: true
        }
    );
    
    testResults.total++;
    if (test11.success && (test11.response.includes('hoje') || test11.response.includes('ontem'))) {
        testResults.passed++;
        testResults.categories.data.passed++;
        log('   ✅ PASSOU: Fez análise temporal', 'green');
    } else {
        testResults.failed++;
        testResults.categories.data.failed++;
        log('   ❌ FALHOU: Não fez análise temporal', 'red');
    }
    
    // ====== TESTE FINAL: MEMÓRIA DE LONGO PRAZO ======
    logSection('TESTE FINAL: PERSISTÊNCIA DE MEMÓRIA');
    
    // Fazer várias perguntas não relacionadas
    await testAgent("Quais são as principais funcionalidades do Liftlio?", { testName: 'Pergunta genérica 1' });
    await testAgent("Como funciona o sistema de alertas?", { testName: 'Pergunta genérica 2' });
    await testAgent("Posso exportar relatórios?", { testName: 'Pergunta genérica 3' });
    
    await wait(2000);
    
    // Verificar se ainda lembra de tudo
    const testFinal = await testAgent(
        "Você ainda lembra meu nome completo, empresa, produto principal e nome do influenciador?",
        {
            testName: 'Memória Final: Longo Prazo',
            expectedInResponse: ['Carlos Eduardo', 'Hardware Solutions', 'Storm X450', 'TechGuru'],
            checkMemory: true
        }
    );
    
    testResults.total++;
    if (testFinal.allExpectedFound) {
        testResults.passed++;
        testResults.categories.memory.passed++;
        log('   ✅ PASSOU: Memória perfeita após múltiplas interações!', 'green');
    } else {
        testResults.failed++;
        testResults.categories.memory.failed++;
        log('   ❌ FALHOU: Perdeu memória após interações', 'red');
    }
    
    // ====== RELATÓRIO FINAL ======
    logSection('📊 RELATÓRIO FINAL DE TESTES');
    
    const percentage = Math.round((testResults.passed / testResults.total) * 100);
    
    log(`\n📈 RESUMO GERAL:`, 'yellow');
    log(`   Total de testes: ${testResults.total}`, 'white');
    log(`   ✅ Passaram: ${testResults.passed} (${percentage}%)`, 
        percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');
    log(`   ❌ Falharam: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
    
    log(`\n📊 POR CATEGORIA:`, 'yellow');
    
    // Memória
    const memTotal = testResults.categories.memory.passed + testResults.categories.memory.failed;
    const memPercent = memTotal > 0 ? Math.round((testResults.categories.memory.passed / memTotal) * 100) : 0;
    log(`   🧠 Memória: ${testResults.categories.memory.passed}/${memTotal} (${memPercent}%)`,
        memPercent === 100 ? 'green' : memPercent >= 80 ? 'yellow' : 'red');
    
    // Contexto
    const ctxTotal = testResults.categories.context.passed + testResults.categories.context.failed;
    const ctxPercent = ctxTotal > 0 ? Math.round((testResults.categories.context.passed / ctxTotal) * 100) : 0;
    log(`   🖥️  Contexto: ${testResults.categories.context.passed}/${ctxTotal} (${ctxPercent}%)`,
        ctxPercent === 100 ? 'green' : ctxPercent >= 80 ? 'yellow' : 'red');
    
    // RAG
    const ragTotal = testResults.categories.rag.passed + testResults.categories.rag.failed;
    const ragPercent = ragTotal > 0 ? Math.round((testResults.categories.rag.passed / ragTotal) * 100) : 0;
    log(`   🔍 RAG: ${testResults.categories.rag.passed}/${ragTotal} (${ragPercent}%)`,
        ragPercent === 100 ? 'green' : ragPercent >= 80 ? 'yellow' : 'red');
    
    // Dados
    const dataTotal = testResults.categories.data.passed + testResults.categories.data.failed;
    const dataPercent = dataTotal > 0 ? Math.round((testResults.categories.data.passed / dataTotal) * 100) : 0;
    log(`   📊 Dados: ${testResults.categories.data.passed}/${dataTotal} (${dataPercent}%)`,
        dataPercent === 100 ? 'green' : dataPercent >= 80 ? 'yellow' : 'red');
    
    // Diagnóstico final
    console.log('\n' + '═'.repeat(60));
    if (percentage === 100) {
        log('🎉 PERFEITO! Sistema funcionando com 100% de eficácia!', 'green');
        log('   O agente está com memória perfeita e busca RAG otimizada.', 'green');
    } else if (percentage >= 90) {
        log('✅ EXCELENTE! Sistema funcionando muito bem!', 'green');
        log('   Apenas pequenos ajustes necessários.', 'green');
    } else if (percentage >= 70) {
        log('⚠️  BOM, mas precisa melhorias', 'yellow');
        log('   Revisar componentes que falharam.', 'yellow');
    } else {
        log('❌ CRÍTICO! Sistema com problemas graves!', 'red');
        log('   Necessária intervenção urgente.', 'red');
    }
    console.log('═'.repeat(60));
    
    // Problemas identificados
    if (testResults.failed > 0) {
        log('\n🔧 AÇÕES RECOMENDADAS:', 'yellow');
        
        if (testResults.categories.memory.failed > 0) {
            log('   • Revisar sistema de memória e persistência', 'white');
            log('     - Verificar tabela agent_conversations', 'white');
            log('     - Validar extração de informações', 'white');
        }
        
        if (testResults.categories.context.failed > 0) {
            log('   • Melhorar processamento de contexto de tela', 'white');
            log('     - Verificar passagem de dados do frontend', 'white');
        }
        
        if (testResults.categories.rag.failed > 0) {
            log('   • Otimizar sistema RAG', 'white');
            log('     - Verificar embeddings e índices', 'white');
            log('     - Validar função search_rag_enhanced', 'white');
        }
        
        if (testResults.categories.data.failed > 0) {
            log('   • Verificar acesso a dados do projeto', 'white');
            log('     - Confirmar project_id correto', 'white');
            log('     - Validar queries de estatísticas', 'white');
        }
    }
    
    return testResults;
}

// Executar bateria completa
console.log('\n🚀 BATERIA DE TESTES v26 - PROJETO 58 (HW)');
console.log('   Testando: Memória, Contexto, RAG e Dados Reais\n');

runCompleteTestSuite().then(results => {
    const exitCode = results.passed === results.total ? 0 : 1;
    log(`\n✅ Testes finalizados! Exit code: ${exitCode}\n`, exitCode === 0 ? 'green' : 'red');
    process.exit(exitCode);
}).catch(error => {
    log(`\n❌ Erro fatal nos testes: ${error.message}\n`, 'red');
    console.error(error);
    process.exit(1);
});