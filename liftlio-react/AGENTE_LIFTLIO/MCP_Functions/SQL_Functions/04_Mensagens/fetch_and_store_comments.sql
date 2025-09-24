-- =============================================
-- Função: fetch_and_store_comments
-- Descrição: Busca e armazena comentários de vídeo do YouTube na tabela de comentários
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.fetch_and_store_comments(video_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_page_token TEXT := NULL;
    api_response JSONB;
    comment_data JSONB;
    comment_count INT := 0;
BEGIN
    -- Verifica se já existem comentários para este vídeo
    IF EXISTS (SELECT 1 FROM "Comentários" WHERE "VIDEO" = video_id) THEN
        RAISE NOTICE 'Comentários já existem para o vídeo %', video_id;
        RETURN;
    END IF;

    LOOP
        -- Chama a API do YouTube para buscar comentários
        SELECT get_youtube_video_comments(
            project_id := 17,  -- Ajuste conforme necessário
            video_id := video_id,
            max_results := 100,
            page_token := next_page_token
        ) INTO api_response;

        -- Processa cada comentário na resposta
        FOR comment_data IN SELECT jsonb_array_elements(api_response->'items')
        LOOP
            -- Insere o comentário na tabela
            INSERT INTO "Comentários" (
                "autor",
                "id da resposta",
                "id do comentario",
                "likes",
                "Quantidade de respostas",
                "video id",
                "VIDEO"
            ) VALUES (
                comment_data#>>'{snippet,topLevelComment,snippet,authorDisplayName}',
                comment_data#>>'{snippet,topLevelComment,id}',
                comment_data#>>'{id}',
                (comment_data#>>'{snippet,topLevelComment,snippet,likeCount}')::INTEGER,
                (comment_data#>>'{snippet,totalReplyCount}')::INTEGER,
                video_id,
                (SELECT id FROM "Videos" WHERE "VIDEO" = video_id)
            );

            comment_count := comment_count + 1;
        END LOOP;

        -- Verifica se há mais páginas
        next_page_token := api_response->>'nextPageToken';
        EXIT WHEN next_page_token IS NULL;
    END LOOP;

    RAISE NOTICE 'Inseridos % comentários para o vídeo %', comment_count, video_id;
END;
$function$