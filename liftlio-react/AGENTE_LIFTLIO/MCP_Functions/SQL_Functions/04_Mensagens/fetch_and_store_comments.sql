-- =============================================
-- Fun��o: fetch_and_store_comments
-- Descri��o: Busca e armazena coment�rios de v�deo do YouTube na tabela de coment�rios
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
    -- Verifica se j� existem coment�rios para este v�deo
    IF EXISTS (SELECT 1 FROM "Coment�rios" WHERE "VIDEO" = video_id) THEN
        RAISE NOTICE 'Coment�rios j� existem para o v�deo %', video_id;
        RETURN;
    END IF;

    LOOP
        -- Chama a API do YouTube para buscar coment�rios
        SELECT get_youtube_video_comments(
            project_id := 17,  -- Ajuste conforme necess�rio
            video_id := video_id,
            max_results := 100,
            page_token := next_page_token
        ) INTO api_response;

        -- Processa cada coment�rio na resposta
        FOR comment_data IN SELECT jsonb_array_elements(api_response->'items')
        LOOP
            -- Insere o coment�rio na tabela
            INSERT INTO "Coment�rios" (
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

        -- Verifica se h� mais p�ginas
        next_page_token := api_response->>'nextPageToken';
        EXIT WHEN next_page_token IS NULL;
    END LOOP;

    RAISE NOTICE 'Inseridos % coment�rios para o v�deo %', comment_count, video_id;
END;
$function$