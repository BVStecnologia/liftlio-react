-- Teste direto do RAG com embedding real
-- Data: 14/01/2025

-- 1. Gerar embedding para "mensagens agendadas"
-- (Simular o que a Edge Function faria)

-- 2. Testar busca RAG com embedding real
SELECT 
    content,
    source_table,
    similarity,
    relevance_score
FROM search_rag_enhanced(
    -- Usar embedding de um registro existente como teste
    (SELECT embedding FROM rag_embeddings WHERE project_id = 58 AND embedding IS NOT NULL LIMIT 1),
    58,
    'mensagens agendadas',
    ARRAY['scheduled'],
    10,
    0.4
);

-- 3. Testar busca só por texto (sem embedding)
SELECT 
    content,
    source_table,
    similarity,
    relevance_score
FROM search_rag_enhanced(
    NULL,
    58,
    'mensagens agendadas',
    NULL,
    10,
    0.4
);

-- 4. Verificar quantas mensagens agendadas existem
SELECT 
    COUNT(*) as total_agendadas,
    MIN(proxima_postagem) as primeira,
    MAX(proxima_postagem) as ultima
FROM "Settings messages posts" 
WHERE "Projeto" = 58 
  AND proxima_postagem > NOW();