-- =============================================
-- Função: obter_comentarios_postados_por_projeto
-- Descrição: Retorna apenas mensagens de MONITORAMENTO direto (não respostas)
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
--
-- IMPORTANTE: Esta função retorna apenas mensagens de monitoramento
-- que são comentários diretos em vídeos (Comentario_Principais IS NULL)
-- e NÃO retorna respostas a comentários de usuários.
--
-- Parâmetros:
--   id_projeto: ID do projeto
--   pagina_atual: Página atual para paginação (default: 1)
--   itens_por_pagina: Quantidade de itens por página (default: 10)
--   filtro_respondido: Filtrar por status respondido (opcional)
--   filtro_mensagem: Filtrar por texto da mensagem (opcional)
--   filtro_video_id: Filtrar por ID do vídeo (opcional)
-- =============================================

DROP FUNCTION IF EXISTS obter_comentarios_postados_por_projeto(BIGINT, INT, INT, BOOLEAN, TEXT, BIGINT);

CREATE OR REPLACE FUNCTION obter_comentarios_postados_por_projeto(
    id_projeto BIGINT,
    pagina_atual INT DEFAULT 1,
    itens_por_pagina INT DEFAULT 10,
    filtro_respondido BOOLEAN DEFAULT NULL,
    filtro_mensagem TEXT DEFAULT NULL,
    filtro_video_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    mensagem_id BIGINT,
    mensagem_texto TEXT,
    mensagem_data TIMESTAMP WITH TIME ZONE,
    mensagem_respondido BOOLEAN,
    video_id BIGINT,
    video_youtube_id TEXT,
    video_titulo TEXT,
    video_visualizacoes BIGINT,
    video_likes BIGINT,
    video_comentarios BIGINT,
    relevance_score DOUBLE PRECISION,
    content_category TEXT,
    canal_id BIGINT,
    canal_nome TEXT,
    canal_youtube_id TEXT,
    canal_inscritos INTEGER,
    canal_visualizacoes BIGINT,
    total_registros BIGINT
) AS $$
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
$$ LANGUAGE plpgsql;