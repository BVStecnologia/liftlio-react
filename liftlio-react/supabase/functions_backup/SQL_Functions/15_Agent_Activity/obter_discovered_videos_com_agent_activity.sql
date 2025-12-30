-- =============================================
-- Função: obter_discovered_videos_com_agent_activity
-- Descrição: Retorna vídeos descobertos de MONITORAMENTO DE CANAIS
--            APENAS Sistema 1 (Comentario_Principais IS NULL)
--            com dados de atividade do agente Browser
-- Criado: 2025-12-27
-- Atualizado: 2025-12-30 - Mantém filtro Sistema 1 (monitoramento apenas)
-- =============================================

DROP FUNCTION IF EXISTS obter_discovered_videos_com_agent_activity(bigint, int, int);

CREATE OR REPLACE FUNCTION obter_discovered_videos_com_agent_activity(
    p_projeto_id bigint,
    p_pagina int DEFAULT 1,
    p_itens_por_pagina int DEFAULT 10
)
RETURNS TABLE (
    mensagem_id bigint,
    mensagem_texto text,
    mensagem_data timestamptz,
    mensagem_respondido boolean,
    video_id bigint,
    video_youtube_id text,
    video_titulo text,
    video_visualizacoes bigint,
    video_likes bigint,
    video_comentarios bigint,
    content_category text,
    relevance_score float,
    canal_id bigint,
    canal_nome text,
    canal_youtube_id text,
    sistema_tipo text,
    agent_task_id uuid,
    agent_task_type text,
    agent_status text,
    agent_duracao_segundos int,
    agent_started_at timestamptz,
    agent_completed_at timestamptz,
    agent_actions_result text,
    agent_success boolean,
    total_registros bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset int;
    v_total bigint;
BEGIN
    v_offset := (p_pagina - 1) * p_itens_por_pagina;

    -- Contar total (APENAS Sistema 1 - Monitoramento de Canais)
    SELECT COUNT(*)
    INTO v_total
    FROM "Mensagens" m
    JOIN "Videos" v ON m.video = v.id
    WHERE m.project_id = p_projeto_id
      AND m."Comentario_Principais" IS NULL  -- APENAS SISTEMA 1
      AND m.respondido = true;

    RETURN QUERY
    SELECT
        m.id as mensagem_id,
        m.mensagem as mensagem_texto,
        m.created_at as mensagem_data,
        m.respondido as mensagem_respondido,
        v.id as video_id,
        v."VIDEO" as video_youtube_id,
        v.video_title as video_titulo,
        COALESCE(v.view_count, 0) as video_visualizacoes,
        COALESCE(v.like_count, 0) as video_likes,
        COALESCE(v.comment_count, 0) as video_comentarios,
        COALESCE(v.content_category, 'Uncategorized') as content_category,
        COALESCE(v.relevance_score, 0.85) as relevance_score,
        c.id as canal_id,
        c."Nome" as canal_nome,
        c.channel_id as canal_youtube_id,
        'direct'::text as sistema_tipo,
        bt.id as agent_task_id,
        bt.task_type as agent_task_type,
        bt.status as agent_status,
        EXTRACT(EPOCH FROM (bt.completed_at - bt.started_at))::int as agent_duracao_segundos,
        bt.started_at as agent_started_at,
        bt.completed_at as agent_completed_at,
        COALESCE(bt.response->>'result', '') as agent_actions_result,
        COALESCE((bt.response->>'success')::boolean, false) as agent_success,
        v_total as total_registros
    FROM "Mensagens" m
    JOIN "Videos" v ON m.video = v.id
    LEFT JOIN "Canais do youtube" c ON v.canal = c.id
    LEFT JOIN browser_tasks bt ON (bt.metadata->>'mensagem_id')::bigint = m.id
        AND bt.task_type IN ('youtube_comment', 'youtube_reply')
    WHERE m.project_id = p_projeto_id
      AND m."Comentario_Principais" IS NULL  -- APENAS SISTEMA 1
      AND m.respondido = true
    ORDER BY m.created_at DESC
    LIMIT p_itens_por_pagina
    OFFSET v_offset;
END;
$$;
