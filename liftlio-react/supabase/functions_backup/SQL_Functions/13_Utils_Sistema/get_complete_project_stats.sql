-- =============================================
-- Função: get_complete_project_stats
-- Descrição: Obtém estatísticas completas do projeto para dashboard
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_complete_project_stats(bigint);

CREATE OR REPLACE FUNCTION public.get_complete_project_stats(p_project_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
        -- total_mentions conta apenas postagens realizadas
        'total_mentions', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND postado IS NOT NULL
        ),
        'mentions_today', (
            SELECT COUNT(*) FROM "Settings messages posts"
            WHERE "Projeto" = p_project_id
            AND postado >= CURRENT_DATE
            AND postado < (CURRENT_DATE + INTERVAL '1 day')
        ),

        -- MENTIONS PAGE - SCHEDULED TAB
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

        -- DETALHES DAS AGENDADAS
        'scheduled_details', (
            SELECT json_agg(scheduled ORDER BY proxima_postagem) FROM (
                SELECT
                    smp.id,
                    smp.proxima_postagem,
                    smp.tipo_msg,
                    m.mensagem as content,
                    v.video_title,
                    c.text_display as comment_content
                FROM "Settings messages posts" smp
                LEFT JOIN "Mensagens" m ON m.id = smp."Mensagens"
                LEFT JOIN "Videos" v ON v.id = smp."Videos"
                LEFT JOIN "Comentarios_Principais" c ON c.id = smp."Comentarios_Principal"
                WHERE smp."Projeto" = p_project_id
                AND (smp.status = 'pending' OR smp.postado IS NULL)
                AND smp.proxima_postagem > NOW()
                ORDER BY smp.proxima_postagem
            ) scheduled
        ),

        -- MÉTRICAS DE MENSAGENS
        'total_messages', (
            SELECT COUNT(*) FROM "Mensagens"
            WHERE project_id = p_project_id
        ),

        -- MÉTRICAS DE VÍDEOS MONITORADOS
        'videos_monitored', (
            SELECT COUNT(DISTINCT v.id)
            FROM "Videos" v
            JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
            WHERE s."Projeto_id" = p_project_id
            AND v.monitored = true
        ),

        -- SCANNERS ATIVOS
        'scanner_stats', (
            SELECT json_build_object(
                'total_scanners', COUNT(*),
                'active_scanners', COUNT(*) FILTER (WHERE "Ativa?" = true),
                'keywords', array_agg(DISTINCT "Keyword")
            )
            FROM "Scanner de videos do youtube"
            WHERE "Projeto_id" = p_project_id
        ),

        -- TOP CANAIS
        'top_channels', (
            SELECT json_agg(channel_data) FROM (
                SELECT
                    c."Nome" as channel_name,
                    c.channel_id,
                    c.subscriber_count,
                    c.is_active
                FROM "Canais do youtube" c
                WHERE c."Projeto" = p_project_id
                AND c.is_active = true
                ORDER BY c.subscriber_count DESC NULLS LAST
                LIMIT 5
            ) channel_data
        ),

        -- TIMESTAMP
        'last_updated', NOW()
    );

    RETURN result;
END;
$function$;