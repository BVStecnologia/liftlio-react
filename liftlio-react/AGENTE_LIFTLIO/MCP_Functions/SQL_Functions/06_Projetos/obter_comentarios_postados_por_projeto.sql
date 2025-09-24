-- =============================================
-- Função: obter_comentarios_postados_por_projeto
-- Descrição: Obtém comentários postados de monitoramento de um projeto
-- Criado: 2025-01-24
-- Atualizado: Função com paginação e filtros para comentários
-- =============================================

CREATE OR REPLACE FUNCTION public.obter_comentarios_postados_por_projeto(id_projeto bigint, pagina_atual integer DEFAULT 1, itens_por_pagina integer DEFAULT 10, filtro_respondido boolean DEFAULT NULL::boolean, filtro_mensagem text DEFAULT NULL::text, filtro_video_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(mensagem_id bigint, mensagem_texto text, mensagem_data timestamp with time zone, mensagem_respondido boolean, video_id bigint, video_youtube_id text, video_titulo text, video_visualizacoes bigint, video_likes bigint, video_comentarios bigint, relevance_score double precision, content_category text, canal_id bigint, canal_nome text, canal_youtube_id text, canal_inscritos integer, canal_visualizacoes bigint, total_registros bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INT;
    v_total_registros BIGINT;
BEGIN
    -- Cálculo do deslocamento para paginação
    v_offset := (pagina_atual - 1) * itens_por_pagina;

    -- Contagem do total de registros (para metadados de paginação)
    -- IMPORTANTE: Apenas mensagens de MONITORAMENTO (não respostas)
    SELECT COUNT(*) INTO v_total_registros
    FROM public."Mensagens" m
    WHERE
        m.project_id = id_projeto
        AND m.video IS NOT NULL
        AND m."Comentario_Principais" IS NULL  -- APENAS monitoramento direto (não respostas)!
        AND (filtro_respondido IS NULL OR m.respondido = filtro_respondido)
        AND (filtro_mensagem IS NULL OR m.mensagem ILIKE '%' || filtro_mensagem || '%')
        AND (filtro_video_id IS NULL OR m.video = filtro_video_id);

    -- Consulta principal com paginação e filtros
    RETURN QUERY
    SELECT
        m.id AS mensagem_id,
        m.mensagem AS mensagem_texto,
        m.created_at AS mensagem_data,
        m.respondido AS mensagem_respondido,
        v.id AS video_id,
        v."VIDEO" AS video_youtube_id,
        v.video_title AS video_titulo,
        v.view_count AS video_visualizacoes,
        v.like_count AS video_likes,
        v.comment_count AS video_comentarios,
        v.relevance_score,
        v.content_category,
        c.id AS canal_id,
        c."Nome" AS canal_nome,
        c.channel_id AS canal_youtube_id,
        c.subscriber_count AS canal_inscritos,
        c.view_count AS canal_visualizacoes,
        v_total_registros
    FROM
        public."Mensagens" m
        LEFT JOIN public."Videos" v ON m.video = v.id
        LEFT JOIN public."Canais do youtube" c ON v.channel_id_yotube = c.channel_id
    WHERE
        m.project_id = id_projeto
        AND m.video IS NOT NULL
        AND m."Comentario_Principais" IS NULL  -- APENAS monitoramento direto (não respostas)!
        AND (filtro_respondido IS NULL OR m.respondido = filtro_respondido)
        AND (filtro_mensagem IS NULL OR m.mensagem ILIKE '%' || filtro_mensagem || '%')
        AND (filtro_video_id IS NULL OR m.video = filtro_video_id)
    ORDER BY
        m.created_at DESC
    LIMIT itens_por_pagina
    OFFSET v_offset;

    RETURN;
END;
$function$