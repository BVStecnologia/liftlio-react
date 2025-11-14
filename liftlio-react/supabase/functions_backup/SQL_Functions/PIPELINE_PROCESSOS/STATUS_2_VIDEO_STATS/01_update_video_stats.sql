-- =============================================
-- Fun��o: update_video_stats
-- Descri��o: Atualiza estat�sticas de v�deos do YouTube para um projeto
-- Criado: 2025-01-24
-- =============================================

DROP FUNCTION IF EXISTS update_video_stats(bigint);

CREATE OR REPLACE FUNCTION public.update_video_stats(project_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    scanner_record RECORD;
    video_ids TEXT[];
    already_exists_ids TEXT[];
    processed_count INTEGER := 0;
    log_message TEXT := '';
    api_response JSONB;
    current_scanner_id BIGINT;
    each_video_id TEXT;
    is_sql_keyword BOOLEAN;
    only_sql_keywords BOOLEAN;
    lock_acquired BOOLEAN;
    video_data JSONB;
    i INTEGER;
    filtered_ids TEXT[];
    new_video_id BIGINT;
BEGIN
    -- Tenta adquirir bloqueio consultivo
    SELECT pg_try_advisory_lock(project_id) INTO lock_acquired;

    IF NOT lock_acquired THEN
        RETURN 'Projeto ' || project_id || ' j� est� sendo processado por outra inst�ncia.';
    END IF;

    log_message := 'Iniciando update_video_stats para o projeto ' || project_id || ' em ' || now() || E'\n';

    BEGIN
        -- Processar cada scanner ativo do projeto
        FOR scanner_record IN (
            SELECT id, "Keyword", "ID cache videos", "ID Verificado"
            FROM public."Scanner de videos do youtube"
            WHERE "Projeto_id" = project_id
            AND "Ativa?" = true
            AND "ID cache videos" IS NOT NULL
            AND "ID cache videos" <> ''
        ) LOOP
            current_scanner_id := scanner_record.id;
            log_message := log_message || 'Processando scanner ID: ' || current_scanner_id || E'\n';

            -- Extrair IDs de v�deos
            video_ids := string_to_array(scanner_record."ID cache videos", ',');

            -- Verificar palavras-chave SQL
            only_sql_keywords := TRUE;
            FOREACH each_video_id IN ARRAY video_ids
            LOOP
                IF each_video_id NOT IN ('NOT', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE') THEN
                    only_sql_keywords := FALSE;
                    EXIT;
                END IF;
            END LOOP;

            -- Pular scanner com apenas palavras-chave SQL
            IF only_sql_keywords THEN
                log_message := log_message || 'Pulando scanner com palavras-chave SQL' || E'\n';
                UPDATE public."Scanner de videos do youtube"
                SET "ID cache videos" = ''
                WHERE id = current_scanner_id;
                CONTINUE;
            END IF;

            -- Remover IDs j� verificados
            IF scanner_record."ID Verificado" IS NOT NULL AND scanner_record."ID Verificado" <> '' THEN
                already_exists_ids := string_to_array(scanner_record."ID Verificado", ',');
                SELECT array_agg(id)
                INTO video_ids
                FROM (
                    SELECT unnest(video_ids) AS id
                    EXCEPT
                    SELECT unnest(already_exists_ids) AS id
                ) AS unique_ids;
            END IF;

            -- Continuar se n�o h� IDs para processar
            IF video_ids IS NULL OR array_length(video_ids, 1) = 0 THEN
                log_message := log_message || 'Nenhum novo ID para processar' || E'\n';
                CONTINUE;
            END IF;

            -- Filtrar palavras-chave SQL dos IDs
            filtered_ids := ARRAY[]::TEXT[];
            FOREACH each_video_id IN ARRAY video_ids
            LOOP
                IF each_video_id NOT IN ('NOT', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE') THEN
                    filtered_ids := filtered_ids || each_video_id;
                END IF;
            END LOOP;
            video_ids := filtered_ids;

            log_message := log_message || 'Processando ' || array_length(video_ids, 1) || ' IDs' || E'\n';

            -- Chamar a Edge Function com todos os IDs de uma vez
            BEGIN
                api_response := call_youtube_edge_function(
                    project_id::INTEGER,
                    array_to_string(video_ids, ',')
                );

                -- Verificar se a resposta cont�m v�deos
                IF api_response->'videos' IS NOT NULL AND jsonb_array_length(api_response->'videos') > 0 THEN
                    -- Processar cada v�deo retornado
                    FOR i IN 0..jsonb_array_length(api_response->'videos')-1 LOOP
                        video_data := api_response->'videos'->i;
                        each_video_id := video_data->>'videoId';

                        -- Verificar se o v�deo j� existe
                        IF NOT EXISTS (SELECT 1 FROM "Videos" WHERE "VIDEO" = each_video_id) THEN
                            -- Inserir o v�deo com dados j� processados
                            BEGIN
                                INSERT INTO "Videos" (
                                    "VIDEO",
                                    "Keyword",
                                    scanner_id,
                                    view_count,
                                    like_count,
                                    comment_count,
                                    comment_count_youtube,
                                    video_title,
                                    video_description,
                                    video_tags,
                                    "Channel",
                                    channel_id_yotube
                                ) VALUES (
                                    each_video_id,
                                    scanner_record."Keyword",
                                    current_scanner_id,
                                    (video_data->>'viewCount')::bigint,
                                    (video_data->>'likeCount')::bigint,
                                    (video_data->>'commentCount')::bigint,
                                    (video_data->>'commentCount')::bigint,
                                    video_data->>'title',
                                    video_data->>'description',
                                    video_data->>'tags',
                                    video_data->>'channelTitle',
                                    video_data->>'channelId'
                                )
                                RETURNING id INTO new_video_id;

                                processed_count := processed_count + 1;
                                log_message := log_message || 'V�deo inserido: ' || each_video_id || ' (ID: ' || new_video_id || ')' || E'\n';
                            EXCEPTION
                                WHEN OTHERS THEN
                                    log_message := log_message || 'Erro ao inserir v�deo ' || each_video_id || ': ' || SQLERRM || E'\n';
                            END;
                        ELSE
                            log_message := log_message || 'V�deo ' || each_video_id || ' j� existe na tabela' || E'\n';
                        END IF;
                    END LOOP;
                ELSE
                    log_message := log_message || 'Nenhum v�deo retornado da API' || E'\n';
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    log_message := log_message || 'Erro ao chamar a Edge Function: ' || SQLERRM || E'\n';
            END;

            -- Atualizar o scanner
            UPDATE public."Scanner de videos do youtube"
            SET "ID Verificado" = CASE
                    WHEN "ID Verificado" IS NULL OR "ID Verificado" = ''
                    THEN array_to_string(video_ids, ',')
                    ELSE "ID Verificado" || ',' || array_to_string(video_ids, ',')
                END,
                "ID cache videos" = ''
            WHERE id = current_scanner_id;

            log_message := log_message || 'Scanner ' || current_scanner_id || ' atualizado: IDs verificados e cache limpo' || E'\n';
        END LOOP;

        -- Atualizar status do projeto
        UPDATE public."Projeto"
        SET status = '3'
        WHERE id = project_id;

        log_message := log_message || 'Status do projeto atualizado para 3' || E'\n';

        -- Iniciar processamento de coment�rios se necess�rio
        IF processed_count > 0 OR EXISTS (
            SELECT 1
            FROM "Videos" v
            JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
            WHERE s."Projeto_id" = project_id
              AND v.comentarios_atualizados = false
        ) THEN
            PERFORM start_video_processing(project_id::INTEGER);
            log_message := log_message || 'Iniciando processamento de coment�rios' || E'\n';
        END IF;

        -- Liberar bloqueio
        PERFORM pg_advisory_unlock(project_id);
        RETURN log_message;
    EXCEPTION
        WHEN OTHERS THEN
            -- Garantir que o bloqueio seja liberado em caso de erro
            IF lock_acquired THEN
                PERFORM pg_advisory_unlock(project_id);
            END IF;
            RETURN 'Erro em update_video_stats: ' || SQLERRM || E'\n' || log_message;
    END;
END;
$function$