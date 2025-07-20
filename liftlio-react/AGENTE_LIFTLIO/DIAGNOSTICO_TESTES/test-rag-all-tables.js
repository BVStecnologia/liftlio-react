// 🔍 TESTE COMPLETO DO SISTEMA RAG - TODAS AS TABELAS
// Valida busca semântica em todas as 14 tabelas configuradas
// Projeto 58 (HW) - Dados reais

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

const PROJECT_ID = '58';
const TEST_SESSION = 'rag-test-' + Date.now();

// Tabelas configuradas para RAG
const RAG_TABLES = [
    { name: 'Mensagens', searchTerms: ['menção', 'sentimento', 'comentário'] },
    { name: 'Comentarios_Principais', searchTerms: ['comentário principal', 'resposta', 'análise'] },
    { name: 'Videos', searchTerms: ['vídeo', 'visualização', 'likes', 'canal'] },
    { name: 'Respostas_Comentarios', searchTerms: ['resposta', 'reply', 'feedback'] },
    { name: 'Channels', searchTerms: ['canal', 'inscritos', 'youtube'] },
    { name: 'Settings messages posts', searchTerms: ['agendado', 'scheduled', 'próxima postagem'] },
    { name: 'Sugestoes', searchTerms: ['sugestão', 'melhoria', 'ideia'] },
    { name: 'agents', searchTerms: ['agente', 'IA', 'assistente'] },
    { name: 'agent_capabilities', searchTerms: ['capacidade', 'funcionalidade', 'recurso'] },
    { name: 'agent_conversations', searchTerms: ['conversa', 'histórico', 'memória'] },
    { name: 'agent_knowledge_base', searchTerms: ['conhecimento', 'base', 'informação'] },
    { name: 'agent_responses', searchTerms: ['resposta agente', 'template', 'modelo'] },
    { name: 'agent_sessions', searchTerms: ['sessão', 'interação', 'chat'] },
    { name: 'agent_tools', searchTerms: ['ferramenta', 'tool', 'função'] }
];

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

// Teste direto da função RPC
async function testRAGDirect(searchText) {
    try {
        // Primeiro, gerar embedding
        const embeddingResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ text: searchText })
        });
        
        if (!embeddingResponse.ok) {
            throw new Error('Falha ao gerar embedding');
        }
        
        const { embedding } = await embeddingResponse.json();
        
        // Chamar RPC diretamente
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_rag_enhanced`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                p_query_embedding: embedding,
                p_project_id: parseInt(PROJECT_ID),
                p_search_text: searchText,
                p_categories: ['general'],
                p_limit: 30,
                p_min_similarity: 0.3
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`RPC falhou: ${error}`);
        }
        
        const data = await response.json();
        return data || [];
        
    } catch (error) {
        log(`Erro no teste direto: ${error.message}`, 'red');
        return [];
    }
}

// Teste via agente
async function testRAGViaAgent(prompt) {
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
            throw new Error(`Agente falhou: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            response: data.response,
            metadata: data.metadata
        };
        
    } catch (error) {
        log(`Erro no agente: ${error.message}`, 'red');
        return null;
    }
}

// Análise de cobertura de tabelas
async function analyzeTableCoverage() {
    log('\n📊 ANÁLISE DE COBERTURA DE TABELAS RAG', 'magenta');
    log('═══════════════════════════════════════', 'magenta');
    
    const coverage = {
        total: RAG_TABLES.length,
        found: 0,
        missing: [],
        results: {}
    };
    
    // Testar cada tabela
    for (const table of RAG_TABLES) {
        log(`\n🔍 Testando tabela: ${table.name}`, 'yellow');
        
        let tableFound = false;
        const tableResults = [];
        
        // Testar cada termo de busca
        for (const term of table.searchTerms) {
            log(`   Buscando por: "${term}"`, 'cyan');
            
            const results = await testRAGDirect(term);
            
            if (results.length > 0) {
                // Verificar se algum resultado é da tabela esperada
                const fromThisTable = results.filter(r => 
                    r.source_table === table.name || 
                    r.source_table === table.name.toLowerCase() ||
                    r.source_table === table.name.replace('_', ' ')
                );
                
                if (fromThisTable.length > 0) {
                    tableFound = true;
                    log(`   ✅ Encontrado ${fromThisTable.length} resultados da tabela ${table.name}`, 'green');
                    tableResults.push({
                        term,
                        count: fromThisTable.length,
                        samples: fromThisTable.slice(0, 2).map(r => ({
                            content: r.content.substring(0, 100),
                            similarity: r.similarity
                        }))
                    });
                } else {
                    log(`   ⚠️  Resultados encontrados mas não da tabela ${table.name}`, 'yellow');
                }
            } else {
                log(`   ❌ Nenhum resultado encontrado`, 'red');
            }
            
            // Pequena pausa entre buscas
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (tableFound) {
            coverage.found++;
            coverage.results[table.name] = tableResults;
            log(`   ✅ TABELA ${table.name} ESTÁ FUNCIONANDO NO RAG`, 'green');
        } else {
            coverage.missing.push(table.name);
            log(`   ❌ TABELA ${table.name} NÃO ENCONTRADA NO RAG`, 'red');
        }
    }
    
    return coverage;
}

// Teste de categorias
async function testCategories() {
    log('\n🏷️  TESTE DE CATEGORIAS RAG', 'magenta');
    log('═══════════════════════════════', 'magenta');
    
    const categoryTests = [
        {
            prompt: "Mostre as últimas menções sobre o produto",
            expectedCategory: 'mentions',
            expectedTable: 'Mensagens'
        },
        {
            prompt: "Quais vídeos estão tendo melhor desempenho?",
            expectedCategory: 'videos',
            expectedTable: 'Videos'
        },
        {
            prompt: "Quantas mensagens estão agendadas?",
            expectedCategory: 'scheduled',
            expectedTable: 'Settings messages posts'
        },
        {
            prompt: "Qual o sentimento geral das menções?",
            expectedCategory: 'sentiment',
            expectedTable: 'Mensagens'
        }
    ];
    
    const results = [];
    
    for (const test of categoryTests) {
        log(`\n📝 Teste: "${test.prompt}"`, 'yellow');
        log(`   Categoria esperada: ${test.expectedCategory}`, 'cyan');
        log(`   Tabela esperada: ${test.expectedTable}`, 'cyan');
        
        const agentResult = await testRAGViaAgent(test.prompt);
        
        if (agentResult && agentResult.metadata) {
            const { ragSearched, ragResults, categories } = agentResult.metadata;
            
            log(`   RAG ativado: ${ragSearched ? 'Sim' : 'Não'}`, ragSearched ? 'green' : 'red');
            log(`   Resultados RAG: ${ragResults || 0}`, ragResults > 0 ? 'green' : 'red');
            log(`   Categorias detectadas: ${categories?.join(', ') || 'nenhuma'}`, 'cyan');
            
            const categoryMatch = categories?.includes(test.expectedCategory);
            log(`   Categoria correta: ${categoryMatch ? 'Sim' : 'Não'}`, categoryMatch ? 'green' : 'red');
            
            results.push({
                test: test.prompt,
                success: ragSearched && ragResults > 0,
                categoryMatch,
                ragResults
            });
        } else {
            log(`   ❌ Falha na resposta do agente`, 'red');
            results.push({
                test: test.prompt,
                success: false
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

// Teste de performance
async function testPerformance() {
    log('\n⚡ TESTE DE PERFORMANCE RAG', 'magenta');
    log('══════════════════════════════', 'magenta');
    
    const performanceTests = [
        { query: "menção positiva", complexity: "simples" },
        { query: "mostre todas as menções positivas dos últimos 7 dias com mais de 1000 visualizações", complexity: "complexa" },
        { query: "qual o sentimento geral e quantas mensagens estão agendadas para resposta", complexity: "múltipla" }
    ];
    
    const results = [];
    
    for (const test of performanceTests) {
        log(`\n🏃 Teste ${test.complexity}: "${test.query}"`, 'yellow');
        
        const startTime = Date.now();
        const ragResults = await testRAGDirect(test.query);
        const directTime = Date.now() - startTime;
        
        const agentStart = Date.now();
        const agentResult = await testRAGViaAgent(test.query);
        const agentTime = Date.now() - agentStart;
        
        log(`   Tempo busca direta: ${directTime}ms`, directTime < 1000 ? 'green' : 'yellow');
        log(`   Tempo via agente: ${agentTime}ms`, agentTime < 2000 ? 'green' : 'yellow');
        log(`   Resultados diretos: ${ragResults.length}`, ragResults.length > 0 ? 'green' : 'red');
        log(`   RAG via agente: ${agentResult?.metadata?.ragResults || 0} resultados`, 'cyan');
        
        results.push({
            query: test.query,
            complexity: test.complexity,
            directTime,
            agentTime,
            directResults: ragResults.length,
            agentResults: agentResult?.metadata?.ragResults || 0
        });
    }
    
    return results;
}

// Relatório completo
async function generateReport(coverageResults, categoryResults, performanceResults) {
    log('\n📋 RELATÓRIO COMPLETO DO SISTEMA RAG', 'magenta');
    log('════════════════════════════════════════', 'magenta');
    
    // Cobertura de tabelas
    const coveragePercent = Math.round((coverageResults.found / coverageResults.total) * 100);
    log('\n1️⃣  COBERTURA DE TABELAS:', 'yellow');
    log(`   Total de tabelas: ${coverageResults.total}`, 'white');
    log(`   Tabelas funcionando: ${coverageResults.found} (${coveragePercent}%)`, 
        coveragePercent >= 80 ? 'green' : coveragePercent >= 60 ? 'yellow' : 'red');
    
    if (coverageResults.missing.length > 0) {
        log(`   ❌ Tabelas sem dados RAG:`, 'red');
        coverageResults.missing.forEach(table => {
            log(`      - ${table}`, 'red');
        });
    }
    
    // Categorias
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryPercent = Math.round((categorySuccess / categoryResults.length) * 100);
    log('\n2️⃣  TESTE DE CATEGORIAS:', 'yellow');
    log(`   Testes realizados: ${categoryResults.length}`, 'white');
    log(`   Sucessos: ${categorySuccess} (${categoryPercent}%)`,
        categoryPercent >= 80 ? 'green' : categoryPercent >= 60 ? 'yellow' : 'red');
    
    // Performance
    const avgDirectTime = Math.round(performanceResults.reduce((sum, r) => sum + r.directTime, 0) / performanceResults.length);
    const avgAgentTime = Math.round(performanceResults.reduce((sum, r) => sum + r.agentTime, 0) / performanceResults.length);
    
    log('\n3️⃣  PERFORMANCE:', 'yellow');
    log(`   Tempo médio busca direta: ${avgDirectTime}ms`, avgDirectTime < 500 ? 'green' : 'yellow');
    log(`   Tempo médio via agente: ${avgAgentTime}ms`, avgAgentTime < 2000 ? 'green' : 'yellow');
    
    // Diagnóstico
    log('\n🔧 DIAGNÓSTICO:', 'yellow');
    
    if (coveragePercent < 80) {
        log('   ⚠️  Cobertura de tabelas baixa. Verificar:', 'yellow');
        log('      - Processamento de embeddings para tabelas faltantes', 'white');
        log('      - Função prepare_rag_content para cada tabela', 'white');
        log('      - Cron jobs de processamento RAG', 'white');
    }
    
    if (categoryPercent < 80) {
        log('   ⚠️  Detecção de categorias com problemas. Verificar:', 'yellow');
        log('      - Função categorizeQuestion no agente', 'white');
        log('      - Mapeamento de categorias para tabelas', 'white');
    }
    
    if (avgAgentTime > 2000) {
        log('   ⚠️  Performance pode ser melhorada. Considerar:', 'yellow');
        log('      - Otimizar índices (HNSW)', 'white');
        log('      - Ajustar limite de resultados', 'white');
        log('      - Implementar cache', 'white');
    }
    
    // Score final
    const finalScore = Math.round((coveragePercent + categoryPercent) / 2);
    log('\n🏆 SCORE FINAL DO SISTEMA RAG:', 'magenta');
    
    if (finalScore >= 90) {
        log(`   ${finalScore}% - EXCELENTE! 🎉`, 'green');
    } else if (finalScore >= 70) {
        log(`   ${finalScore}% - BOM, mas pode melhorar 👍`, 'yellow');
    } else {
        log(`   ${finalScore}% - NECESSITA ATENÇÃO URGENTE! ⚠️`, 'red');
    }
}

// Executar todos os testes
async function runAllTests() {
    log('🚀 INICIANDO TESTE COMPLETO DO SISTEMA RAG', 'magenta');
    log(`   Projeto: ${PROJECT_ID} (HW)`, 'cyan');
    log(`   Data: ${new Date().toLocaleString('pt-BR')}`, 'cyan');
    
    try {
        // 1. Cobertura de tabelas
        const coverageResults = await analyzeTableCoverage();
        
        // 2. Teste de categorias
        const categoryResults = await testCategories();
        
        // 3. Teste de performance
        const performanceResults = await testPerformance();
        
        // 4. Gerar relatório
        await generateReport(coverageResults, categoryResults, performanceResults);
        
        log('\n✅ Testes concluídos!\n', 'green');
        
    } catch (error) {
        log(`\n❌ Erro fatal: ${error.message}`, 'red');
        console.error(error);
    }
}

// Executar
runAllTests();