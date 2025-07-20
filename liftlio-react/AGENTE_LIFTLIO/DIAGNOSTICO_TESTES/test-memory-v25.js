// Teste específico de memória para v25
// Valida se o agente mantém contexto completo

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Configuração única para todos os testes
const TEST_SESSION_ID = 'memory-test-' + Date.now();
const TEST_USER_ID = 'memory-user-' + Date.now();
const TEST_PROJECT_ID = 'cm1xvhpul000gbt1ftpdmuj8f';

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAgentMemory(message, options = {}) {
    const {
        context = {},
        expectedInResponse = [],
        testName = 'Teste'
    } = options;
    
    log(`\n📤 ${testName}: "${message}"`, 'blue');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                prompt: message,
                context,
                userId: TEST_USER_ID,
                projectId: TEST_PROJECT_ID,
                sessionId: TEST_SESSION_ID
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        
        if (data.response) {
            log(`📥 Resposta: ${data.response.substring(0, 200)}...`, 'green');
            
            // Verificar conteúdo esperado
            let allFound = true;
            const results = {};
            
            for (const expected of expectedInResponse) {
                const found = data.response.toLowerCase().includes(expected.toLowerCase());
                results[expected] = found;
                
                if (found) {
                    log(`   ✅ Encontrou: "${expected}"`, 'green');
                } else {
                    log(`   ❌ NÃO encontrou: "${expected}"`, 'red');
                    allFound = false;
                }
            }
            
            return {
                success: true,
                response: data.response,
                allExpectedFound: allFound,
                results,
                metadata: data.metadata
            };
        }
        
        throw new Error('Resposta vazia do agente');
        
    } catch (error) {
        log(`❌ Erro: ${error.message}`, 'red');
        return {
            success: false,
            error: error.message
        };
    }
}

async function runMemoryTests() {
    log('\n🧠 TESTE COMPLETO DE MEMÓRIA v25', 'magenta');
    log('═══════════════════════════════════', 'magenta');
    log(`SessionID: ${TEST_SESSION_ID}`, 'cyan');
    log(`UserID: ${TEST_USER_ID}`, 'cyan');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    // CENÁRIO 1: Informações Pessoais
    log('\n📋 CENÁRIO 1: INFORMAÇÕES PESSOAIS', 'yellow');
    
    // 1.1 Apresentação completa
    await testAgentMemory(
        "Olá! Meu nome é João Silva, trabalho na empresa TechCorp como gerente de marketing. Estou analisando nossa campanha de Black Friday.",
        { testName: 'Apresentação' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1.2 Verificar nome
    const test1 = await testAgentMemory(
        "Qual é meu nome completo?",
        {
            expectedInResponse: ['João', 'Silva'],
            testName: 'Lembrar Nome'
        }
    );
    
    if (test1.allExpectedFound) {
        results.passed++;
        log('✅ PASSOU: Lembrou do nome completo', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Não lembrou do nome completo', 'red');
    }
    results.tests.push({ name: 'Lembrar Nome', ...test1 });
    
    // 1.3 Verificar empresa
    const test2 = await testAgentMemory(
        "Onde eu trabalho?",
        {
            expectedInResponse: ['TechCorp'],
            testName: 'Lembrar Empresa'
        }
    );
    
    if (test2.allExpectedFound) {
        results.passed++;
        log('✅ PASSOU: Lembrou da empresa', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Não lembrou da empresa', 'red');
    }
    results.tests.push({ name: 'Lembrar Empresa', ...test2 });
    
    // 1.4 Verificar cargo
    const test3 = await testAgentMemory(
        "Qual é meu cargo?",
        {
            expectedInResponse: ['gerente', 'marketing'],
            testName: 'Lembrar Cargo'
        }
    );
    
    if (test3.allExpectedFound) {
        results.passed++;
        log('✅ PASSOU: Lembrou do cargo', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Não lembrou do cargo', 'red');
    }
    results.tests.push({ name: 'Lembrar Cargo', ...test3 });
    
    // CENÁRIO 2: Contexto de Tela
    log('\n📋 CENÁRIO 2: CONTEXTO DE TELA', 'yellow');
    
    // 2.1 Dados visíveis
    const test4 = await testAgentMemory(
        "Qual o sentimento atual que estou vendo?",
        {
            context: {
                currentPage: 'dashboard',
                visibleData: {
                    sentimentScore: 87,
                    totalMentions: 3500,
                    positiveCount: 3045,
                    negativeCount: 455
                }
            },
            expectedInResponse: ['87'],
            testName: 'Contexto de Tela'
        }
    );
    
    if (test4.allExpectedFound) {
        results.passed++;
        log('✅ PASSOU: Identificou dados da tela', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Não identificou dados da tela', 'red');
    }
    results.tests.push({ name: 'Contexto de Tela', ...test4 });
    
    // CENÁRIO 3: Memória de Múltiplas Informações
    log('\n📋 CENÁRIO 3: MÚLTIPLAS INFORMAÇÕES', 'yellow');
    
    // 3.1 Adicionar várias informações
    await testAgentMemory(
        "A campanha teve 5000 menções no total",
        { testName: 'Info 1' }
    );
    
    await testAgentMemory(
        "O vídeo principal teve 2 milhões de visualizações",
        { testName: 'Info 2' }
    );
    
    await testAgentMemory(
        "O influenciador principal foi Pedro Henrique",
        { testName: 'Info 3' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3.2 Verificar se lembra de tudo
    const test5 = await testAgentMemory(
        "Faça um resumo completo do que conversamos sobre a campanha",
        {
            expectedInResponse: ['Black Friday', 'TechCorp', '5000', 'menções', 'Pedro', 'vídeo'],
            testName: 'Resumo Completo'
        }
    );
    
    if (test5.results && Object.values(test5.results).filter(v => v).length >= 4) {
        results.passed++;
        log('✅ PASSOU: Lembrou da maioria das informações', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Esqueceu informações importantes', 'red');
    }
    results.tests.push({ name: 'Resumo Completo', ...test5 });
    
    // CENÁRIO 4: Memória Após Várias Interações
    log('\n📋 CENÁRIO 4: PERSISTÊNCIA DE MEMÓRIA', 'yellow');
    
    // 4.1 Fazer 5 perguntas diferentes
    await testAgentMemory("Como está o tempo hoje?", { testName: 'Pergunta aleatória 1' });
    await testAgentMemory("Quais são as funcionalidades do Liftlio?", { testName: 'Pergunta aleatória 2' });
    await testAgentMemory("Como funciona o monitoramento?", { testName: 'Pergunta aleatória 3' });
    
    // 4.2 Verificar se ainda lembra do início
    const test6 = await testAgentMemory(
        "Você ainda lembra meu nome e onde trabalho?",
        {
            expectedInResponse: ['João', 'Silva', 'TechCorp'],
            testName: 'Memória de Longo Prazo'
        }
    );
    
    if (test6.allExpectedFound) {
        results.passed++;
        log('✅ PASSOU: Manteve memória após várias interações', 'green');
    } else {
        results.failed++;
        log('❌ FALHOU: Perdeu memória após múltiplas interações', 'red');
    }
    results.tests.push({ name: 'Memória de Longo Prazo', ...test6 });
    
    // RELATÓRIO FINAL
    log('\n📊 RELATÓRIO FINAL DE MEMÓRIA', 'magenta');
    log('═══════════════════════════════', 'magenta');
    
    const totalTests = results.passed + results.failed;
    const percentage = Math.round((results.passed / totalTests) * 100);
    
    log(`\n✅ Testes passados: ${results.passed}/${totalTests} (${percentage}%)`, 
        percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
    
    if (results.failed > 0) {
        log('\n❌ Testes que falharam:', 'red');
        results.tests.filter(t => !t.allExpectedFound).forEach(test => {
            log(`   - ${test.name}`, 'red');
            if (test.results) {
                Object.entries(test.results).forEach(([key, value]) => {
                    if (!value) {
                        log(`     → Não encontrou: "${key}"`, 'red');
                    }
                });
            }
        });
    }
    
    // Verificar metadados
    const lastTest = results.tests[results.tests.length - 1];
    if (lastTest.metadata) {
        log('\n📈 Metadados da última resposta:', 'cyan');
        log(`   - Itens de memória: ${lastTest.metadata.memoryItems || 0}`, 'cyan');
        log(`   - Tem info do usuário: ${lastTest.metadata.hasUserInfo ? 'Sim' : 'Não'}`, 'cyan');
    }
    
    if (percentage === 100) {
        log('\n🎉 SUCESSO TOTAL: Memória funcionando perfeitamente!', 'green');
    } else if (percentage >= 80) {
        log('\n⚠️  BOM: Memória funcional mas com pequenas falhas', 'yellow');
    } else {
        log('\n❌ CRÍTICO: Memória com problemas graves!', 'red');
    }
    
    return {
        passed: results.passed,
        failed: results.failed,
        percentage,
        tests: results.tests
    };
}

// Executar teste
console.log('🚀 Iniciando teste de memória v25...\n');
runMemoryTests().then(results => {
    log('\n✅ Teste finalizado!\n', 'green');
    process.exit(results.percentage === 100 ? 0 : 1);
}).catch(error => {
    log(`\n❌ Erro fatal: ${error.message}\n`, 'red');
    process.exit(1);
});