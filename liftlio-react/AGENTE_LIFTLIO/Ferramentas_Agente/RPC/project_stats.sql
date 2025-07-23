-- Ferramenta: project_stats (get_complete_project_stats)
-- Descrição: Retorna estatísticas completas do projeto
-- Autor: Claude
-- Data: 22/01/2025
-- Versão: 2.0

-- Função corrigida em 22/07/2025 para contar total_mentions corretamente
-- Problema: estava contando TODOS os registros, não apenas postagens realizadas
-- Solução: adicionar WHERE postado IS NOT NULL para total_mentions

DROP FUNCTION IF EXISTS get_complete_project_stats(BIGINT);

CREATE OR REPLACE FUNCTION get_complete_project_stats(p_project_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    result := json_build_object(
        -- CARDS PRINCIPAIS DO DASHBOARD
        'active_channels', (
            SELECT COUNT(*) FROM "Canais do youtube"
            WHERE "Projeto" = p_project_id AND is_active = true
        ),
        'total_videos', (
            SELECT COUNT(*) FROM "Videos" v
            JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
            WHERE s."Projeto_id" = p_project_id
        ),
        -- CORRIGIDO: total_mentions deve contar apenas postagens REALIZADAS
        'total_mentions', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND postado IS NOT NULL  -- APENAS POSTAGENS REALIZADAS
        ),
        'mentions_today', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND postado >= CURRENT_DATE
            AND postado < (CURRENT_DATE + INTERVAL '1 day')
        ),
        
        -- MENTIONS PAGE - SCHEDULED TAB (o que aparece na página)
        'scheduled_mentions', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND (status = 'pending' OR postado IS NULL)
            AND proxima_postagem > NOW()
        ),
        'posted_mentions', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND postado IS NOT NULL
        ),
        
        -- VÍDEOS MONITORADOS (com scanner ativo)
        'videos_monitored', (
            SELECT COUNT(DISTINCT v.id)
            FROM "Videos" v
            JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
            WHERE s."Projeto_id" = p_project_id
            AND s.status = 'active'
            AND v.monitored = true
        ),
        
        -- TOP 5 CANAIS POR INSCRITOS (filtrando por projeto)
        'top_channels', (
            SELECT json_agg(channel_data ORDER BY subscriber_count DESC)
            FROM (
                SELECT 
                    c."Nome" as channel_name,
                    c.channel_id,
                    c.subscriber_count,
                    c.is_active
                FROM "Canais do youtube" c
                WHERE c."Projeto" = p_project_id
                AND c.is_active = true
                ORDER BY c.subscriber_count DESC
                LIMIT 5
            ) channel_data
        ),
        
        -- MÉTRICAS DO SCANNER (palavras-chave e contadores)
        'scanner_stats', (
            SELECT json_build_object(
                'total_scanners', COUNT(*),
                'active_scanners', COUNT(*) FILTER (WHERE status = 'active'),
                'keywords', (
                    SELECT array_agg(DISTINCT keyword) 
                    FROM (
                        SELECT unnest(keywords) as keyword
                        FROM "Scanner de videos do youtube"
                        WHERE "Projeto_id" = p_project_id
                    ) k
                    LIMIT 5
                )
            )
            FROM "Scanner de videos do youtube"
            WHERE "Projeto_id" = p_project_id
        ),
        
        -- DETALHES DAS MENSAGENS AGENDADAS (próximas 10)
        'scheduled_details', (
            SELECT json_agg(msg_data ORDER BY proxima_postagem ASC)
            FROM (
                SELECT 
                    smp.id,
                    smp.content,
                    smp.tipo_msg,
                    smp.proxima_postagem,
                    v.title as video_title,
                    cp.content as comment_content
                FROM "Settings messages posts" smp
                LEFT JOIN "Videos" v ON smp."Videos" = v.id
                LEFT JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
                WHERE smp."Projeto" = p_project_id
                AND (smp.status = 'pending' OR smp.postado IS NULL)
                AND smp.proxima_postagem > NOW()
                ORDER BY smp.proxima_postagem ASC
                LIMIT 10
            ) msg_data
        ),
        
        -- TOTAL DE MENSAGENS NO SISTEMA (geral, sem filtro de projeto)
        'total_messages', (
            SELECT COUNT(*) FROM "Settings messages posts"
        ),
        
        -- TOTAL DE VÍDEOS NO SISTEMA (geral, sem filtro de projeto)
        'total_videos_in_system', (
            SELECT COUNT(*) FROM "Videos"
        ),
        
        -- TIMESTAMP DE ÚLTIMA ATUALIZAÇÃO
        'last_updated', NOW()::TIMESTAMPTZ
    );
    
    RETURN result;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_complete_project_stats(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_complete_project_stats(BIGINT) TO anon;

-- TESTE: Executar com projeto 58
-- SELECT get_complete_project_stats(58);

-- Exemplo de resultado esperado:
/*
{
  "active_channels": 18,
  "total_videos": 50,
  "total_mentions": 256,  -- APENAS postagens realizadas
  "mentions_today": 2,
  "scheduled_mentions": 1,
  "posted_mentions": 256,
  "videos_monitored": 27,
  "top_channels": [...],
  "scanner_stats": {
    "total_scanners": 5,
    "active_scanners": 5,
    "keywords": ["affiliate marketing", "AI content", ...]
  },
  "scheduled_details": [...],
  "total_messages": 223,
  "total_videos_in_system": 1234,
  "last_updated": "2025-01-22T20:30:00Z"
}
*/