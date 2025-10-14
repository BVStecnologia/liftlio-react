CREATE OR REPLACE FUNCTION public.fetch_and_store_comments_for_project(project_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    video_record RECORD;
    api_response JSONB;
    comment_data JSONB;
    next_page_token TEXT;
    comment_count INT;
BEGIN
    -- Busca todos os vídeos associados ao projeto
    FOR video_record IN
        SELECT v."VIDEO", v.id AS video_db_id, s."Projeto_id"
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
    LOOP
        comment_count := 0;
        next_page_token := NULL;

        -- Verifica se já existem comentários para este vídeo
        IF EXISTS (SELECT 1 FROM "Comentários" WHERE "VIDEO" = video_record.video_db_id) THEN
            RAISE NOTICE 'Comentários já existem para o vídeo %', video_record."VIDEO";
            CONTINUE;
        END IF;

        LOOP
            -- Chama a API do YouTube para buscar comentários
            SELECT get_youtube_video_comments(
                project_id := project_id,
                video_id := video_record."VIDEO",
                max_results := 100,
                page_token := next_page_token
            ) INTO api_response;

            -- Processa cada comentário na resposta
            FOR comment_data IN SELECT jsonb_array_elements(api_response->'get_youtube_video_comments'->'items')
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
                    video_record."VIDEO",
                    video_record.video_db_id
                );

                comment_count := comment_count + 1;
            END LOOP;

            -- Verifica se há mais páginas
            next_page_token := api_response->'get_youtube_video_comments'->>'nextPageToken';
            EXIT WHEN next_page_token IS NULL;
        END LOOP;

        RAISE NOTICE 'Inseridos % comentários para o vídeo %', comment_count, video_record."VIDEO";
    END LOOP;

    RAISE NOTICE 'Processo concluído para o projeto %', project_id;
END;
$function$