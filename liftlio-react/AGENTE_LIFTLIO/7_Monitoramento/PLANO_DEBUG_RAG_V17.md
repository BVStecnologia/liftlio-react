# 🐛 PLANO DE DEBUG - RAG v17 NÃO RETORNANDO DADOS

## Situação Atual
- ✅ Edge Function v17 deployed (versão 24)
- ✅ 868 embeddings processados para projeto 58
- ✅ Dados existem (postagem de 13/07/2025 14:11)
- ❌ Agente responde que "não tem acesso aos detalhes"

## Hipóteses do Problema

### 1. **Problema na similaridade dos embeddings**
- O texto "como estão as menções postadas hoje?" pode não ter similaridade suficiente
- Testar com textos mais próximos do conteúdo real

### 2. **Problema no threshold**
- Mesmo com 0.1, pode não estar encontrando matches
- Verificar se a função está sendo chamada corretamente

### 3. **Problema no formato dos resultados**
- Os resultados podem estar sendo retornados mas não formatados corretamente
- Verificar a estrutura do retorno

### 4. **Problema no prompt do Claude**
- O system prompt pode estar instruindo o Claude a não usar os dados RAG
- Verificar as instruções exatas

## Ações de Debug

### 1. Adicionar mais logs
```typescript
// No searchProjectData
console.log('Embedding gerado:', embeddingData.embedding.slice(0, 5));
console.log('Resultados por threshold:', thresholds.map(t => ({t, count: results?.length})));
```

### 2. Testar busca direta
```sql
-- Usar embedding de conteúdo conhecido
SELECT * FROM search_project_rag(
    (SELECT embedding FROM rag_embeddings WHERE id = 2596),
    58,
    0.1,
    10
);
```

### 3. Verificar resposta completa
- Ver o que está sendo passado para o Claude
- Ver o que o Claude está retornando

### 4. Testar com prompt mais específico
- "liste as postagens de 13/07/2025"
- "o que foi postado às 14:11?"

## Próximos Passos
1. Adicionar console.log detalhado na v17
2. Re-deployar com logs extras
3. Testar e analisar os logs
4. Ajustar baseado nos resultados