// Script Completo de Teste do Agente Liftlio
// Versão 2.0 - Com autenticação correta e testes mais robustos

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Projeto de teste real (substitua pelo seu projeto de teste)
const TEST_PROJECT_ID = 'cm1xvhpul000gbt1ftpdmuj8f';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_SESSION_ID = 'test-session-' + Date.now();

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

// Helper para logs coloridos
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Sistema de pontuação
class TestScore {
    constructor() {
        this.tests = [];
        this.categories = {
            memory: { passed: 0, failed: 0, tests: [] },
            context: { passed: 0, failed: 0, tests: [] },
            data: { passed: 0, failed: 0, tests: [] },
            performance: { passed: 0, failed: 0, tests: [] }
        };
    }

    addTest(category, name, passed, details = {}) {
        const test = {
            category,
            name,
            passed,
            timestamp: new Date().toISOString(),
            ...details
        };
        
        this.tests.push(test);
        this.categories[category].tests.push(test);
        
        if (passed) {
            this.categories[category].passed++;
        } else {
            this.categories[category].failed++;
        }
    }

    generateReport() {
        log('\n📊 RELATÓRIO DETALHADO DO DIAGNÓSTICO', 'magenta');
        log('═══════════════════════════════════════', 'magenta');
        
        let totalPassed = 0;
        let totalFailed = 0;

        Object.entries(this.categories).forEach(([category, data]) => {
            const total = data.passed + data.failed;
            if (total === 0) return;
            
            totalPassed += data.passed;
            totalFailed += data.failed;
            
            const percentage = Math.round((data.passed / total) * 100);
            const color = percentage === 100 ? 'green' : percentage >= 75 ? 'yellow' : 'red';
            
            log(`\n${this.getCategoryEmoji(category)} ${category.toUpperCase()}: ${data.passed}/${total} (${percentage}%)`, color);
            
            // Mostrar detalhes dos testes que falharam
            data.tests.filter(t => !t.passed).forEach(test => {
                log(`   ❌ ${test.name}`, 'red');
                if (test.error) {
                    log(`      → ${test.error}`, 'red');
                }
            });
            
            // Mostrar sucessos resumidos
            const passedTests = data.tests.filter(t => t.passed);
            if (passedTests.length > 0) {
                log(`   ✅ ${passedTests.length} testes passaram com sucesso`, 'green');
            }
        });

        const totalTests = totalPassed + totalFailed;
        const totalPercentage = Math.round((totalPassed / totalTests) * 100);
        
        log(`\n📈 RESULTADO FINAL: ${totalPassed}/${totalTests} (${totalPercentage}%)`, 
            totalPercentage === 100 ? 'green' : totalPercentage >= 75 ? 'yellow' : 'red');
        
        // Recomendações
        this.generateRecommendations();
    }

    getCategoryEmoji(category) {
        const emojis = {
            memory: '🧠',
            context: '🖥️',
            data: '📊',
            performance: '⚡'
        };
        return emojis[category] || '📋';
    }

    generateRecommendations() {
        log('\n🔧 RECOMENDAÇÕES DE MELHORIA', 'cyan');
        log('─────────────────────────────', 'cyan');
        
        const recommendations = [];
        
        // Análise por categoria
        if (this.categories.memory.failed > 0) {
            recommendations.push({
                priority: 'ALTA',
                area: 'Memória',
                actions: [
                    'Implementar tabela agent_conversations com histórico completo',
                    'Adicionar resumo automático para conversas longas',
                    'Criar índices para busca rápida de histórico'
                ]
            });
        }
        
        if (this.categories.context.failed > 0) {
            recommendations.push({
                priority: 'ALTA',
                area: 'Contexto',
                actions: [
                    'Capturar contexto da tela no frontend (FloatingAgent.tsx)',
                    'Enviar dados visíveis com cada mensagem',
                    'Processar contexto no prompt do Claude'
                ]
            });
        }
        
        if (this.categories.data.failed > 0) {
            recommendations.push({
                priority: 'MÉDIA',
                area: 'Busca de Dados',
                actions: [
                    'Otimizar função search_rag_enhanced',
                    'Implementar cache por projeto/usuário',
                    'Adicionar fallbacks para dados não encontrados'
                ]
            });
        }
        
        if (this.categories.performance.failed > 0) {
            recommendations.push({
                priority: 'BAIXA',
                area: 'Performance',
                actions: [
                    'Implementar streaming de respostas',
                    'Otimizar queries do banco',
                    'Adicionar cache Redis'
                ]
            });
        }
        
        recommendations.forEach(rec => {
            log(`\n🎯 ${rec.area} (Prioridade: ${rec.priority})`, rec.priority === 'ALTA' ? 'red' : 'yellow');
            rec.actions.forEach(action => {
                log(`   • ${action}`, 'white');
            });
        });
    }
}

// Função melhorada para testar o agente
async function testAgent(message, options = {}) {
    const {
        context = {},
        expectedInResponse = [],
        measurePerformance = true,
        timeout = 30000
    } = options;
    
    const startTime = Date.now();
    
    try {
        log(`\n📤 Teste: "${message}"`, 'blue');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-session-id': TEST_SESSION_ID,
                'x-project-id': TEST_PROJECT_ID
            },
            body: JSON.stringify({
                prompt: message,  // Mudança: prompt em vez de message
                context,
                userId: TEST_USER_ID,
                projectId: TEST_PROJECT_ID,
                sessionId: TEST_SESSION_ID
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${errorData.error || errorData.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.response) {
            log(`📥 Resposta (${elapsed}ms): ${data.response.substring(0, 150)}...`, 'green');
            
            // Verificar conteúdo esperado
            const results = {
                success: true,
                response: data.response,
                elapsed,
                expectedResults: {}
            };
            
            for (const expected of expectedInResponse) {
                const found = data.response.toLowerCase().includes(expected.toLowerCase());
                results.expectedResults[expected] = found;
                
                if (found) {
                    log(`   ✅ Encontrou: "${expected}"`, 'green');
                } else {
                    log(`   ❌ Não encontrou: "${expected}"`, 'red');
                }
            }
            
            results.allExpectedFound = Object.values(results.expectedResults).every(v => v);
            
            // Verificar performance
            if (measurePerformance && elapsed > 3000) {
                log(`   ⚠️  Performance: ${elapsed}ms (ideal < 3000ms)`, 'yellow');
            }
            
            return results;
        } else {
            throw new Error('Resposta vazia do agente');
        }
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        log(`❌ Erro (${elapsed}ms): ${error.message}`, 'red');
        return {
            success: false,
            error: error.message,
            elapsed
        };
    }
}

// Suite completa de testes
async function runCompleteDiagnostics() {
    log('\n🚀 DIAGNÓSTICO COMPLETO DO AGENTE LIFTLIO v2.0', 'magenta');
    log('═══════════════════════════════════════════════', 'magenta');
    
    const score = new TestScore();
    
    // Teste de conectividade básica
    log('\n🔌 TESTE DE CONECTIVIDADE', 'cyan');
    const connectivity = await testAgent('Olá', {
        expectedInResponse: [],
        measurePerformance: true
    });
    
    score.addTest('performance', 'Conectividade básica', connectivity.success, {
        elapsed: connectivity.elapsed,
        error: connectivity.error
    });
    
    if (!connectivity.success) {
        log('\n❌ ERRO CRÍTICO: Não foi possível conectar ao agente!', 'red');
        log('Verifique:', 'yellow');
        log('1. Se a Edge Function está deployada', 'yellow');
        log('2. Se as credenciais estão corretas', 'yellow');
        log('3. Se o projeto existe e está ativo', 'yellow');
        return;
    }
    
    // BATERIA 1: TESTES DE MEMÓRIA
    log('\n🧠 BATERIA 1: TESTES DE MEMÓRIA', 'yellow');
    
    // 1.1 Memória de curto prazo
    await testAgent('Meu nome é João Silva e trabalho na empresa TechCorp');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const memoryTest1 = await testAgent('Qual é meu nome completo?', {
        expectedInResponse: ['João', 'Silva']
    });
    score.addTest('memory', 'Memória de nome completo', 
        memoryTest1.allExpectedFound, memoryTest1);
    
    // 1.2 Memória de contexto
    const memoryTest2 = await testAgent('Onde eu trabalho?', {
        expectedInResponse: ['TechCorp']
    });
    score.addTest('memory', 'Memória de contexto profissional', 
        memoryTest2.allExpectedFound, memoryTest2);
    
    // 1.3 Memória de múltiplas informações
    await testAgent('Estou analisando a campanha de Black Friday que teve 5000 menções');
    await testAgent('O sentimento geral foi 92% positivo');
    await testAgent('O alcance total foi de 2.5 milhões de pessoas');
    
    const memoryTest3 = await testAgent('Resuma o que conversamos sobre a campanha', {
        expectedInResponse: ['Black Friday', 'menções', 'sentimento']
    });
    score.addTest('memory', 'Memória de conversa complexa', 
        memoryTest3.allExpectedFound, memoryTest3);
    
    // BATERIA 2: TESTES DE CONTEXTO
    log('\n🖥️ BATERIA 2: TESTES DE CONTEXTO DE TELA', 'yellow');
    
    // 2.1 Contexto de página
    const contextTest1 = await testAgent('O que estou vendo?', {
        context: {
            currentPage: 'dashboard',
            visibleData: {
                totalMentions: 3500,
                sentimentScore: 87,
                reach: 250000,
                topVideos: ['Video A', 'Video B']
            }
        },
        expectedInResponse: ['dashboard', 'menções']
    });
    score.addTest('context', 'Identificação de página atual', 
        contextTest1.allExpectedFound, contextTest1);
    
    // 2.2 Contexto de dados visíveis
    const contextTest2 = await testAgent('Qual o sentimento atual?', {
        context: {
            currentPage: 'mentions',
            visibleData: {
                sentimentScore: 87,
                positiveCount: 3045,
                negativeCount: 455
            }
        },
        expectedInResponse: ['87', 'positiv']
    });
    score.addTest('context', 'Leitura de dados visíveis', 
        contextTest2.allExpectedFound, contextTest2);
    
    // BATERIA 3: TESTES DE BUSCA DE DADOS (RAG)
    log('\n📊 BATERIA 3: TESTES DE BUSCA DE DADOS (RAG)', 'yellow');
    
    // 3.1 Busca simples
    const dataTest1 = await testAgent('Quantas menções temos registradas?', {
        expectedInResponse: ['menç']
    });
    score.addTest('data', 'Busca de métricas gerais', 
        dataTest1.success && /\d+/.test(dataTest1.response), dataTest1);
    
    // 3.2 Busca com filtro temporal
    const dataTest2 = await testAgent('Como foi o desempenho na última semana?', {
        expectedInResponse: ['semana', 'período']
    });
    score.addTest('data', 'Busca com contexto temporal', 
        dataTest2.success, dataTest2);
    
    // 3.3 Busca correlacionada
    const dataTest3 = await testAgent('Qual vídeo teve mais menções positivas?', {
        expectedInResponse: ['vídeo', 'menç']
    });
    score.addTest('data', 'Busca correlacionada complexa', 
        dataTest3.success, dataTest3);
    
    // BATERIA 4: TESTES DE PERFORMANCE
    log('\n⚡ BATERIA 4: TESTES DE PERFORMANCE', 'yellow');
    
    // 4.1 Resposta rápida
    const perfTest1 = await testAgent('Oi', {
        measurePerformance: true
    });
    score.addTest('performance', 'Resposta simples < 2s', 
        perfTest1.elapsed < 2000, { elapsed: perfTest1.elapsed });
    
    // 4.2 Busca complexa
    const perfTest2 = await testAgent('Mostre um resumo completo das métricas', {
        measurePerformance: true
    });
    score.addTest('performance', 'Busca complexa < 5s', 
        perfTest2.elapsed < 5000, { elapsed: perfTest2.elapsed });
    
    // BATERIA 5: TESTES DE INTEGRAÇÃO
    log('\n🔗 BATERIA 5: TESTES DE INTEGRAÇÃO', 'yellow');
    
    // 5.1 Fluxo completo
    await testAgent('Vou analisar o vídeo XYZ123');
    const integrationTest1 = await testAgent('Mostre as métricas deste vídeo', {
        context: {
            currentVideoId: 'XYZ123'
        },
        expectedInResponse: ['vídeo', 'métrica']
    });
    score.addTest('memory', 'Fluxo completo com contexto', 
        integrationTest1.success, integrationTest1);
    
    // Gerar relatório final
    await new Promise(resolve => setTimeout(resolve, 1000));
    score.generateReport();
}

// Executar diagnóstico
console.log('🏁 Iniciando diagnóstico completo...\n');
runCompleteDiagnostics().then(() => {
    log('\n✅ Diagnóstico finalizado!\n', 'green');
    process.exit(0);
}).catch(error => {
    log(`\n❌ Erro fatal: ${error.message}\n`, 'red');
    process.exit(1);
});