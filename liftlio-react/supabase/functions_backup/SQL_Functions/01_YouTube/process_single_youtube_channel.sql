-- =============================================
-- Função: process_single_youtube_channel
-- Descrição: Processa um único canal do YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_single_youtube_channel();

CREATE OR REPLACE FUNCTION public.process_single_youtube_channel()
 RETURNS TABLE(canal_id bigint, canal_nome text, videos_processados integer, videos_adicionados integer, videos_descartados integer, detalhes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    canal_record RECORD;
    v_token VARCHAR;
    http_response http_response;
    details_response http_response;
    v_url TEXT;
    v_data JSONB;
    v_details_data JSONB;
    v_video_id TEXT;
    v_videos_para_scan TEXT[];
    v_current_videos TEXT[];
    v_scan_time TIMESTAMP WITHOUT TIME ZONE := NOW();
    v_video_title TEXT;
    v_video_description TEXT;
    v_video_tags TEXT;
    v_view_count BIGINT;
    v_like_count BIGINT;
    v_comment_count BIGINT;
    v_processed_count INTEGER := 0;
    v_added_count INTEGER := 0;
    v_discarded_count INTEGER := 0;
    v_has_captions BOOLEAN;
    v_max_videos_per_channel INTEGER := 10;
    v_video_limit INTEGER := 3;
    v_items_count INTEGER;
BEGIN
    -- Selecionar um único canal para processamento
    SELECT c.id, c."Nome", c.channel_id, c."Projeto", c.last_video_check, c.videos_para_scann
    INTO canal_record
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    JOIN "Integrações" i ON p."Integrações" = i.id
    WHERE c.is_active = TRUE
      AND p.integracao_valida = TRUE
      AND i.ativo = TRUE
    ORDER BY
        CASE WHEN c.last_video_check IS NULL THEN 0 ELSE 1 END, -- Prioridade para canais nunca verificados
        c.last_video_check ASC                                  -- Em seguida, os verificados há mais tempo
    LIMIT 1;

    -- Verificar se encontrou algum canal
    IF canal_record.id IS NULL THEN
        RETURN QUERY SELECT
            NULL::BIGINT,
            'Nenhum canal disponível'::TEXT,
            0, 0, 0,
            'Não há canais ativos com integrações válidas para processar'::TEXT;
        RETURN;
    END IF;

    -- Log de início do processamento do canal
    INSERT INTO system_logs (operation, details)
    VALUES (
        'process_single_youtube_channel',
        format('Iniciando processamento do canal: %s (ID: %s)', canal_record."Nome", canal_record.id)
    );

    -- Obter token do YouTube para este projeto
    v_token := get_youtube_token(canal_record."Projeto");

    IF v_token IS NULL OR v_token = '' THEN
        INSERT INTO system_logs (operation, details, success)
        VALUES (
            'process_single_youtube_channel',
            format('Erro: Token não obtido para o projeto %s (canal %s)',
                   canal_record."Projeto", canal_record.id),
            FALSE
        );

        RETURN QUERY SELECT
            canal_record.id,
            canal_record."Nome",
            0, 0, 0,
            format('Erro: Token não obtido para o projeto %s', canal_record."Projeto")::TEXT;
        RETURN;
    END IF;

    -- Construir URL de busca para vídeos
    v_url := 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' ||
             canal_record.channel_id ||
             '&order=date&maxResults=' || v_max_videos_per_channel || '&type=video';

    -- Adicionar filtro de data se last_video_check existir
    IF canal_record.last_video_check IS NOT NULL THEN
        v_url := v_url || '&publishedAfter=' ||
                 TO_CHAR(canal_record.last_video_check AT TIME ZONE 'UTC',
                        'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    END IF;

    -- Log da URL da chamada
    INSERT INTO system_logs (operation, details)
    VALUES ('process_single_youtube_channel_debug', format('URL de chamada: %s', v_url));

    -- Fazer chamada à API
    SELECT * INTO http_response
    FROM http((
        'GET',
        v_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_token),
            http_header('Accept', 'application/json')
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Verificar resposta da API
    IF http_response.status = 200 THEN
        v_data := http_response.content::JSONB;
        v_items_count := jsonb_array_length(COALESCE(v_data->'items', '[]'::jsonb));

        -- Log do número de vídeos encontrados
        INSERT INTO system_logs (operation, details)
        VALUES (
            'process_single_youtube_channel',
            format('Canal %s: %s vídeos encontrados na pesquisa',
                  canal_record.id, v_items_count)
        );

        -- Se não houver vídeos, apenas atualizar timestamp e retornar
        IF v_items_count = 0 THEN
            UPDATE "Canais do youtube"
            SET last_video_check = v_scan_time
            WHERE id = canal_record.id;

            INSERT INTO system_logs (operation, details)
            VALUES (
                'process_single_youtube_channel',
                format('Canal %s: nenhum vídeo novo encontrado', canal_record.id)
            );

            RETURN QUERY SELECT
                canal_record.id,
                canal_record."Nome",
                0, 0, 0,
                'Nenhum vídeo novo encontrado, timestamp atualizado'::TEXT;
            RETURN;
        END IF;

        -- Converter lista de vídeos existente para array
        IF canal_record.videos_para_scann IS NOT NULL AND canal_record.videos_para_scann <> '' THEN
            v_current_videos := string_to_array(canal_record.videos_para_scann, ',');
        ELSE
            v_current_videos := ARRAY[]::TEXT[];
        END IF;

        -- Inicializar array de novos vídeos
        v_videos_para_scan := ARRAY[]::TEXT[];

        -- Limitar o número de vídeos a processar (se last_video_check é NULL, apenas 3 vídeos)
        v_video_limit := CASE
            WHEN canal_record.last_video_check IS NULL THEN 3
            ELSE v_items_count
        END;

        -- Log do limite de vídeos
        INSERT INTO system_logs (operation, details)
        VALUES (
            'process_single_youtube_channel',
            format('Canal %s: processando até %s vídeos dos %s encontrados',
                  canal_record.id, v_video_limit, v_items_count)
        );

        -- Processar cada vídeo encontrado - um por um, sequencialmente
        FOR i IN 0..LEAST(v_video_limit, v_items_count)-1 LOOP
            v_video_id := v_data->'items'->i->'id'->>'videoId';

            -- Log de processamento individual
            INSERT INTO system_logs (operation, details)
            VALUES (
                'process_single_youtube_channel',
                format('Processando vídeo %s/%s: ID %s do canal %s',
                       i+1, LEAST(v_video_limit, v_items_count), v_video_id, canal_record.id)
            );

            v_processed_count := v_processed_count + 1;

            -- Se o vídeo não existe na tabela
            IF v_video_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM "Videos" WHERE "VIDEO" = v_video_id
            ) THEN
                -- Verificar se tem legendas
                v_has_captions := check_video_has_captions(v_video_id);

                -- Log do resultado da verificação de legendas
                INSERT INTO system_logs (operation, details)
                VALUES (
                    'process_single_youtube_channel',
                    format('Vídeo %s: tem legendas = %s', v_video_id, v_has_captions)
                );

                -- Se tiver legendas, obter detalhes e inserir
                IF v_has_captions THEN
                    -- Obter detalhes do vídeo da API
                    SELECT * INTO details_response
                    FROM http((
                        'GET',
                        'https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=' || v_video_id,
                        ARRAY[
                            http_header('Authorization', 'Bearer ' || v_token),
                            http_header('Accept', 'application/json')
                        ]::http_header[],
                        NULL,
                        NULL
                    )::http_request);

                    -- Log da resposta de detalhes
                    INSERT INTO system_logs (operation, details)
                    VALUES (
                        'process_single_youtube_channel_debug',
                        format('Detalhes do vídeo %s: status %s',
                               v_video_id, details_response.status)
                    );

                    IF details_response.status = 200 THEN
                        v_details_data := details_response.content::JSONB;

                        IF jsonb_array_length(COALESCE(v_details_data->'items', '[]'::jsonb)) > 0 THEN
                            -- Extrair dados do vídeo
                            v_view_count := (v_details_data->'items'->0->'statistics'->>'viewCount')::BIGINT;
                            v_like_count := (v_details_data->'items'->0->'statistics'->>'likeCount')::BIGINT;
                            v_comment_count := (v_details_data->'items'->0->'statistics'->>'commentCount')::BIGINT;
                            v_video_title := v_details_data->'items'->0->'snippet'->>'title';
                            v_video_description := v_details_data->'items'->0->'snippet'->>'description';

                            -- Tratamento para tags
                            BEGIN
                                IF v_details_data->'items'->0->'snippet'->'tags' IS NOT NULL THEN
                                    v_video_tags := array_to_string(
                                        ARRAY(
                                            SELECT jsonb_array_elements_text(v_details_data->'items'->0->'snippet'->'tags')
                                        ),
                                        ', '
                                    );
                                ELSE
                                    v_video_tags := NULL;
                                END IF;
                            EXCEPTION
                                WHEN OTHERS THEN
                                    v_video_tags := NULL;
                            END;

                            -- Verificar comentários desativados
                            v_comment_count := COALESCE(v_comment_count, 0);

                            -- Inserir o vídeo
                            INSERT INTO "Videos" (
                                "VIDEO",
                                "Channel",
                                canal,
                                video_title,
                                video_description,
                                video_tags,
                                view_count,
                                like_count,
                                comment_count,
                                comentarios_desativados,
                                created_at
                            ) VALUES (
                                v_video_id,
                                canal_record."Nome",
                                canal_record.id,
                                v_video_title,
                                v_video_description,
                                v_video_tags,
                                v_view_count,
                                v_like_count,
                                v_comment_count,
                                v_comment_count = 0,
                                NOW()
                            );

                            -- Adicionar à lista de vídeos para scan
                            v_videos_para_scan := array_append(v_videos_para_scan, v_video_id);
                            v_added_count := v_added_count + 1;

                            -- Log de sucesso na adição
                            INSERT INTO system_logs (operation, details)
                            VALUES (
                                'process_single_youtube_channel',
                                format('✅ Vídeo %s adicionado com sucesso para canal %s',
                                       v_video_id, canal_record.id)
                            );
                        END IF;
                    ELSE
                        -- Log de erro ao obter detalhes
                        INSERT INTO system_logs (operation, details, success)
                        VALUES (
                            'process_single_youtube_channel',
                            format('Erro ao obter detalhes do vídeo %s: %s',
                                   v_video_id, details_response.content::text),
                            FALSE
                        );
                    END IF;
                ELSE
                    -- Se não tiver legendas, contabilizar como descartado
                    v_discarded_count := v_discarded_count + 1;

                    -- Log de vídeo descartado
                    INSERT INTO system_logs (operation, details)
                    VALUES (
                        'process_single_youtube_channel',
                        format('❌ Vídeo %s do canal %s descartado por falta de legendas',
                               v_video_id, canal_record.id)
                    );
                END IF;
            ELSE
                -- Log de vídeo já existente
                INSERT INTO system_logs (operation, details)
                VALUES (
                    'process_single_youtube_channel',
                    format('Vídeo %s ignorado (já existente ou ID inválido)', v_video_id)
                );
            END IF;

            -- Pequeno delay para evitar sobrecarga na API
            PERFORM pg_sleep(1);
        END LOOP;

        -- Combinar novos vídeos com a lista existente
        v_videos_para_scan := v_videos_para_scan || v_current_videos;

        -- Atualizar o canal com os novos vídeos
        UPDATE "Canais do youtube"
        SET videos_para_scann = array_to_string(v_videos_para_scan, ','),
            last_video_check = v_scan_time
        WHERE id = canal_record.id;

        -- Log de conclusão do canal
        INSERT INTO system_logs (operation, details)
        VALUES (
            'process_single_youtube_channel',
            format('Canal %s processado: %s vídeos processados, %s adicionados, %s descartados',
                   canal_record.id, v_processed_count, v_added_count, v_discarded_count)
        );

        -- Retornar resultados
        RETURN QUERY
        SELECT
            canal_record.id,
            canal_record."Nome",
            v_processed_count,
            v_added_count,
            v_discarded_count,
            format('Canal processado com sucesso. %s vídeos verificados, %s adicionados, %s descartados',
                   v_processed_count, v_added_count, v_discarded_count)::TEXT;
    ELSE
        -- Log de erro na chamada à API
        INSERT INTO system_logs (operation, details, success)
        VALUES (
            'process_single_youtube_channel',
            format('Erro na chamada à API para canal %s: %s',
                   canal_record.id, http_response.content::text),
            FALSE
        );

        -- Retornar erro
        RETURN QUERY
        SELECT
            canal_record.id,
            canal_record."Nome",
            0, 0, 0,
            format('Erro na API: %s', http_response.status)::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Log de erro global
    INSERT INTO system_logs (operation, details, success)
    VALUES (
        'process_single_youtube_channel',
        format('Erro global: %s', SQLERRM),
        FALSE
    );

    -- Retornar erro
    RETURN QUERY
    SELECT
        COALESCE(canal_record.id, NULL::BIGINT),
        COALESCE(canal_record."Nome", 'Erro'::TEXT),
        v_processed_count,
        v_added_count,
        v_discarded_count,
        ('Erro: ' || SQLERRM)::TEXT;
END;
$function$;