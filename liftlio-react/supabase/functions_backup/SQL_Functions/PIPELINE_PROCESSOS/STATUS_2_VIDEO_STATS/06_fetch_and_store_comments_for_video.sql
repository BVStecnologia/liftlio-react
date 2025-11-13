-- =============================================
-- Função: fetch_and_store_comments_for_video
-- Descrição: Busca e armazena comentários de um vídeo do YouTube
-- Dependência de: process_pending_videos
-- Criado: 2025-01-27
-- Atualizado: 2025-11-13 - CORREÇÃO CRÍTICA: Bug de paginação corrigido!
--                          Problema: Chamada API estava no FINAL do loop, então só processava 1ª página (50 comentários)
--                          Solução: Movida chamada API para INÍCIO do loop, agora processa TODAS as páginas
--                          + Contador corrigido: conta apenas comentários NOVOS (não duplicados)
--                          + REMOVIDA chamada get_filtered_comments (deletava 150 comentários!)
--                          Limite: 200 comentários principais NOVOS por execução
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
    v_main_comments_processed INTEGER := 0;  -- ⭐ Conta APENAS comentários principais NOVOS
    v_total_replies_processed INTEGER := 0;  -- ℹ️ Contador informativo de respostas
    v_was_inserted BOOLEAN;  -- 🆕 Flag para saber se foi INSERT ou UPDATE
    max_main_comments INTEGER := 200;  -- ⭐ LIMITE: máximo de comentários PRINCIPAIS por vídeo
BEGIN
    -- Obter o ID do vídeo na tabela Videos
    SELECT id INTO v_video_db_id
    FROM "Videos"
    WHERE "VIDEO" = p_video_id;

    IF v_video_db_id IS NULL THEN
        RETURN 'Erro: Vídeo com ID ' || p_video_id || ' não encontrado na tabela Videos';
    END IF;

    BEGIN
        -- Se chegou aqui, os comentários estão ativos. Continua com o processamento normal
        LOOP
            -- ⭐ Chamada API no INÍCIO do loop (correção do bug de paginação)
            api_response := get_youtube_video_comments(
                project_id := project_id,
                video_id := p_video_id,
                max_results := 100,  -- Máximo permitido pela API (otimizado de 50 para 100)
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

            -- Verifica se a resposta da API é válida
            IF api_response IS NULL THEN
                RETURN 'Erro: Resposta da API inválida';
            END IF;

            -- Processa cada thread de comentário na resposta
            FOR comment_thread IN SELECT jsonb_array_elements(api_response->'items')
            LOOP
                -- ⭐ Parar se atingiu limite de comentários PRINCIPAIS NOVOS
                EXIT WHEN v_main_comments_processed >= max_main_comments;

                -- 🔍 Verificar se comentário já existe ANTES de tentar inserir
                SELECT id INTO v_comment_id
                FROM "Comentarios_Principais"
                WHERE "id_do_comentario" = (comment_thread#>>'{snippet,topLevelComment,id}');

                v_was_inserted := (v_comment_id IS NULL);

                -- Se não existe, insere novo comentário
                IF v_was_inserted THEN
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
                    RETURNING id INTO v_comment_id;

                    -- ⭐ Incrementa contador APENAS se for comentário NOVO
                    v_main_comments_processed := v_main_comments_processed + 1;
                ELSE
                    -- Se já existe, apenas atualiza (NÃO incrementa contador)
                    UPDATE "Comentarios_Principais"
                    SET "total_reply_count" = (comment_thread#>>'{snippet,totalReplyCount}')::INTEGER,
                        "updated_at" = (comment_thread#>>'{snippet,topLevelComment,snippet,updatedAt}')::TIMESTAMP
                    WHERE id = v_comment_id;
                END IF;

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

                            -- ℹ️ Incrementa contador informativo de respostas (NÃO afeta limite)
                            v_total_replies_processed := v_total_replies_processed + 1;
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;

            -- ⭐ Verifica se atingiu o limite APÓS processar a página completa
            IF v_main_comments_processed >= max_main_comments THEN
                RAISE NOTICE 'Limite de % comentários principais atingido para vídeo %. Total respostas: %. Parando coleta.',
                    max_main_comments, p_video_id, v_total_replies_processed;
                EXIT;
            END IF;

            -- Verifica se há mais páginas para continuar o loop
            next_page_token := api_response->>'nextPageToken';
            EXIT WHEN next_page_token IS NULL;
        END LOOP;

        -- Atualiza a tabela Videos para marcar que os comentários foram processados
        UPDATE "Videos"
        SET "comentarios_atualizados" = TRUE,
            "comentarios_desativados" = FALSE
        WHERE "VIDEO" = p_video_id;

        -- ⚠️ REMOVIDO: PERFORM get_filtered_comments(v_video_db_id);
        -- Motivo: get_filtered_comments DELETA comentários, mantendo apenas os 50 melhores
        -- Essa função deve ser chamada SEPARADAMENTE quando necessário

        -- Mensagem de retorno detalhada
        IF v_main_comments_processed >= max_main_comments THEN
            RETURN '✅ LIMITE ATINGIDO: ' || v_main_comments_processed::TEXT ||
                   ' comentários novos, ' || v_total_replies_processed::TEXT || ' respostas';
        ELSE
            RETURN '✅ COMPLETO: ' || v_main_comments_processed::TEXT ||
                   ' comentários novos, ' || v_total_replies_processed::TEXT || ' respostas';
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
