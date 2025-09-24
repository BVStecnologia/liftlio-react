CREATE OR REPLACE FUNCTION public.update_video_stats_safe(project_id bigint)
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
    each_video_id TEXT;
    current_scanner_id BIGINT;
    video_api_data JSONB;
    video_item JSONB;
    new_video_id BIGINT;
    is_sql_keyword BOOLEAN;
    only_sql_keywords BOOLEAN;
    lock_acquired BOOLEAN;
BEGIN
    -- Tentar adquirir advisory lock (sem bloqueio - retorna falso se n�o conseguir)
    lock_acquired := pg_try_advisory_lock(project_id);

    IF NOT lock_acquired THEN
        RETURN 'Opera��o j� em andamento para o projeto ' || project_id || '. Tente novamente mais tarde.';
    END IF;

    -- Iniciar log
    log_message := 'Iniciando update_video_stats_safe para o projeto ' || project_id || ' em ' || now() || E'\n';

    BEGIN -- Bloco de tratamento de exce��es para garantir que o lock seja liberado
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

            -- Extrair IDs de v�deos n�o processados
            video_ids := string_to_array(scanner_record."ID cache videos", ',');

            -- NOVA VERIFICA��O: Checar se este scanner tem apenas palavras-chave SQL
            only_sql_keywords := TRUE;
            FOREACH each_video_id IN ARRAY video_ids
            LOOP
                IF each_video_id NOT IN ('NOT', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE') THEN
                    only_sql_keywords := FALSE;
                    EXIT; -- Sai do loop se encontrar pelo menos um ID v�lido
                END IF;
            END LOOP;

            -- Se o scanner cont�m apenas palavras-chave SQL como "NOT", pule-o completamente
            IF only_sql_keywords THEN
                log_message := log_message || 'Pulando completamente o scanner ID: ' || current_scanner_id ||
                               ' porque cont�m apenas palavras-chave SQL: ' || scanner_record."ID cache videos" || E'\n';

                -- Limpe apenas o campo "ID cache videos" sem transferir para "ID Verificado"
                UPDATE public."Scanner de videos do youtube"
                SET "ID cache videos" = ''
                WHERE id = current_scanner_id;

                log_message := log_message || 'Cache de IDs limpo para o scanner ' || current_scanner_id || E'\n';

                CONTINUE; -- Pula para o pr�ximo scanner
            END IF;

            -- Caso j� exista IDs verificados, remov�-los da lista para n�o processar novamente
            IF scanner_record."ID Verificado" IS NOT NULL AND scanner_record."ID Verificado" <> '' THEN
                already_exists_ids := string_to_array(scanner_record."ID Verificado", ',');

                -- Remover IDs j� verificados
                SELECT array_agg(id)
                INTO video_ids
                FROM (
                    SELECT unnest(video_ids) AS id
                    EXCEPT
                    SELECT unnest(already_exists_ids) AS id
                ) AS unique_ids;
            END IF;

            -- Se n�o h� IDs para processar, continue para o pr�ximo scanner
            IF video_ids IS NULL OR array_length(video_ids, 1) = 0 THEN
                log_message := log_message || 'Nenhum novo ID para processar no scanner ' || current_scanner_id || E'\n';
                CONTINUE;
            END IF;

            log_message := log_message || 'Encontrados ' || array_length(video_ids, 1) || ' novos IDs de v�deos para processar' || E'\n';

            -- Processar cada ID de v�deo
            FOREACH each_video_id IN ARRAY video_ids
            LOOP
                -- Verificar se � uma palavra-chave SQL - precisamos ter cuidado especial
                is_sql_keyword := each_video_id IN ('NOT', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE');

                -- Pular processamento se for palavra-chave SQL
                IF is_sql_keyword THEN
                    log_message := log_message || 'Pulando v�deo "' || each_video_id || '" (palavra-chave SQL)' || E'\n';
                    CONTINUE; -- Pula para a pr�xima itera��o do loop
                END IF;

                -- Verificar se o v�deo j� existe na tabela Videos
                IF NOT EXISTS (
                    SELECT 1
                    FROM "Videos"
                    WHERE "VIDEO" = each_video_id
                ) THEN
                    BEGIN
                        -- Tentar obter dados do v�deo da API do YouTube usando a fun��o correta
                        BEGIN
                            -- Usar a fun��o get_youtube_video_stats com os par�metros corretos
                            SELECT get_youtube_video_stats(
                                project_id := project_id::INTEGER,
                                video_ids := each_video_id,
                                parts := 'statistics,snippet,contentDetails'
                            )::jsonb INTO api_response;

                            -- Extrair os dados de v�deo da resposta
                            IF api_response IS NOT NULL AND
                               api_response[0]->'get_youtube_video_stats'->'items' IS NOT NULL AND
                               jsonb_array_length(api_response[0]->'get_youtube_video_stats'->'items') > 0 THEN
                                video_item := (api_response[0]->'get_youtube_video_stats'->'items'->0);
                            ELSE
                                video_item := NULL;
                            END IF;
                        EXCEPTION
                            WHEN OTHERS THEN
                                log_message := log_message || 'Erro ao buscar detalhes do v�deo ' || each_video_id || ': ' || SQLERRM || E'\n';
                                video_item := NULL;
                        END;

                        -- Inserir o novo v�deo na tabela Videos
                        INSERT INTO "Videos" (
                            "VIDEO",
                            "Keyword",
                            scanner_id,
                            view_count,
                            like_count,
                            comment_count,
                            video_title,
                            video_description,
                            video_tags
                        ) VALUES (
                            each_video_id,
                            scanner_record."Keyword",
                            current_scanner_id,
                            CASE WHEN video_item IS NOT NULL THEN (video_item->'statistics'->>'viewCount')::bigint ELSE NULL END,
                            CASE WHEN video_item IS NOT NULL THEN (video_item->'statistics'->>'likeCount')::bigint ELSE NULL END,
                            CASE WHEN video_item IS NOT NULL THEN (video_item->'statistics'->>'commentCount')::bigint ELSE NULL END,
                            CASE WHEN video_item IS NOT NULL THEN video_item->'snippet'->>'title' ELSE NULL END,
                            CASE WHEN video_item IS NOT NULL THEN video_item->'snippet'->>'description' ELSE NULL END,
                            CASE WHEN video_item IS NOT NULL AND video_item->'snippet' ? 'tags'
                                 THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(video_item->'snippet'->'tags')), ',')
                                 ELSE NULL
                            END
                        )
                        RETURNING id INTO new_video_id;

                        processed_count := processed_count + 1;

                        -- Se inserido com sucesso, adicionar ao log
                        IF new_video_id IS NOT NULL THEN
                            log_message := log_message || 'V�deo inserido: ' || each_video_id || ' (ID: ' || new_video_id || ')' || E'\n';
                        END IF;

                    EXCEPTION
                        WHEN OTHERS THEN
                            log_message := log_message || 'Erro ao inserir v�deo ' || each_video_id || ': ' || SQLERRM || E'\n';
                    END;
                ELSE
                    log_message := log_message || 'V�deo ' || each_video_id || ' j� existe na tabela' || E'\n';
                END IF;
            END LOOP;

            -- Atualizar o scanner para marcar os IDs como verificados e limpar o cache
            UPDATE public."Scanner de videos do youtube"
            SET "ID Verificado" = CASE
                    WHEN "ID Verificado" IS NULL OR "ID Verificado" = ''
                    THEN scanner_record."ID cache videos"
                    ELSE "ID Verificado" || ',' || scanner_record."ID cache videos"
                END,
                -- Limpar o campo "ID cache videos" ap�s processamento
                "ID cache videos" = ''
            WHERE id = current_scanner_id;

            log_message := log_message || 'Scanner ' || current_scanner_id || ' atualizado: IDs verificados e cache limpo' || E'\n';
        END LOOP;

        log_message := log_message || 'Processamento conclu�do. Total de novos v�deos inseridos: ' || processed_count || E'\n';

        -- REMOVIDO: Atualiza��o do status do projeto
        -- A fun��o n�o altera mais o status do projeto

        -- REMOVIDO: Inicializa��o do processamento de coment�rios
        -- A fun��o n�o inicia mais automaticamente o processamento de coment�rios

        -- Liberar o lock consultivo
        PERFORM pg_advisory_unlock(project_id);

        RETURN log_message;
    EXCEPTION
        WHEN OTHERS THEN
            -- Garantir que o lock seja liberado em caso de erro
            PERFORM pg_advisory_unlock(project_id);
            RETURN 'Erro em update_video_stats_safe: ' || SQLERRM || E'\n' || log_message;
    END;
END;
$function$