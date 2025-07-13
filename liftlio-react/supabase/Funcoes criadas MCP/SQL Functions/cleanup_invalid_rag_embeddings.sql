-- Script de limpeza para registros inválidos no RAG
-- Criado em: 12/01/2025
-- Objetivo: Remover registros sem embedding ou metadata

-- 1. Verificar quantos registros inválidos existem
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sem_embedding,
    COUNT(CASE WHEN metadata IS NULL THEN 1 END) as sem_metadata,
    COUNT(CASE WHEN embedding IS NULL OR metadata IS NULL THEN 1 END) as invalidos_total
FROM rag_embeddings;

-- 2. Excluir registros inválidos
DELETE FROM rag_embeddings 
WHERE embedding IS NULL OR metadata IS NULL;

-- 3. Resetar flags nas tabelas originais para reprocessamento
-- Mensagens
UPDATE "Mensagens" 
SET rag_processed = false, rag_processed_at = NULL
WHERE rag_processed = true 
AND id::text NOT IN (
    SELECT source_id 
    FROM rag_embeddings 
    WHERE source_table = 'Mensagens'
);

-- Comentarios_Principais  
UPDATE "Comentarios_Principais"
SET rag_processed = false, rag_processed_at = NULL
WHERE rag_processed = true 
AND id::text NOT IN (
    SELECT source_id 
    FROM rag_embeddings 
    WHERE source_table = 'Comentarios_Principais'
);

-- Videos
UPDATE "Videos"
SET rag_processed = false, rag_processed_at = NULL
WHERE rag_processed = true 
AND id::text NOT IN (
    SELECT source_id 
    FROM rag_embeddings 
    WHERE source_table = 'Videos'
);

-- 4. Verificar status final
SELECT 
    COUNT(*) as embeddings_validos,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as com_embedding,
    COUNT(CASE WHEN metadata IS NOT NULL THEN 1 END) as com_metadata
FROM rag_embeddings;

-- RESULTADO DA LIMPEZA (12/01/2025):
-- - Antes: 622 registros (300 inválidos)
-- - Depois: 322 registros (todos válidos)
-- - Registros removidos: 300
-- - Status: Tabela limpa e pronta para reprocessamento