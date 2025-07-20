// Script de Diagnóstico do Agente Liftlio
// Testa: Memória, Contexto e Busca de Dados

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwMjEwMTQsImV4cCI6MjAzMDU5NzAxNH0.gaGKhRizUp4t0s2Gw0QxJhs4gyAk0zxfHCoF4IrhW6U';

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

// Helper para logs coloridos
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Função para testar o agente
async function testAgent(message, context = {}, expectedInResponse = []) {
    try {
        log(`\n📤 Enviando: "${message}"`, 'blue');
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-session-id': 'test-session-123',
                'x-project-id': 'cm1xvhpul000gbt1ftpdmuj8f' // Projeto de teste
            },
            body: JSON.stringify({
                message,
                context,
                userId: 'test-user-123',
                projectId: 'cm1xvhpul000gbt1ftpdmuj8f',
                sessionId: 'test-session-123'
            })
        });

        const data = await response.json();
        
        if (data.response) {
            log(`📥 Resposta: ${data.response}`, 'green');
            
            // Verificar se contém o esperado
            let allFound = true;
            for (const expected of expectedInResponse) {
                if (!data.response.toLowerCase().includes(expected.toLowerCase())) {
                    log(`   ❌ Não encontrou: "${expected}"`, 'red');
                    allFound = false;
                } else {
                    log(`   ✅ Encontrou: "${expected}"`, 'green');
                }
            }
            
            return {
                success: true,
                response: data.response,
                allExpectedFound: allFound,
                metadata: data.metadata
            };
        } else {
            log(`❌ Erro na resposta: ${JSON.stringify(data)}`, 'red');
            return { success: false, error: data };
        }
    } catch (error) {
        log(`❌ Erro na requisição: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

// Suite de testes
async function runDiagnostics() {
    log('\n🔍 INICIANDO DIAGNÓSTICO DO AGENTE LIFTLIO\n', 'magenta');
    
    const results = {
        memory: { passed: 0, failed: 0 },
        context: { passed: 0, failed: 0 },
        data: { passed: 0, failed: 0 }
    };

    // TESTE 1: Memória Básica
    log('\n📝 TESTE 1: MEMÓRIA BÁSICA', 'yellow');
    
    // 1.1 Apresentação
    let test1 = await testAgent(
        "Olá, meu nome é João e trabalho com marketing digital",
        {},
        []
    );
    
    // 1.2 Verificar se lembra
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
    
    let test2 = await testAgent(
        "Qual é meu nome?",
        {},
        ["João"]
    );
    
    if (test2.allExpectedFound) {
        results.memory.passed++;
        log('✅ Memória funcionando: Lembrou do nome', 'green');
    } else {
        results.memory.failed++;
        log('❌ Memória falhou: Não lembrou do nome', 'red');
    }

    // TESTE 2: Contexto de Tela
    log('\n🖥️ TESTE 2: CONTEXTO DE TELA', 'yellow');
    
    let test3 = await testAgent(
        "O que estou vendo agora?",
        {
            currentPage: 'overview',
            visibleData: {
                totalMentions: 2847,
                sentimentScore: 89,
                reach: 156000
            }
        },
        ["menções", "2847"] // Espera mencionar os dados
    );
    
    if (test3.allExpectedFound) {
        results.context.passed++;
        log('✅ Contexto funcionando: Identificou dados da tela', 'green');
    } else {
        results.context.failed++;
        log('❌ Contexto falhou: Não identificou dados da tela', 'red');
    }

    // TESTE 3: Busca de Dados RAG
    log('\n📊 TESTE 3: BUSCA DE DADOS (RAG)', 'yellow');
    
    let test4 = await testAgent(
        "Quantas menções temos no total?",
        {},
        ["menç"] // Deve buscar dados reais
    );
    
    if (test4.success && test4.response.match(/\d+/)) {
        results.data.passed++;
        log('✅ RAG funcionando: Encontrou dados numéricos', 'green');
    } else {
        results.data.failed++;
        log('❌ RAG falhou: Não retornou dados específicos', 'red');
    }

    // TESTE 4: Memória de Conversa Longa
    log('\n💬 TESTE 4: MEMÓRIA DE CONVERSA LONGA', 'yellow');
    
    // Criar contexto
    await testAgent("Estou analisando a campanha de Natal");
    await testAgent("O sentimento está em 85% positivo");
    await testAgent("Tivemos um pico de menções ontem");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let test5 = await testAgent(
        "Sobre o que estávamos conversando?",
        {},
        ["campanha", "Natal"]
    );
    
    if (test5.allExpectedFound) {
        results.memory.passed++;
        log('✅ Memória longa funcionando: Lembrou do contexto', 'green');
    } else {
        results.memory.failed++;
        log('❌ Memória longa falhou: Perdeu contexto da conversa', 'red');
    }

    // TESTE 5: Dados Específicos do Projeto
    log('\n🎯 TESTE 5: DADOS ESPECÍFICOS DO PROJETO', 'yellow');
    
    let test6 = await testAgent(
        "Mostre as métricas principais do meu projeto",
        {},
        [] // Deve retornar dados do projeto
    );
    
    if (test6.success && test6.response.length > 100) {
        results.data.passed++;
        log('✅ Dados do projeto: Retornou informações detalhadas', 'green');
    } else {
        results.data.failed++;
        log('❌ Dados do projeto: Resposta genérica ou vazia', 'red');
    }

    // RELATÓRIO FINAL
    log('\n📊 RELATÓRIO FINAL DO DIAGNÓSTICO', 'magenta');
    log('═══════════════════════════════════', 'magenta');
    
    const total = {
        passed: results.memory.passed + results.context.passed + results.data.passed,
        failed: results.memory.failed + results.context.failed + results.data.failed
    };
    
    log(`\n📝 Memória: ${results.memory.passed}/${results.memory.passed + results.memory.failed} testes passaram`, 
        results.memory.failed === 0 ? 'green' : 'yellow');
    
    log(`🖥️  Contexto: ${results.context.passed}/${results.context.passed + results.context.failed} testes passaram`, 
        results.context.failed === 0 ? 'green' : 'yellow');
    
    log(`📊 Dados: ${results.data.passed}/${results.data.passed + results.data.failed} testes passaram`, 
        results.data.failed === 0 ? 'green' : 'yellow');
    
    log(`\n✅ Total: ${total.passed}/${total.passed + total.failed} testes passaram`, 
        total.failed === 0 ? 'green' : 'red');
    
    if (total.failed > 0) {
        log('\n⚠️  AÇÃO NECESSÁRIA: O agente precisa de melhorias!', 'red');
        
        // Sugestões baseadas nos resultados
        if (results.memory.failed > 0) {
            log('\n🔧 Memória: Implementar sistema de conversação persistente', 'yellow');
        }
        if (results.context.failed > 0) {
            log('🔧 Contexto: Melhorar captura e processamento de contexto de tela', 'yellow');
        }
        if (results.data.failed > 0) {
            log('🔧 Dados: Otimizar busca RAG e integração com banco', 'yellow');
        }
    } else {
        log('\n🎉 SUCESSO: Agente funcionando perfeitamente!', 'green');
    }
}

// Executar diagnóstico
console.log('🚀 Executando diagnóstico do Agente Liftlio...\n');
runDiagnostics().then(() => {
    log('\n✅ Diagnóstico concluído!\n', 'green');
}).catch(error => {
    log(`\n❌ Erro fatal no diagnóstico: ${error.message}\n`, 'red');
});