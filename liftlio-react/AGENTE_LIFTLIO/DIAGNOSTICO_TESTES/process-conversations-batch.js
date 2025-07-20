// Script para processar conversas em batch para RAG
// Usa a Edge Function generate-embedding diretamente

const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'seu-service-key-aqui';

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

async function processConversations() {
    log('\n🚀 PROCESSAMENTO DE CONVERSAS PARA RAG', 'magenta');
    log('═══════════════════════════════════════', 'magenta');
    
    // 1. Buscar conversas não processadas
    const conversationsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/agent_conversations?rag_processed=eq.false&project_id=eq.58&limit=10`,
        {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
        }
    );
    
    if (!conversationsResponse.ok) {
        log('❌ Erro ao buscar conversas', 'red');
        return;
    }
    
    const conversations = await conversationsResponse.json();
    log(`📋 Encontradas ${conversations.length} conversas para processar`, 'cyan');
    
    let processed = 0;
    let errors = 0;
    
    // 2. Processar cada conversa
    for (const conv of conversations) {
        try {
            log(`\n🔄 Processando: "${conv.message.substring(0, 50)}..."`, 'yellow');
            
            // Preparar conteúdo
            const content = prepareContent(conv);
            
            // Gerar embedding
            const embeddingResponse = await fetch(
                `${SUPABASE_URL}/functions/v1/generate-embedding`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    },
                    body: JSON.stringify({ text: content })
                }
            );
            
            if (!embeddingResponse.ok) {
                throw new Error('Falha ao gerar embedding');
            }
            
            const { embedding } = await embeddingResponse.json();
            
            // Inserir no rag_embeddings
            const insertResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/rag_embeddings`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        source_table: 'agent_conversations',
                        source_id: conv.id,
                        content: content,
                        embedding: embedding,
                        project_id: conv.project_id,
                        metadata: {
                            message_type: conv.message_type,
                            session_id: conv.session_id,
                            created_at: conv.created_at
                        }
                    })
                }
            );
            
            if (!insertResponse.ok) {
                throw new Error(`Erro ao inserir embedding: ${await insertResponse.text()}`);
            }
            
            // Marcar como processada
            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/agent_conversations?id=eq.${conv.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    },
                    body: JSON.stringify({ rag_processed: true })
                }
            );
            
            if (updateResponse.ok) {
                processed++;
                log('   ✅ Processada com sucesso!', 'green');
            }
            
        } catch (error) {
            errors++;
            log(`   ❌ Erro: ${error.message}`, 'red');
        }
    }
    
    // 3. Relatório final
    log('\n📊 RELATÓRIO FINAL', 'magenta');
    log('═══════════════════', 'magenta');
    log(`✅ Processadas: ${processed}`, 'green');
    log(`❌ Erros: ${errors}`, errors > 0 ? 'red' : 'green');
    
    // 4. Verificar embeddings criados
    const countResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/rag_embeddings?source_table=eq.agent_conversations&project_id=eq.58&select=count`,
        {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'count=exact'
            }
        }
    );
    
    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || '0';
    log(`\n📈 Total de embeddings de conversas: ${totalCount}`, 'cyan');
}

function prepareContent(conv) {
    let content = conv.message_type === 'user' 
        ? 'Usuário perguntou: ' 
        : 'Assistente respondeu: ';
    
    content += conv.message;
    
    // Adicionar metadata
    if (conv.metadata?.extracted_info) {
        const info = conv.metadata.extracted_info;
        if (info.userName) content += ` [Usuário: ${info.userName}]`;
        if (info.userCompany) content += ` [Empresa: ${info.userCompany}]`;
        if (info.keyTopics?.length) content += ` [Tópicos: ${info.keyTopics.join(', ')}]`;
    }
    
    return content;
}

// Executar se tiver service key
if (process.env.SUPABASE_SERVICE_KEY) {
    processConversations().catch(console.error);
} else {
    log('⚠️  Configure SUPABASE_SERVICE_KEY como variável de ambiente', 'yellow');
    log('   export SUPABASE_SERVICE_KEY="sua-service-key"', 'cyan');
}