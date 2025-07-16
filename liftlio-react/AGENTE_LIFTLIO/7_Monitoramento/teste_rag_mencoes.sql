-- Teste de busca RAG para menções postadas hoje
-- Projeto 58 (HW)

-- 1. Verificar se há dados de menções/postagens para hoje
SELECT 
    id,
    source_table,
    source_id,
    LEFT(content, 300) as content_preview,
    metadata->>'processed_at' as processed_at
FROM rag_embeddings
WHERE project_id = 58
AND (
    -- Buscar por data de hoje
    content LIKE '%13/07/2025%'
    OR content LIKE '%13/01/2025%'
    OR content LIKE '%hoje%'
    OR content LIKE '%today%'
    -- Buscar por menções
    OR LOWER(content) LIKE '%menç%'
    OR LOWER(content) LIKE '%mention%'
    -- Buscar por postagens
    OR LOWER(content) LIKE '%postada%'
    OR LOWER(content) LIKE '%posted%'
)
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar conteúdo mais recente do projeto
SELECT 
    source_table,
    COUNT(*) as total,
    MAX(created_at) as ultima_atualizacao
FROM rag_embeddings
WHERE project_id = 58
GROUP BY source_table
ORDER BY ultima_atualizacao DESC;

-- 3. Exemplo de conteúdo de cada tabela
WITH sample_data AS (
    SELECT DISTINCT ON (source_table) 
        id,
        source_table,
        LEFT(content, 200) as content_preview,
        created_at
    FROM rag_embeddings
    WHERE project_id = 58
    ORDER BY source_table, created_at DESC
)
SELECT * FROM sample_data
ORDER BY source_table;