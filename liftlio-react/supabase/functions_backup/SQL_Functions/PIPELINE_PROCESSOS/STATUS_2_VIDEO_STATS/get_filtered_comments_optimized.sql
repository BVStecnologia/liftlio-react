-- =============================================
-- Função: get_filtered_comments (OTIMIZADA)
-- Descrição: Filtra comentários usando palavras-chave do projeto e Full-Text Search
-- Criado: 2024-01-24
-- Atualizado: 2025-01-26 - Adiciona palavras-chave personalizadas e otimização 30x
-- Atualizado: 2025-10-27 - Melhorias: sweet spot timing (14-30 dias),
--                          bonus visibilidade (órfãos), deduplicação inteligente
-- Atualizado: 2025-11-11 - CRÍTICO: Adiciona chamada curate_comments_with_claude
--                          para curadoria final 50→2-10 comentários LED
-- Atualizado: 2025-11-12 - OTIMIZAÇÃO: Reduz LIMIT de 100→50 para evitar timeout
-- Atualizado: 2025-11-12 - SÍNCRONO: Curadoria Claude roda de forma síncrona
--                          50 comentários completam em ~90-120s (OK com timeout 180s)
-- Atualizado: 2025-11-12 - CRÍTICO: Removida chamada curate_comments_with_claude
--                          (causava loop/timeout quando chamada diretamente)
-- Atualizado: 2025-11-13 - ASYNC: Adiciona trigger dblink via UPDATE curadoria_trigger
--                          Dispara curate em background (~10ms sem bloqueio)
-- =============================================

DROP FUNCTION IF EXISTS get_filtered_comments(bigint);

CREATE OR REPLACE FUNCTION public.get_filtered_comments(video_id_param bigint)
RETURNS TABLE(
    comment_id bigint,
    comment_youtube_id text,
    comment_text text,
    comment_author text,
    comment_published_at timestamp with time zone,
    comment_likes integer,
    comment_relevance_score double precision
)
LANGUAGE plpgsql
AS $function$
DECLARE
    selected_ids bigint[];
    total_comments integer;
    project_id bigint;
    project_keywords text;
    search_query tsquery;
BEGIN
    -- Buscar projeto e palavras-chave através do primeiro comentário
    SELECT DISTINCT cp.project_id, p.palavras_chaves_p_comments
    INTO project_id, project_keywords
    FROM "Comentarios_Principais" cp
    LEFT JOIN "Projeto" p ON p.id = cp.project_id
    WHERE cp.video_id = video_id_param
    LIMIT 1;

    -- Construir query de busca se temos palavras-chave
    IF project_keywords IS NOT NULL AND project_keywords != '' THEN
        -- Usar plainto_tsquery para simplificar
        search_query := plainto_tsquery('english', replace(project_keywords, ',', ' '));
    END IF;

    -- 1. Selecionar IDs dos melhores comentários
    selected_ids := ARRAY(
        WITH comment_replies AS (
            -- Contar respostas por comentário principal
            SELECT
                cp.id as main_comment_id,
                COUNT(rc.id) as reply_count
            FROM "Comentarios_Principais" cp
            LEFT JOIN "Respostas_Comentarios" rc
                ON rc.parent_comment_id = cp.id_do_comentario
            WHERE cp.video_id = video_id_param
            GROUP BY cp.id
        ),
        ranked_comments AS (
            SELECT
                cp.id,
                cp.published_at,
                cp.text_display,
                cp.author_name,
                COALESCE(cr.reply_count, 0) as total_replies,
                (
                    -- Score base de relevância
                    COALESCE(cp.like_count::float, 0) * 0.2 +  -- Reduzido de 0.3 para 0.2
                    (CASE
                        WHEN LENGTH(cp.text_display) BETWEEN 50 AND 500 THEN 30.0
                        WHEN LENGTH(cp.text_display) > 500 THEN 20.0
                        ELSE 10.0
                    END) +
                    -- RECÊNCIA AJUSTADA (sweet spot 14-30 dias)
                    (CASE
                        WHEN cp.published_at > NOW() - INTERVAL '7 days' THEN 10.0   -- Muito novo
                        WHEN cp.published_at > NOW() - INTERVAL '14 days' THEN 18.0  -- Esquentando
                        WHEN cp.published_at > NOW() - INTERVAL '30 days' THEN 30.0  -- ⭐ SWEET SPOT
                        WHEN cp.published_at > NOW() - INTERVAL '45 days' THEN 22.0  -- Ainda bom
                        WHEN cp.published_at > NOW() - INTERVAL '60 days' THEN 15.0  -- Esfriando
                        WHEN cp.published_at > NOW() - INTERVAL '90 days' THEN 8.0   -- Frio
                        ELSE 3.0                                                       -- Muito frio
                    END) +
                    -- BONUS VISIBILIDADE (órfãos = alta visibilidade)
                    (CASE
                        WHEN COALESCE(cr.reply_count, 0) = 0 THEN 35.0      -- Órfão = ouro
                        WHEN cr.reply_count BETWEEN 1 AND 2 THEN 25.0       -- Baixa concorrência
                        WHEN cr.reply_count BETWEEN 3 AND 5 THEN 15.0       -- Média concorrência
                        WHEN cr.reply_count BETWEEN 6 AND 10 THEN 5.0       -- Alta concorrência
                        ELSE 0                                                -- Enterrado
                    END) +
                    -- BONUS para comentários com palavras-chave de intenção de compra
                    (CASE
                        WHEN search_query IS NOT NULL
                             AND to_tsvector('english', cp.text_display) @@ search_query
                        THEN 100.0  -- Grande bonus para intenção de compra
                        ELSE 0
                    END)
                )::float as relevance_score
            FROM "Comentarios_Principais" cp
            LEFT JOIN comment_replies cr ON cr.main_comment_id = cp.id
            WHERE
                cp.video_id = video_id_param
                AND cp.text_display IS NOT NULL
                AND LENGTH(TRIM(cp.text_display)) > 20
                -- Otimização: usar regex único ao invés de múltiplos ILIKE (30x mais rápido)
                AND cp.text_display !~ 'https?://|www\.|@'
                -- DEDUPLICAÇÃO INTELIGENTE: mantém melhor comentário por autor (não o primeiro)
                AND cp.id = (
                    SELECT cp2.id
                    FROM "Comentarios_Principais" cp2
                    WHERE cp2.video_id = video_id_param
                      AND cp2.author_name = cp.author_name
                    ORDER BY
                        -- Prioriza comentários com keywords do projeto
                        (CASE
                            WHEN search_query IS NOT NULL
                                 AND to_tsvector('english', cp2.text_display) @@ search_query
                            THEN 1
                            ELSE 0
                        END) DESC,
                        -- Depois por tamanho (comentários substantivos)
                        LENGTH(cp2.text_display) DESC,
                        -- Depois por likes
                        cp2.like_count DESC
                    LIMIT 1
                )
        )
        SELECT id
        FROM ranked_comments
        ORDER BY relevance_score DESC, published_at DESC
        LIMIT 50
    );

    -- 2. Deletar registros em Settings se existirem
    IF EXISTS (
        SELECT 1
        FROM "Settings messages posts"
        WHERE "Videos" = video_id_param
    ) THEN
        DELETE FROM "Settings messages posts"
        WHERE "Videos" = video_id_param
        AND "Comentarios_Principal" IN (
            SELECT id
            FROM "Comentarios_Principais"
            WHERE video_id = video_id_param
            AND id != ALL(selected_ids)
        );
    END IF;

    -- 3. Deletar respostas
    DELETE FROM "Respostas_Comentarios" rc
    WHERE rc.comment_id IN (
        SELECT id
        FROM "Comentarios_Principais"
        WHERE video_id = video_id_param
        AND id != ALL(selected_ids)
    );

    -- 4. Deletar comentários principais
    DELETE FROM "Comentarios_Principais"
    WHERE video_id = video_id_param
    AND id != ALL(selected_ids);

    -- 5. Atualizar contagem
    SELECT COUNT(*) INTO total_comments
    FROM "Comentarios_Principais"
    WHERE video_id = video_id_param;

    UPDATE "Videos"
    SET comment_count = total_comments
    WHERE id = video_id_param;

    -- 🚨 REMOVIDO: Chamada curate_comments_with_claude (causava loop/timeout)
    -- AGORA: curate_comments_with_claude chama get_filtered_comments (não o contrário!)

    -- 6. Retornar resultados priorizando intenção de compra
    RETURN QUERY
    WITH comment_replies_final AS (
        SELECT
            cp.id as main_comment_id,
            COUNT(rc.id) as reply_count
        FROM "Comentarios_Principais" cp
        LEFT JOIN "Respostas_Comentarios" rc
            ON rc.parent_comment_id = cp.id_do_comentario
        WHERE cp.id = ANY(selected_ids)
        GROUP BY cp.id
    )
    SELECT
        cp.id as comment_id,
        cp.id_do_comentario as comment_youtube_id,
        cp.text_display as comment_text,
        cp.author_name as comment_author,
        cp.published_at as comment_published_at,
        cp.like_count as comment_likes,
        (
            COALESCE(cp.like_count::float, 0) * 0.2 +
            (CASE
                WHEN LENGTH(cp.text_display) BETWEEN 50 AND 500 THEN 30.0
                WHEN LENGTH(cp.text_display) > 500 THEN 20.0
                ELSE 10.0
            END) +
            (CASE
                WHEN cp.published_at > NOW() - INTERVAL '7 days' THEN 10.0
                WHEN cp.published_at > NOW() - INTERVAL '14 days' THEN 18.0
                WHEN cp.published_at > NOW() - INTERVAL '30 days' THEN 30.0
                WHEN cp.published_at > NOW() - INTERVAL '45 days' THEN 22.0
                WHEN cp.published_at > NOW() - INTERVAL '60 days' THEN 15.0
                WHEN cp.published_at > NOW() - INTERVAL '90 days' THEN 8.0
                ELSE 3.0
            END) +
            (CASE
                WHEN COALESCE(crf.reply_count, 0) = 0 THEN 35.0
                WHEN crf.reply_count BETWEEN 1 AND 2 THEN 25.0
                WHEN crf.reply_count BETWEEN 3 AND 5 THEN 15.0
                WHEN crf.reply_count BETWEEN 6 AND 10 THEN 5.0
                ELSE 0
            END) +
            (CASE
                WHEN search_query IS NOT NULL
                     AND to_tsvector('english', cp.text_display) @@ search_query
                THEN 100.0
                ELSE 0
            END)
        )::float as comment_relevance_score
    FROM "Comentarios_Principais" cp
    LEFT JOIN comment_replies_final crf ON crf.main_comment_id = cp.id
    WHERE cp.id = ANY(selected_ids)
    ORDER BY comment_relevance_score DESC, comment_published_at DESC;

    -- =============================================
    -- DISPARA CURADORIA ASYNC VIA TRIGGER
    -- =============================================
    -- Ativa trigger dblink async (não bloqueia!)
    -- Trigger dispara em ~10ms e retorna imediatamente
    -- curate_comments_with_claude roda em background
    UPDATE "Videos"
    SET curadoria_trigger = 1
    WHERE id = video_id_param;

    RAISE NOTICE '🎯 Curadoria async agendada para vídeo %', video_id_param;
END;
$function$;