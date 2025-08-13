-- Verificar se eventos estão chegando do projeto 58
SELECT 
    COUNT(*) as total_eventos,
    MAX(created_at) as ultimo_evento,
    MIN(created_at) as primeiro_evento
FROM analytics 
WHERE project_id = 58 
AND created_at > NOW() - INTERVAL '2 hours';

-- Ver últimos 10 eventos detalhados
SELECT 
    id,
    event_type,
    page_url,
    created_at
FROM analytics 
WHERE project_id = 58 
ORDER BY created_at DESC 
LIMIT 10;