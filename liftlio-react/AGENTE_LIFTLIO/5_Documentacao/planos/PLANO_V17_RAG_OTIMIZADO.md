# Plano de Otimização RAG - Agente v17

## Status Atual ✅
- **868 embeddings** processados no projeto 58
- Todas as tabelas principais cobertas:
  - Videos: 48 registros
  - Mensagens: 222 registros
  - Comentarios_Principais: 202 registros
  - Settings_messages_posts: 228 registros
  - Respostas_Comentarios: 167 registros

## Problemas Identificados 🔍

1. **Threshold muito alto** (0.7) filtra resultados válidos
2. **Pergunta não otimizada** para gerar embedding correto
3. **Falta de logs** para debug
4. **Resposta expõe** "estatísticas reais do dashboard"

## Solução v17 🚀

### 1. Busca Multi-Threshold
```typescript
// Tentar múltiplos thresholds
const thresholds = [0.7, 0.5, 0.3];
for (const threshold of thresholds) {
  const results = await searchProjectData(prompt, projectId, threshold);
  if (results && results.length > 0) break;
}
```

### 2. Otimização de Embeddings
```typescript
// Expandir pergunta com contexto
function optimizePromptForEmbedding(prompt: string, categories: string[]) {
  let optimized = prompt;
  
  // Adicionar sinônimos e contexto
  if (prompt.includes('vídeo') || prompt.includes('video')) {
    optimized += ' título descrição canal youtube conteúdo';
  }
  
  if (prompt.includes('postado') || prompt.includes('posted')) {
    optimized += ' mensagem publicado enviado data quando';
  }
  
  return optimized;
}
```

### 3. Logs Detalhados
```typescript
console.log('=== BUSCA RAG v17 ===');
console.log('Prompt original:', prompt);
console.log('Prompt otimizado:', optimizedPrompt);
console.log('Threshold atual:', threshold);
console.log('Resultados encontrados:', results?.length || 0);
```

### 4. Respostas Naturais
- Remover "De acordo com as estatísticas reais do dashboard"
- Usar "Encontrei X menções hoje"
- Integrar dados RAG naturalmente na resposta

### 5. Estratégias de Fallback
1. Se busca exata falhar → buscar palavras-chave
2. Se threshold alto falhar → reduzir progressivamente
3. Se tabela específica falhar → buscar em todas
4. Sempre fornecer alguma informação útil

## Resultado Esperado

Quando usuário perguntar "quais vídeos foram postados?", o agente:
1. Gerará embedding otimizado
2. Buscará com múltiplos thresholds
3. Encontrará vídeos como "How to Dominate Quora"
4. Responderá naturalmente com títulos e detalhes
5. Nunca dirá "não tenho acesso"