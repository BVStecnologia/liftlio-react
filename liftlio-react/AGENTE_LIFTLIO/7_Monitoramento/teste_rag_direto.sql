-- Teste direto da função search_project_rag
-- Simulando busca por "menções postadas hoje"

-- 1. Primeiro, pegar um embedding de exemplo de menção
WITH exemplo_embedding AS (
    SELECT embedding
    FROM rag_embeddings
    WHERE project_id = 58
    AND LOWER(content) LIKE '%postada%'
    LIMIT 1
)
-- 2. Usar esse embedding para testar a busca
SELECT * FROM search_project_rag(
    (SELECT embedding FROM exemplo_embedding),
    58,
    0.5, -- threshold médio
    10
);

-- 3. Verificar se a função existe e está correta
SELECT 
    proname as nome_funcao,
    pronargs as num_argumentos,
    proargtypes,
    prorettype
FROM pg_proc 
WHERE proname = 'search_project_rag';