-- =============================================
-- Função: fetch_and_store_comments_for_video
-- Descrição: Busca e armazena comentários de um vídeo do YouTube
-- Dependência de: process_pending_videos
-- Criado: 2025-01-27
-- Atualizado: 2025-10-25 - Adicionado limite global de 200 comentários por vídeo
--                          para evitar timeout em vídeos virais (50k+ comentários)
-- VERSÃO EM USO NO SUPABASE
-- =============================================

CREATE OR REPLACE FUNCTION fetch_and_store_comments_for_video(p_video_id TEXT, project_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    api_response JSONB;
    comment_thread JSONB;
    reply JSONB;
    next_page_token TEXT := NULL;
    v_video_db_id BIGINT;
    v_comment_id BIGINT;
    v_comments_disabled BOOLEAN := FALSE;
    v_comments_processed INTEGER := 0;
    max_comments_per_video INTEGER := 200;  -- ⭐ LIMITE GLOBAL: máximo de comentários coletados por vídeo
BEGIN
    -- Obter o ID do vídeo na tabela Videos
    SELECT id INTO v_video_db_id
    FROM "Videos"
    WHERE "VIDEO" = p_video_id;

    IF v_video_db_id IS NULL THEN
        RETURN 'Erro: Vídeo com ID ' || p_video_id || ' não encontrado na tabela Videos';
    END IF;

    BEGIN
        -- Tenta chamar a API do YouTube para buscar comentários
        api_response := get_youtube_video_comments(
            project_id := project_id,
            video_id := p_video_id,
            max_results := 50,
            page_token := next_page_token
        );

        -- Verifica se a resposta da API indica que os comentários estão desativados
        IF api_response->>'error' IS NOT NULL AND
           api_response#>>'{error,errors,0,reason}' = 'commentsDisabled' THEN
            v_comments_disabled := TRUE;
            -- Atualiza a tabela Videos para marcar comentários como desativados
            UPDATE "Videos"
            SET "comentarios_atualizados" = TRUE,
                "comentarios_desativados" = TRUE
            WHERE "VIDEO" = p_video_id;
            RETURN 'Comentários desativados para o vídeo ' || p_video_id;
        END IF;

        -- Se chegou aqui, os comentários estão ativos. Continua com o processamento normal
        LOOP
            -- ⭐ Verificar se já atingiu o limite global
            IF v_comments_processed >= max_comments_per_video THEN
                RAISE NOTICE 'Limite de % comentários atingido para vídeo %. Parando coleta.',
                    max_comments_per_video, p_video_id;
                EXIT;
            END IF;

            -- Verifica se a resposta da API é válida
            IF api_response IS NULL THEN
                RETURN 'Erro: Resposta da API inválida';
            END IF;

            -- Processa cada thread de comentário na resposta
            FOR comment_thread IN SELECT jsonb_array_elements(api_response->'items')
            LOOP
                -- ⭐ Parar se atingir limite no meio da página
                EXIT WHEN v_comments_processed >= max_comments_per_video;

                -- Tenta inserir o comentário principal
                INSERT INTO "Comentarios_Principais" (
                    "video_id",
                    "id_do_comentario",
                    "author_name",
                    "author_channel_id",
                    "text_display",
                    "text_original",
                    "like_count",
                    "published_at",
                    "updated_at",
                    "total_reply_count"
                ) VALUES (
                    v_video_db_id,
                    (comment_thread#>>'{snippet,topLevelComment,id}'),
                    (comment_thread#>>'{snippet,topLevelComment,snippet,authorDisplayName}'),
                    (comment_thread#>>'{snippet,topLevelComment,snippet,authorChannelId,value}'),
                    (comment_thread#>>'{snippet,topLevelComment,snippet,textDisplay}'),
                    (comment_thread#>>'{snippet,topLevelComment,snippet,textOriginal}'),
                    (comment_thread#>>'{snippet,topLevelComment,snippet,likeCount}')::INTEGER,
                    (comment_thread#>>'{snippet,topLevelComment,snippet,publishedAt}')::TIMESTAMP,
                    (comment_thread#>>'{snippet,topLevelComment,snippet,updatedAt}')::TIMESTAMP,
                    (comment_thread#>>'{snippet,totalReplyCount}')::INTEGER
                )
                ON CONFLICT (id_do_comentario)
                DO UPDATE SET
                    "total_reply_count" = EXCLUDED.total_reply_count,
                    "updated_at" = EXCLUDED.updated_at
                RETURNING id INTO v_comment_id;

                -- Se o comentário principal não foi inserido (devido a conflito), busca o ID existente
                IF v_comment_id IS NULL THEN
                    SELECT id INTO v_comment_id
                    FROM "Comentarios_Principais"
                    WHERE "id_do_comentario" = (comment_thread#>>'{snippet,topLevelComment,id}');
                END IF;

                v_comments_processed := v_comments_processed + 1;

                -- Processa as respostas, se houver
                IF (comment_thread#>>'{snippet,totalReplyCount}')::INTEGER > 0 THEN
                    FOR reply IN SELECT jsonb_array_elements(comment_thread#>'{replies,comments}')
                    LOOP
                        -- Verifica se v_comment_id não é NULL antes de inserir
                        IF v_comment_id IS NOT NULL THEN
                            INSERT INTO "Respostas_Comentarios" (
                                "video_id",
                                "parent_comment_id",
                                "comment_id",
                                "author_name",
                                "author_channel_id",
                                "text_display",
                                "text_original",
                                "like_count",
                                "published_at",
                                "updated_at"
                            ) VALUES (
                                v_video_db_id,
                                (reply#>>'{snippet,parentId}'),
                                v_comment_id,
                                (reply#>>'{snippet,authorDisplayName}'),
                                (reply#>>'{snippet,authorChannelId,value}'),
                                (reply#>>'{snippet,textDisplay}'),
                                (reply#>>'{snippet,textOriginal}'),
                                (reply#>>'{snippet,likeCount}')::INTEGER,
                                (reply#>>'{snippet,publishedAt}')::TIMESTAMP,
                                (reply#>>'{snippet,updatedAt}')::TIMESTAMP
                            )
                            ON CONFLICT DO NOTHING;

                            v_comments_processed := v_comments_processed + 1;
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;

            -- Verifica se há mais páginas
            next_page_token := api_response->>'nextPageToken';
            EXIT WHEN next_page_token IS NULL;

            -- Busca a próxima página de comentários
            api_response := get_youtube_video_comments(
                project_id := project_id,
                video_id := p_video_id,
                max_results := 50,
                page_token := next_page_token
            );
        END LOOP;

        -- Atualiza a tabela Videos para marcar que os comentários foram processados
        UPDATE "Videos"
        SET "comentarios_atualizados" = TRUE,
            "comentarios_desativados" = FALSE
        WHERE "VIDEO" = p_video_id;

        -- Executa a função get_filtered_comments com o ID do vídeo
        PERFORM get_filtered_comments(v_video_db_id);

        -- Mensagem de retorno com informação sobre limite
        IF v_comments_processed >= max_comments_per_video THEN
            RETURN 'Processo concluído com LIMITE ATINGIDO para o vídeo ' || p_video_id ||
                   '. Total de comentários processados: ' || v_comments_processed::TEXT ||
                   ' (potencialmente mais comentários disponíveis)';
        ELSE
            RETURN 'Processo concluído com sucesso para o vídeo ' || p_video_id ||
                   '. Total de comentários processados: ' || v_comments_processed::TEXT;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- Captura qualquer erro não tratado
            IF SQLERRM LIKE '%403%' AND SQLERRM LIKE '%commentsDisabled%' THEN
                -- Atualiza a tabela Videos para marcar comentários como desativados
                UPDATE "Videos"
                SET "comentarios_atualizados" = TRUE,
                    "comentarios_desativados" = TRUE
                WHERE "VIDEO" = p_video_id;
                RETURN 'Comentários desativados para o vídeo ' || p_video_id;
            ELSE
                RETURN 'Erro não tratado: ' || SQLERRM;
            END IF;
    END;
END;
$$ LANGUAGE plpgsql;
