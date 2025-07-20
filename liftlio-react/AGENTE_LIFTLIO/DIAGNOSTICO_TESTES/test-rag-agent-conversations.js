// 🧠 TESTE ESPECÍFICO: RAG de Conversas do Agente
// Valida se o sistema está indexando e buscando conversas anteriores

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

const PROJECT_ID = '58';
const TEST_SESSION = 'rag-conv-test-' + Date.now();
const TEST_USER = 'rag-test-user-' + Date.now();

// Cores
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

// Função para chamar o agente
async function askAgent(prompt, context = {}) {
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
                    ...context,
                    currentProject: { id: PROJECT_ID, name: 'HW' }
                },
                userId: TEST_USER,
                sessionId: TEST_SESSION
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        log(`Erro: ${error.message}`, 'red');
        return null;
    }
}

// Função para verificar RAG diretamente
async function checkRAGConversations() {
    try {
        log('\n🔍 Verificando dados na tabela agent_conversations...', 'cyan');
        
        // Buscar conversas recentes do projeto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/agent_conversations?project_id=eq.${PROJECT_ID}&order=created_at.desc&limit=5`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        if (response.ok) {
            const conversations = await response.json();
            log(`   Encontradas ${conversations.length} conversas recentes no projeto ${PROJECT_ID}`, 'green');
            
            if (conversations.length > 0) {
                log('\n   📋 Exemplos de conversas armazenadas:', 'yellow');
                conversations.slice(0, 3).forEach((conv, idx) => {
                    log(`   ${idx + 1}. ${conv.message_type}: "${conv.message.substring(0, 60)}..."`, 'white');
                    log(`      Session: ${conv.session_id}`, 'cyan');
                    log(`      Created: ${new Date(conv.created_at).toLocaleString('pt-BR')}`, 'cyan');
                });
            }
        }
        
        // Verificar se existe na tabela rag_embeddings
        log('\n🔍 Verificando embeddings de conversas...', 'cyan');
        const ragResponse = await fetch(`${SUPABASE_URL}/rest/v1/rag_embeddings?source_table=eq.agent_conversations&project_id=eq.${PROJECT_ID}&order=created_at.desc&limit=5`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        if (ragResponse.ok) {
            const embeddings = await ragResponse.json();
            log(`   Encontrados ${embeddings.length} embeddings de conversas`, embeddings.length > 0 ? 'green' : 'red');
            
            if (embeddings.length === 0) {
                log('   ⚠️  ATENÇÃO: Conversas não estão sendo processadas para RAG!', 'red');
                log('   💡 Sugestão: Verificar função process_rag_batch para agent_conversations', 'yellow');
            }
        }
        
    } catch (error) {
        log(`Erro ao verificar RAG: ${error.message}`, 'red');
    }
}

// Teste principal
async function runTest() {
    log('\n🧪 TESTE DE RAG PARA CONVERSAS DO AGENTE', 'magenta');
    log('═══════════════════════════════════════════', 'magenta');
    log(`Projeto: ${PROJECT_ID} (HW)`, 'cyan');
    log(`Session: ${TEST_SESSION}`, 'cyan');
    
    // Verificar estado atual
    await checkRAGConversations();
    
    log('\n📝 FASE 1: Criar contexto com informação única', 'yellow');
    
    // Pergunta 1: Informação específica e única
    const uniqueInfo = `XPTO-${Date.now()}`;
    const response1 = await askAgent(
        `Estou trabalhando no projeto secreto ${uniqueInfo} que usa tecnologia quântica para processar vídeos em tempo real. É muito importante!`
    );
    
    if (response1) {
        log('✅ Primeira mensagem enviada', 'green');
        log(`   Resposta: "${response1.response.substring(0, 100)}..."`, 'cyan');
    }
    
    // Aguardar um pouco
    log('\n⏳ Aguardando 3 segundos...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Pergunta 2: Algo não relacionado
    log('\n📝 FASE 2: Pergunta não relacionada', 'yellow');
    const response2 = await askAgent(
        "Quais são as principais métricas que o Liftlio monitora?"
    );
    
    if (response2) {
        log('✅ Segunda mensagem enviada', 'green');
        log(`   RAG ativado: ${response2.metadata?.ragSearched ? 'Sim' : 'Não'}`, 'cyan');
        log(`   Resultados RAG: ${response2.metadata?.ragResults || 0}`, 'cyan');
    }
    
    // Aguardar
    log('\n⏳ Aguardando 3 segundos...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Pergunta 3: TESTE CRÍTICO - Perguntar sobre a primeira mensagem
    log('\n📝 FASE 3: TESTE CRÍTICO - Buscar informação anterior', 'yellow');
    const response3 = await askAgent(
        "Por que eu mencionei um projeto secreto anteriormente? Qual era o nome dele?"
    );
    
    if (response3) {
        log('\n🎯 ANÁLISE DO RESULTADO:', 'magenta');
        log(`   RAG ativado: ${response3.metadata?.ragSearched ? 'Sim' : 'Não'}`, 'cyan');
        log(`   Resultados RAG: ${response3.metadata?.ragResults || 0}`, 'cyan');
        log(`   Itens de memória: ${response3.metadata?.memoryItems || 0}`, 'cyan');
        
        // Verificar se encontrou a informação única
        const foundUniqueInfo = response3.response.includes(uniqueInfo);
        const mentionsProject = response3.response.toLowerCase().includes('projeto') || 
                               response3.response.toLowerCase().includes('project');
        const mentionsQuantum = response3.response.toLowerCase().includes('quântica') || 
                               response3.response.toLowerCase().includes('quantum');
        
        log('\n📊 VALIDAÇÃO:', 'yellow');
        log(`   ✅ Encontrou código único (${uniqueInfo}): ${foundUniqueInfo ? 'SIM' : 'NÃO'}`, 
            foundUniqueInfo ? 'green' : 'red');
        log(`   ✅ Mencionou "projeto": ${mentionsProject ? 'SIM' : 'NÃO'}`, 
            mentionsProject ? 'green' : 'red');
        log(`   ✅ Mencionou "quântica": ${mentionsQuantum ? 'SIM' : 'NÃO'}`, 
            mentionsQuantum ? 'green' : 'red');
        
        log('\n💬 Resposta completa:', 'cyan');
        log(response3.response, 'white');
        
        // Diagnóstico
        if (!foundUniqueInfo && response3.metadata?.memoryItems > 0) {
            log('\n⚠️  DIAGNÓSTICO: Memória de sessão funciona, mas RAG de conversas pode estar desativado', 'yellow');
            log('   A memória está limitada à sessão atual, não busca em conversas antigas via RAG', 'yellow');
        } else if (foundUniqueInfo && response3.metadata?.ragResults > 0) {
            log('\n✅ EXCELENTE: RAG de conversas está funcionando perfeitamente!', 'green');
            log('   O sistema buscou e encontrou informações em conversas anteriores', 'green');
        } else if (foundUniqueInfo && response3.metadata?.memoryItems > 0) {
            log('\n✅ BOM: Memória de sessão funcionando corretamente', 'green');
            log('   ⚠️  Mas RAG de conversas históricas pode ser melhorado', 'yellow');
        } else {
            log('\n❌ PROBLEMA: Nem memória nem RAG encontraram a informação', 'red');
        }
    }
    
    // Teste adicional: Buscar em conversa de outra sessão
    log('\n\n📝 FASE 4: Teste de busca cross-session', 'yellow');
    const newSession = 'new-session-' + Date.now();
    
    const response4 = await askAgent(
        `Algum usuário já mencionou projetos com tecnologia quântica para processar vídeos?`,
        { sessionId: newSession }  // Nova sessão!
    );
    
    if (response4) {
        log('\n🎯 TESTE CROSS-SESSION:', 'magenta');
        log(`   RAG ativado: ${response4.metadata?.ragSearched ? 'Sim' : 'Não'}`, 'cyan');
        log(`   Resultados RAG: ${response4.metadata?.ragResults || 0}`, 'cyan');
        
        const foundInCrossSession = response4.response.includes(uniqueInfo) || 
                                   response4.response.toLowerCase().includes('quântica');
        
        if (foundInCrossSession) {
            log('   ✅ PERFEITO: RAG encontrou conversa de outra sessão!', 'green');
        } else {
            log('   ❌ RAG não encontrou conversas de outras sessões', 'red');
            log('   💡 Conversas podem não estar sendo indexadas no RAG', 'yellow');
        }
    }
    
    // Verificar novamente o estado do RAG
    log('\n\n🔍 Verificação final do RAG...', 'cyan');
    await checkRAGConversations();
    
    log('\n\n✅ Teste concluído!', 'green');
}

// Executar teste
runTest().catch(error => {
    log(`\n❌ Erro fatal: ${error.message}`, 'red');
    console.error(error);
});