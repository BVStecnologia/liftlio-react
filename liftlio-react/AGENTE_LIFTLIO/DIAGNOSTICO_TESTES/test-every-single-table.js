// 🔬 TESTE RIGOROSO - CADA TABELA INDIVIDUALMENTE
// Verifica se o agente consegue acessar dados de CADA tabela específica

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

const PROJECT_ID = '58';

// Lista COMPLETA de tabelas do sistema
const ALL_TABLES = [
    // Tabelas principais com dados confirmados
    { name: 'Mensagens', field: 'project_id', question: 'Quantas mensagens/menções existem no total?', expected: ['mensagem', 'menção', '222'] },
    { name: 'Comentarios_Principais', field: 'project_id', question: 'Quantos comentários principais temos?', expected: ['comentário', '202'] },
    { name: 'Respostas_Comentarios', field: 'parent_comment_id', question: 'Quantas respostas aos comentários existem?', expected: ['resposta', '167'] },
    { name: 'Videos', field: 'ProjetoID', question: 'Quantos vídeos estão sendo monitorados?', expected: ['vídeo', '48'] },
    { name: 'Channels', field: 'ProjetoID', question: 'Quantos canais do YouTube estamos monitorando?', expected: ['canal', 'channel'] },
    { name: 'Settings messages posts', field: 'Projeto', question: 'Quantas mensagens estão agendadas para postar?', expected: ['agendad', 'scheduled', '228'] },
    { name: 'agent_conversations', field: 'project_id', question: 'Quantas conversas já tivemos com o agente?', expected: ['conversa', '62'] },
    
    // Tabelas de suporte/análise
    { name: 'Sugestoes', field: 'Videos', question: 'Existem sugestões registradas para os vídeos?', expected: ['sugestão', 'sugest'] },
    { name: 'agents', field: 'id', question: 'Quais agentes estão configurados no sistema?', expected: ['agente', 'agent'] },
    { name: 'agent_capabilities', field: 'agent_id', question: 'Quais capacidades os agentes possuem?', expected: ['capacidade', 'capability'] },
    { name: 'agent_knowledge_base', field: 'project_id', question: 'Existe conhecimento base registrado para os agentes?', expected: ['conhecimento', 'knowledge'] },
    { name: 'agent_responses', field: 'agent_id', question: 'Existem respostas padrão configuradas?', expected: ['resposta', 'response'] },
    { name: 'agent_sessions', field: 'project_id', question: 'Quantas sessões de agente foram criadas?', expected: ['sessão', 'session'] },
    { name: 'agent_tools', field: 'agent_id', question: 'Quais ferramentas estão disponíveis para os agentes?', expected: ['ferramenta', 'tool'] }
];

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTableData(tableName, field, value = 58) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                query: `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${field}" = ${value}`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data[0]?.count || 0;
        }
    } catch (error) {
        // Silently fail
    }
    return null;
}

async function testTableAccess(table, sessionId) {
    log(`\n📊 Testando: ${table.name}`, 'yellow');
    log(`   Pergunta: "${table.question}"`, 'cyan');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agente-liftlio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                prompt: table.question,
                context: {
                    currentProject: {
                        id: PROJECT_ID,
                        name: 'HW'
                    }
                },
                sessionId: sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.metadata) {
            log(`   RAG: ${data.metadata.ragSearched ? '✅' : '❌'} | Resultados: ${data.metadata.ragResults || 0}`, 'white');
            
            // Verificar resposta
            const responseText = data.response.toLowerCase();
            let found = false;
            let foundTerms = [];
            
            for (const expected of table.expected) {
                if (responseText.includes(expected.toLowerCase())) {
                    found = true;
                    foundTerms.push(expected);
                }
            }
            
            if (found) {
                log(`   ✅ ENCONTROU: ${foundTerms.join(', ')}`, 'green');
                
                // Verificar números específicos na resposta
                const numbers = responseText.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    log(`   📈 Números mencionados: ${numbers.slice(0, 5).join(', ')}`, 'cyan');
                }
            } else {
                log(`   ❌ NÃO encontrou termos esperados`, 'red');
                log(`   Resposta: "${data.response.substring(0, 150)}..."`, 'white');
            }
            
            return {
                table: table.name,
                ragActivated: data.metadata.ragSearched,
                ragResults: data.metadata.ragResults || 0,
                found: found,
                foundTerms: foundTerms,
                response: data.response
            };
        }
        
    } catch (error) {
        log(`   ❌ Erro: ${error.message}`, 'red');
    }
    
    return {
        table: table.name,
        ragActivated: false,
        ragResults: 0,
        found: false,
        error: true
    };
}

async function runExhaustiveTest() {
    log('\n🔬 TESTE EXAUSTIVO - VERIFICAÇÃO TABELA POR TABELA', 'magenta');
    log('═══════════════════════════════════════════════════', 'magenta');
    log(`Projeto: ${PROJECT_ID} (HW)`, 'cyan');
    log(`Total de tabelas a testar: ${ALL_TABLES.length}`, 'cyan');
    
    const sessionId = 'exhaustive-test-' + Date.now();
    const results = [];
    
    // Primeiro, verificar dados reais no banco
    log('\n📍 FASE 1: Verificando dados REAIS no banco...', 'magenta');
    
    // Executar verificação direta via SQL
    const sqlCheck = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            query: `
                SELECT 
                    'rag_embeddings' as source,
                    source_table,
                    COUNT(*) as count
                FROM rag_embeddings
                WHERE project_id = 58
                GROUP BY source_table
                ORDER BY count DESC
            `
        })
    }).catch(() => null);
    
    if (sqlCheck && sqlCheck.ok) {
        const embeddings = await sqlCheck.json();
        log('\n📊 Embeddings por tabela:', 'cyan');
        embeddings.forEach(e => {
            log(`   ${e.source_table}: ${e.count} embeddings`, 'white');
        });
    }
    
    // Fase 2: Testar acesso via agente
    log('\n📍 FASE 2: Testando acesso via AGENTE...', 'magenta');
    
    for (const table of ALL_TABLES) {
        const result = await testTableAccess(table, sessionId);
        results.push(result);
        
        // Pequena pausa entre testes
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Relatório final
    log('\n\n📊 RELATÓRIO FINAL DETALHADO', 'magenta');
    log('═══════════════════════════════════════════', 'magenta');
    
    const summary = {
        total: results.length,
        ragActivated: results.filter(r => r.ragActivated).length,
        found: results.filter(r => r.found).length,
        errors: results.filter(r => r.error).length
    };
    
    log(`\n📈 RESUMO GERAL:`, 'yellow');
    log(`   Total de tabelas testadas: ${summary.total}`, 'white');
    log(`   RAG ativado: ${summary.ragActivated} (${Math.round(summary.ragActivated/summary.total*100)}%)`, 
        summary.ragActivated === summary.total ? 'green' : 'yellow');
    log(`   Dados encontrados: ${summary.found} (${Math.round(summary.found/summary.total*100)}%)`,
        summary.found === summary.total ? 'green' : 'yellow');
    log(`   Erros: ${summary.errors}`, summary.errors > 0 ? 'red' : 'green');
    
    // Detalhes por tabela
    log(`\n📋 DETALHES POR TABELA:`, 'yellow');
    results.forEach(r => {
        const status = r.found ? '✅' : '❌';
        const ragStatus = r.ragActivated ? `RAG:${r.ragResults}` : 'RAG:OFF';
        log(`   ${status} ${r.table} - ${ragStatus}`, r.found ? 'green' : 'red');
        if (r.foundTerms && r.foundTerms.length > 0) {
            log(`      Encontrou: ${r.foundTerms.join(', ')}`, 'cyan');
        }
    });
    
    // Diagnóstico final
    log(`\n🎯 DIAGNÓSTICO FINAL:`, 'magenta');
    const percentage = Math.round(summary.found / summary.total * 100);
    
    if (percentage === 100) {
        log(`   ✅ PERFEITO! O agente tem acesso a TODAS as tabelas!`, 'green');
    } else if (percentage >= 80) {
        log(`   ⚠️  MUITO BOM! ${percentage}% das tabelas acessíveis`, 'yellow');
        log(`   Tabelas sem acesso:`, 'yellow');
        results.filter(r => !r.found).forEach(r => {
            log(`      - ${r.table}`, 'red');
        });
    } else {
        log(`   ❌ PROBLEMA! Apenas ${percentage}% das tabelas acessíveis`, 'red');
    }
    
    return results;
}

// Executar teste
console.log('🚀 Iniciando teste exaustivo tabela por tabela...\n');
runExhaustiveTest().then(results => {
    log('\n✅ Teste concluído!\n', 'green');
    
    // Salvar resultados
    const fs = require('fs').promises;
    const report = {
        timestamp: new Date().toISOString(),
        project_id: PROJECT_ID,
        results: results,
        summary: {
            total_tables: results.length,
            rag_activated: results.filter(r => r.ragActivated).length,
            data_found: results.filter(r => r.found).length,
            success_rate: Math.round(results.filter(r => r.found).length / results.length * 100) + '%'
        }
    };
    
    fs.writeFile('test-results-' + Date.now() + '.json', JSON.stringify(report, null, 2))
        .then(() => log('📄 Relatório salvo em arquivo JSON', 'cyan'))
        .catch(() => {});
        
}).catch(error => {
    log(`\n❌ Erro fatal: ${error.message}\n`, 'red');
});