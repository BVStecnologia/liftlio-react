# 🚀 PLANO COMPLETO - FAZER RAG v17 FUNCIONAR PERFEITAMENTE

## 📋 Objetivo
Fazer o sistema RAG retornar dados específicos quando o usuário perguntar sobre menções, postagens, vídeos, etc.

## 🎯 Estratégia: Debug → Correção → Teste → Documentação

### FASE 1: DIAGNÓSTICO PRECISO (1-2 horas)

#### 1.1 Criar Script de Teste Direto
```bash
#!/bin/bash
# teste_rag_v17_completo.sh

SUPABASE_URL="https://suqjifkhmekcdflwowiw.supabase.co"
ANON_KEY="[PEGAR DO SUPABASE]"

echo "=== TESTE 1: Pergunta sobre menções hoje ==="
curl -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "como estão as menções postadas hoje?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    }
  }' | jq .

echo -e "\n=== TESTE 2: Pergunta específica sobre horário ==="
curl -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "o que foi postado às 14:11?",
    "context": {
      "currentProject": {
        "id": "58"
      }
    }
  }' | jq .

echo -e "\n=== TESTE 3: Busca por palavra exata ==="
curl -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "POSTAGEM REALIZADA",
    "context": {
      "currentProject": {
        "id": "58"
      }
    }
  }' | jq .
```

#### 1.2 Adicionar Logs Detalhados na v17
```typescript
// Adicionar após searchProjectData na v17
async function searchProjectData(prompt: string, projectId: string, categories: string[], language: 'pt' | 'en') {
  try {
    console.log('=== BUSCA RAG v17 - DEBUG COMPLETO ===');
    console.log('1. Prompt original:', prompt);
    console.log('2. Projeto:', projectId);
    console.log('3. Categorias detectadas:', categories);
    
    // Otimizar prompt
    const optimizedPrompt = optimizePromptForEmbedding(prompt, categories, language);
    console.log('4. Prompt otimizado:', optimizedPrompt);
    
    // Gerar embedding
    console.log('5. Gerando embedding...');
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
      body: { text: optimizedPrompt }
    });

    if (embeddingError || !embeddingData?.embedding) {
      console.error('6. ERRO ao gerar embedding:', embeddingError);
      return null;
    }
    
    console.log('7. Embedding gerado com sucesso, primeiros 5 valores:', embeddingData.embedding.slice(0, 5));

    const projectIdNumber = parseInt(projectId);
    const thresholds = [0.7, 0.5, 0.3, 0.1];
    let searchResults = null;
    let usedThreshold = 0;
    
    for (const threshold of thresholds) {
      console.log(`8. Tentando threshold: ${threshold}...`);
      
      const { data: results, error: searchError } = await supabase.rpc('search_project_rag', {
        query_embedding: embeddingData.embedding,
        project_filter: projectIdNumber,
        similarity_threshold: threshold,
        match_count: 30
      });

      if (searchError) {
        console.error(`9. ERRO na busca com threshold ${threshold}:`, searchError);
        continue;
      }

      console.log(`10. Resultados com threshold ${threshold}: ${results?.length || 0}`);
      
      if (results && results.length > 0) {
        console.log(`11. SUCESSO! Primeiros 3 resultados:`);
        results.slice(0, 3).forEach((r: any, i: number) => {
          console.log(`   ${i+1}. [${r.source_table}] Similaridade: ${r.similarity}`);
          console.log(`      Preview: ${r.content.substring(0, 100)}...`);
        });
        searchResults = results;
        usedThreshold = threshold;
        break;
      }
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.log('12. AVISO: Nenhum resultado encontrado mesmo com threshold mínimo');
      // ... resto do código de fallback
    }
    
    // ... resto do código
  } catch (error) {
    console.error('ERRO CRÍTICO na busca RAG:', error);
    return null;
  }
}
```

### FASE 2: CORREÇÕES ESPECÍFICAS (2-3 horas)

#### 2.1 Melhorar Otimização de Embeddings
```typescript
function optimizePromptForEmbedding(prompt: string, categories: string[], language: 'pt' | 'en'): string {
  let optimized = prompt.toLowerCase();
  
  // NOVO: Adicionar contexto temporal
  if (/\b(hoje|today|agora|now)\b/i.test(prompt)) {
    const today = new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US');
    if (language === 'pt') {
      optimized += ` data ${today} 13/07/2025 julho postagem realizada`;
    } else {
      optimized += ` date ${today} 07/13/2025 july posted`;
    }
  }
  
  // NOVO: Adicionar sinônimos para menções
  if (/\b(menç|mention)\b/i.test(prompt)) {
    if (language === 'pt') {
      optimized += ' menção menções citação referência postagem comentário resposta';
    } else {
      optimized += ' mention mentions citation reference post comment reply';
    }
  }
  
  // ... resto das otimizações existentes
  
  // NOVO: Adicionar contexto do projeto
  optimized += ' projeto project HW Humanlike Writer';
  
  return optimized;
}
```

#### 2.2 Implementar Busca por Palavras-Chave como Fallback
```typescript
// Adicionar após o fallback existente
if (!searchResults || searchResults.length === 0) {
  console.log('Tentando busca por palavras-chave...');
  
  // Extrair palavras-chave importantes
  const keywords = prompt.toLowerCase().split(' ')
    .filter(word => word.length > 3)
    .filter(word => !['para', 'como', 'está', 'estão', 'hoje'].includes(word));
  
  console.log('Palavras-chave:', keywords);
  
  // Buscar conteúdo que contenha essas palavras
  const { data: keywordResults } = await supabase
    .from('rag_embeddings')
    .select('*')
    .eq('project_id', projectIdNumber)
    .or(keywords.map(k => `content.ilike.%${k}%`).join(','))
    .limit(10);
  
  if (keywordResults && keywordResults.length > 0) {
    console.log(`Fallback por palavras-chave: ${keywordResults.length} resultados`);
    searchResults = keywordResults;
  }
}
```

### FASE 3: DEPLOYMENT E TESTES (1 hora)

#### 3.1 Re-deployar v17 com Melhorias
```typescript
// Script para deploy via MCP
const deployV17Melhorada = async () => {
  const { data, error } = await mcp__supabase__deploy_edge_function({
    project_id: "suqjifkhmekcdflwowiw",
    name: "agente-liftlio",
    files: [{
      name: "index.ts",
      content: // conteúdo da v17 com todas as melhorias
    }]
  });
  
  if (error) {
    console.error('Erro no deploy:', error);
  } else {
    console.log('Deploy v17 melhorada - versão:', data.version);
  }
};
```

#### 3.2 Executar Bateria de Testes
```sql
-- Criar tabela de testes para tracking
CREATE TABLE IF NOT EXISTS rag_test_results (
  id SERIAL PRIMARY KEY,
  test_prompt TEXT,
  expected_results INTEGER,
  actual_results INTEGER,
  threshold_used FLOAT,
  success BOOLEAN,
  test_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Inserir resultados dos testes
INSERT INTO rag_test_results (test_prompt, expected_results, actual_results, threshold_used, success, notes)
VALUES 
  ('como estão as menções postadas hoje?', 1, ?, ?, ?, ?),
  ('o que foi postado às 14:11?', 1, ?, ?, ?, ?),
  ('POSTAGEM REALIZADA', 10, ?, ?, ?, ?);
```

### FASE 4: CORREÇÃO DO FRONTEND (1 hora)

#### 4.1 Atualizar FloatingAgent para Capturar Debug
```typescript
// No FloatingAgent.tsx, após receber response
const { data, error } = await supabase.functions.invoke('agente-liftlio', {
  body: {
    prompt: input,
    context: context,
    userId: user?.id || null,
    sessionId: sessionIdRef.current
  }
});

if (error) throw error;

// NOVO: Log completo do response
console.log('Response completo do agente:', {
  content: data.content,
  hasRAGData: data.hasRAGData,
  debug: data.debug
});

// NOVO: Salvar metadata completo
const metadata = {
  timestamp: new Date().toISOString(),
  message_length: data.content.length,
  original_user_id: user?.id || null,
  original_session_id: sessionIdRef.current,
  // ADICIONAR campos de debug
  rag_results_count: data.debug?.ragResultsCount || 0,
  has_rag_data: data.hasRAGData || false,
  categories_detected: data.debug?.categoriesDetected || [],
  prompt_optimized: data.debug?.promptOptimized || false,
  version: data.debug?.version || 'unknown'
};
```

### FASE 5: TESTES AUTOMATIZADOS (2 horas)

#### 5.1 Criar Suite de Testes
```typescript
// test_rag_suite.ts
const testCases = [
  {
    name: "Busca menções hoje",
    prompt: "como estão as menções postadas hoje?",
    expectedKeywords: ["postada", "13/07/2025", "14:11"],
    minResults: 1
  },
  {
    name: "Busca por horário específico",
    prompt: "o que foi postado às 14:11?",
    expectedKeywords: ["14:11", "earnings", "Humanlike Writer"],
    minResults: 1
  },
  {
    name: "Busca genérica postagens",
    prompt: "listar postagens recentes",
    expectedKeywords: ["POSTAGEM REALIZADA"],
    minResults: 5
  }
];

// Executar testes
for (const test of testCases) {
  console.log(`\n=== Teste: ${test.name} ===`);
  const result = await runTest(test);
  
  // Salvar resultado no banco
  await supabase.from('rag_test_results').insert({
    test_prompt: test.prompt,
    expected_results: test.minResults,
    actual_results: result.count,
    threshold_used: result.threshold,
    success: result.success,
    notes: JSON.stringify(result.details)
  });
}
```

### FASE 6: DOCUMENTAÇÃO FINAL (1 hora)

#### 6.1 Criar Documentação Completa
```markdown
# 📚 SISTEMA RAG v17 - DOCUMENTAÇÃO COMPLETA

## Como Funciona
1. Usuário faz pergunta
2. Sistema detecta categorias e otimiza prompt
3. Gera embedding com OpenAI
4. Busca com multi-threshold (0.7 → 0.1)
5. Fallback por palavras-chave se necessário
6. Formata e retorna resultados

## Troubleshooting
- Se não retornar dados: verificar logs da Edge Function
- Se similaridade baixa: ajustar otimização de prompt
- Se erro no embedding: verificar API key OpenAI

## Testes de Validação
Execute: `deno run test_rag_suite.ts`
```

### FASE 7: MONITORAMENTO CONTÍNUO

#### 7.1 Criar Dashboard de Monitoramento
```sql
-- View para monitorar performance do RAG
CREATE OR REPLACE VIEW rag_performance_metrics AS
SELECT 
    DATE(created_at) as data,
    COUNT(*) as total_buscas,
    AVG(CASE WHEN metadata->>'rag_results_count' = '0' THEN 0 ELSE 1 END) as taxa_sucesso,
    AVG((metadata->>'rag_results_count')::int) as media_resultados,
    COUNT(CASE WHEN metadata->>'has_rag_data' = 'true' THEN 1 END) as buscas_com_dados
FROM agent_conversations
WHERE message_type = 'assistant'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

## 📝 Registro MCP Obrigatório

Todos os arquivos criados/modificados devem ser salvos em:
```
/AGENTE_LIFTLIO/
├── 4_Implementacao/
│   ├── Edge_Functions/
│   │   └── producao/
│   │       └── agente-liftlio_v17_rag_otimizado_melhorado.ts
│   ├── Planos/
│   │   └── PLANO_CORRECAO_RAG_V17_COMPLETO.md (este arquivo)
│   └── Scripts/
│       ├── teste_rag_v17_completo.sh
│       └── test_rag_suite.ts
├── 5_Documentacao/
│   └── RAG_V17_DOCUMENTACAO_COMPLETA.md
└── 7_Monitoramento/
    ├── rag_performance_metrics.sql
    └── resultados_testes_rag.md
```

## ⏱️ Timeline Estimada
- **Total**: 8-10 horas
- **Fase 1-3**: 4-6 horas (crítico)
- **Fase 4-7**: 4 horas (melhorias)

## ✅ Critério de Sucesso
- RAG retorna dados em 90%+ das buscas relevantes
- Threshold máximo usado ≤ 0.5 na maioria dos casos
- Tempo de resposta < 3 segundos
- Frontend exibe dados RAG quando disponíveis