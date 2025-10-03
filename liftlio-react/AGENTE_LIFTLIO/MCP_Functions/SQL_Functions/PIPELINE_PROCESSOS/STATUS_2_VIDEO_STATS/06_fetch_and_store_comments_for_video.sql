-- =============================================
-- Função: fetch_and_store_comments_for_video
-- Descrição: Busca e armazena comentários de um vídeo do YouTube
-- Dependência de: process_pending_videos
-- Criado: 2025-01-27
-- VERSÃO EM USO NO SUPABASE
-- =============================================

CREATE OR REPLACE FUNCTION public.fetch_and_store_comments_for_video(p_video_id text, project_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_response JSONB;
    comment_thread JSONB;
    reply JSONB;
    next_page_token TEXT := NULL;
    v_video_db_id BIGINT;
    v_comment_id BIGINT;
BEGIN
    -- Obter o ID do vídeo na tabela Videos
    SELECT id INTO v_video_db_id
    FROM "Videos"
    WHERE "VIDEO" = p_video_id;

    IF v_video_db_id IS NULL THEN
        RETURN 'Erro: Vídeo com ID ' || p_video_id || ' não encontrado na tabela Videos';
    END IF;

    LOOP
        -- Chama a API do YouTube para buscar comentários
        SELECT get_youtube_video_comments(
            project_id := project_id,
            video_id := p_video_id,
            max_results := 100,
            page_token := next_page_token
        ) INTO api_response;

        -- Verifica se a resposta da API é válida
        IF api_response IS NULL THEN
            RETURN 'Erro: Resposta da API inválida';
        END IF;

        -- Processa cada thread de comentário na resposta
        FOR comment_thread IN SELECT jsonb_array_elements(api_response->'items')
        LOOP
            -- Insere o comentário principal
            INSERT INTO public."Comentarios_Principais" (
                video_id,
                comment_id,
                author_name,
                author_channel_id,
                like_count,
                published_at,
                updated_at,
                text_display,
                text_original,
                total_reply_count
            ) VALUES (
                v_video_db_id,
                comment_thread#>>'{id}',
                comment_thread#>>'{snippet,topLevelComment,snippet,authorDisplayName}',
                comment_thread#>>'{snippet,topLevelComment,snippet,authorChannelId,value}',
                (comment_thread#>>'{snippet,topLevelComment,snippet,likeCount}')::INTEGER,
                (comment_thread#>>'{snippet,topLevelComment,snippet,publishedAt}')::TIMESTAMP WITH TIME ZONE,
                (comment_thread#>>'{snippet,topLevelComment,snippet,updatedAt}')::TIMESTAMP WITH TIME ZONE,
                comment_thread#>>'{snippet,topLevelComment,snippet,textDisplay}',
                comment_thread#>>'{snippet,topLevelComment,snippet,textOriginal}',
                (comment_thread#>>'{snippet,totalReplyCount}')::INTEGER
            ) RETURNING id INTO v_comment_id;

            -- Processa as respostas, se houver
            IF comment_thread#>'{replies,comments}' IS NOT NULL THEN
                FOR reply IN SELECT jsonb_array_elements(comment_thread#>'{replies,comments}')
                LOOP
                    INSERT INTO public."Respostas_Comentarios" (
                        video_id,
                        parent_comment_id,
                        comment_id,
                        author_name,
                        author_channel_id,
                        like_count,
                        published_at,
                        updated_at,
                        text_display,
                        text_original
                    ) VALUES (
                        v_video_db_id,
                        comment_thread#>>'{id}',
                        v_comment_id,
                        reply#>>'{snippet,authorDisplayName}',
                        reply#>>'{snippet,authorChannelId,value}',
                        (reply#>>'{snippet,likeCount}')::INTEGER,
                        (reply#>>'{snippet,publishedAt}')::TIMESTAMP WITH TIME ZONE,
                        (reply#>>'{snippet,updatedAt}')::TIMESTAMP WITH TIME ZONE,
                        reply#>>'{snippet,textDisplay}',
                        reply#>>'{snippet,textOriginal}'
                    );
                END LOOP;
            END IF;
        END LOOP;

        -- Verifica se há mais páginas
        next_page_token := api_response->>'nextPageToken';
        EXIT WHEN next_page_token IS NULL;
    END LOOP;

    RETURN 'Processo concluído com sucesso para o vídeo ' || p_video_id;
EXCEPTION WHEN OTHERS THEN
    RETURN 'Erro não tratado: ' || SQLERRM;
END;
$function$