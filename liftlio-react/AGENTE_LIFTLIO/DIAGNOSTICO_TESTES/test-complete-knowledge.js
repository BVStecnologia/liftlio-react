// 🧠 TESTE COMPLETO DE CONHECIMENTO - PROJETO 58
// Testa se o agente consegue acessar dados de TODAS as tabelas

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

const PROJECT_ID = '58';
const TEST_SESSION = 'knowledge-test-' + Date.now();

// Dados conhecidos do projeto 58
const KNOWN_DATA = {
    'Settings_messages_posts': { count: 228, description: 'mensagens agendadas' },
    'Mensagens': { count: 222, description: 'menções e sentimentos' },
    'Comentarios_Principais': { count: 202, description: 'comentários principais' },
    'Respostas_Comentarios': { count: 167, description: 'respostas a comentários' },
    'agent_conversations': { count: 62, description: 'conversas do agente' },
    'Videos': { count: 48, description: 'vídeos monitorados' },
    'Projeto': { count: 1, description: 'dados do projeto HW' }
};

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

async function testAgentKnowledge(prompt, expectedContext) {
    log(`\n🔍 Teste: "${prompt}"`, 'yellow');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                prompt,
                context: {
                    currentProject: {
                        id: PROJECT_ID,
                        name: 'HW'
                    }
                },
                sessionId: TEST_SESSION
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.metadata) {
            log(`   RAG ativado: ${data.metadata.ragSearched ? 'Sim' : 'Não'}`, 'cyan');
            log(`   Resultados RAG: ${data.metadata.ragResults || 0}`, 'cyan');
            
            // Verificar se a resposta contém o contexto esperado
            let found = false;
            for (const expected of expectedContext) {
                if (data.response.toLowerCase().includes(expected.toLowerCase())) {
                    found = true;
                    log(`   ✅ Encontrou: "${expected}"`, 'green');
                }
            }
            
            if (!found) {
                log(`   ❌ Não encontrou contexto esperado`, 'red');
                log(`   Resposta: "${data.response.substring(0, 200)}..."`, 'white');
            }
            
            return {
                success: found,
                ragResults: data.metadata.ragResults || 0,
                response: data.response
            };
        }
        
        return { success: false };
        
    } catch (error) {
        log(`   ❌ Erro: ${error.message}`, 'red');
        return { success: false };
    }
}

async function runCompleteTest() {
    log('\n🧠 TESTE COMPLETO DE CONHECIMENTO - PROJETO 58', 'magenta');
    log('═══════════════════════════════════════════════', 'magenta');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        byTable: {}
    };
    
    // CATEGORIA 1: MENSAGENS AGENDADAS (228 registros)
    log('\n📅 CATEGORIA 1: MENSAGENS AGENDADAS', 'cyan');
    
    const test1 = await testAgentKnowledge(
        "Quantas mensagens agendadas existem no projeto?",
        ['228', 'agendad', 'scheduled']
    );
    results.total++;
    if (test1.success) results.passed++; else results.failed++;
    
    const test2 = await testAgentKnowledge(
        "Tem alguma mensagem agendada para hoje ou próximos dias?",
        ['agendad', 'próxim', 'scheduled']
    );
    results.total++;
    if (test2.success) results.passed++; else results.failed++;
    
    // CATEGORIA 2: MENÇÕES (222 registros)
    log('\n💬 CATEGORIA 2: MENÇÕES E SENTIMENTOS', 'cyan');
    
    const test3 = await testAgentKnowledge(
        "Qual o total de menções do projeto HW?",
        ['222', 'menç', 'mention']
    );
    results.total++;
    if (test3.success) results.passed++; else results.failed++;
    
    const test4 = await testAgentKnowledge(
        "Me mostre algumas menções recentes com sentimento positivo",
        ['positiv', 'sentiment', 'menç']
    );
    results.total++;
    if (test4.success) results.passed++; else results.failed++;
    
    // CATEGORIA 3: COMENTÁRIOS (202 registros)
    log('\n💭 CATEGORIA 3: COMENTÁRIOS PRINCIPAIS', 'cyan');
    
    const test5 = await testAgentKnowledge(
        "Quantos comentários principais temos registrados?",
        ['202', 'comentário', 'comment']
    );
    results.total++;
    if (test5.success) results.passed++; else results.failed++;
    
    // CATEGORIA 4: VÍDEOS (48 registros)
    log('\n🎥 CATEGORIA 4: VÍDEOS MONITORADOS', 'cyan');
    
    const test6 = await testAgentKnowledge(
        "Quantos vídeos estão sendo monitorados no projeto?",
        ['48', 'vídeo', 'video']
    );
    results.total++;
    if (test6.success) results.passed++; else results.failed++;
    
    const test7 = await testAgentKnowledge(
        "Quais são os vídeos com mais visualizações?",
        ['visualiz', 'view', 'vídeo']
    );
    results.total++;
    if (test7.success) results.passed++; else results.failed++;
    
    // CATEGORIA 5: CONVERSAS DO AGENTE (62 registros)
    log('\n🤖 CATEGORIA 5: HISTÓRICO DE CONVERSAS', 'cyan');
    
    const test8 = await testAgentKnowledge(
        "Quantas conversas já tivemos no total?",
        ['62', 'conversa', 'conversation', 'histórico']
    );
    results.total++;
    if (test8.success) results.passed++; else results.failed++;
    
    // CATEGORIA 6: RESPOSTAS (167 registros)
    log('\n↩️ CATEGORIA 6: RESPOSTAS A COMENTÁRIOS', 'cyan');
    
    const test9 = await testAgentKnowledge(
        "Quantas respostas foram dadas aos comentários?",
        ['167', 'resposta', 'reply', 'respost']
    );
    results.total++;
    if (test9.success) results.passed++; else results.failed++;
    
    // CATEGORIA 7: DADOS DO PROJETO
    log('\n📊 CATEGORIA 7: INFORMAÇÕES GERAIS', 'cyan');
    
    const test10 = await testAgentKnowledge(
        "Me dê um resumo completo com TODOS os números do projeto HW",
        ['228', '222', '202', '167', '48']
    );
    results.total++;
    if (test10.ragResults > 10) results.passed++; else results.failed++;
    
    // TESTE ESPECIAL: Perguntas complexas
    log('\n🎯 TESTES ESPECIAIS: PERGUNTAS COMPLEXAS', 'cyan');
    
    const test11 = await testAgentKnowledge(
        "Qual a proporção entre menções (222) e respostas (167)?",
        ['222', '167', 'proporção', 'menç', 'respost']
    );
    results.total++;
    if (test11.success) results.passed++; else results.failed++;
    
    const test12 = await testAgentKnowledge(
        "Compare o número de vídeos (48) com o número de comentários (202)",
        ['48', '202', 'vídeo', 'comentário']
    );
    results.total++;
    if (test12.success) results.passed++; else results.failed++;
    
    // RELATÓRIO FINAL
    log('\n\n📊 RELATÓRIO FINAL DE CONHECIMENTO', 'magenta');
    log('═══════════════════════════════════════', 'magenta');
    
    const percentage = Math.round((results.passed / results.total) * 100);
    
    log(`\nTestes realizados: ${results.total}`, 'white');
    log(`✅ Passaram: ${results.passed} (${percentage}%)`, 
        percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
    log(`❌ Falharam: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    
    log('\n📈 DADOS DISPONÍVEIS NO PROJETO 58:', 'yellow');
    Object.entries(KNOWN_DATA).forEach(([table, info]) => {
        log(`   ${table}: ${info.count} registros (${info.description})`, 'cyan');
    });
    
    log('\n🎯 DIAGNÓSTICO:', 'yellow');
    if (percentage >= 90) {
        log('   ✅ EXCELENTE! O agente tem acesso completo aos dados!', 'green');
    } else if (percentage >= 70) {
        log('   ⚠️  BOM, mas alguns dados não estão acessíveis', 'yellow');
    } else {
        log('   ❌ PROBLEMA! Muitos dados não estão sendo encontrados', 'red');
    }
    
    log('\n💡 TOTAL DE EMBEDDINGS: 935 registros indexados!', 'magenta');
    log('   O agente DEVERIA saber tudo sobre o projeto 58!', 'magenta');
}

// Executar teste
console.log('🚀 Iniciando teste completo de conhecimento...\n');
runCompleteTest().then(() => {
    log('\n✅ Teste concluído!\n', 'green');
}).catch(error => {
    log(`\n❌ Erro fatal: ${error.message}\n`, 'red');
});