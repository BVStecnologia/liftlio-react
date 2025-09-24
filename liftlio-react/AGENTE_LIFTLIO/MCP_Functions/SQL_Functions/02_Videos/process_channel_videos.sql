-- =============================================
-- Função: process_channel_videos
-- Descrição: Processa vídeos de um canal do YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_channel_videos(bigint);

CREATE OR REPLACE FUNCTION public.process_channel_videos(p_channel_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    canal_record RECORD;
    video_ids TEXT[];
    processed_count INTEGER := 0;
    log_message TEXT := '';
    api_response JSONB;
    each_video_id TEXT;
    lock_acquired BOOLEAN;
    video_data JSONB;
    i INTEGER;
    new_video_id BIGINT;
    project_id BIGINT;
    ids_to_process TEXT;
    executed_ids TEXT;
    scanner_id_to_use BIGINT;
BEGIN
    -- Registrar início do processamento
    log_message := 'INÍCIO: process_channel_videos para canal ' || p_channel_id || ' em ' || now() || E'\\n';

    -- Buscar informações do canal e seu projeto
    SELECT c.*, p.id AS project_id
    INTO canal_record
    FROM public."Canais do youtube" c
    JOIN public."Projeto" p ON c."Projeto" = p.id
    WHERE c.id = p_channel_id;

    IF canal_record IS NULL THEN
        RETURN log_message || 'ERRO: Canal com ID ' || p_channel_id || ' não encontrado.';
    END IF;

    project_id := canal_record.project_id;
    ids_to_process := canal_record.processar;

    -- Verificar se há IDs para processar
    IF ids_to_process IS NULL OR ids_to_process = '' THEN
        RETURN log_message || 'AVISO: Nenhum ID para processar no canal ' || p_channel_id;
    END IF;

    -- Obter um scanner_id válido para o projeto
    SELECT id INTO scanner_id_to_use
    FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = project_id
    LIMIT 1;

    -- Adquirir bloqueio consultivo
    SELECT pg_try_advisory_lock(p_channel_id + 20000) INTO lock_acquired;

    IF NOT lock_acquired THEN
        RETURN log_message || 'ALERTA: Canal ' || p_channel_id || ' já está sendo processado por outra instância.';
    END IF;

    BEGIN
        -- Extrair e filtrar IDs de vídeos válidos
        video_ids := string_to_array(ids_to_process, ',');

        -- Filtrar IDs vazios ou palavras-chave SQL
        SELECT array_agg(id)
        INTO video_ids
        FROM (
            SELECT unnest(video_ids) AS id
            EXCEPT
            SELECT unnest(ARRAY['', 'NOT', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE']::text[]) AS id
        ) AS valid_ids
        WHERE length(id) > 0;

        -- Verificar se ainda há IDs válidos
        IF video_ids IS NULL OR array_length(video_ids, 1) = 0 THEN
            PERFORM pg_advisory_unlock(p_channel_id + 20000);
            RETURN log_message || 'AVISO: Nenhum ID válido para processar.';
        END IF;

        log_message := log_message || 'Processando ' || array_length(video_ids, 1) || ' IDs de vídeos' || E'\\n';

        -- Chamar a Edge Function com todos os IDs de uma vez
        BEGIN
            api_response := call_youtube_edge_function(
                project_id::INTEGER,
                array_to_string(video_ids, ',')
            );

            -- Processar vídeos retornados pela API
            IF api_response->'videos' IS NOT NULL AND jsonb_array_length(api_response->'videos') > 0 THEN
                FOR i IN 0..jsonb_array_length(api_response->'videos')-1 LOOP
                    video_data := api_response->'videos'->i;
                    each_video_id := video_data->>'videoId';

                    -- Verificar se o vídeo já existe
                    IF NOT EXISTS (SELECT 1 FROM "Videos" WHERE "VIDEO" = each_video_id) THEN
                        -- Inserir novo vídeo com flags especiais
                        BEGIN
                            INSERT INTO "Videos" (
                                "VIDEO",
                                "Keyword",
                                scanner_id,
                                view_count,
                                like_count,
                                comment_count,
                                video_title,
                                video_description,
                                video_tags,
                                "Channel",
                                channel_id_yotube,
                                canal,
                                comentarios_atualizados,
                                monitored
                            ) VALUES (
                                each_video_id,
                                'Canal Monitorado',
                                scanner_id_to_use,
                                (video_data->>'viewCount')::bigint,
                                (video_data->>'likeCount')::bigint,
                                (video_data->>'commentCount')::bigint,
                                video_data->>'title',
                                video_data->>'description',
                                video_data->>'tags',
                                video_data->>'channelTitle',
                                video_data->>'channelId',
                                p_channel_id,
                                true,
                                true
                            )
                            RETURNING id INTO new_video_id;

                            processed_count := processed_count + 1;
                            log_message := log_message || 'Vídeo inserido: ' || each_video_id || ' (ID: ' || new_video_id || ')' || E'\\n';
                        EXCEPTION
                            WHEN OTHERS THEN
                                log_message := log_message || 'Erro ao inserir vídeo ' || each_video_id || ': ' || SQLERRM || E'\\n';
                        END;
                    ELSE
                        -- Atualizar vídeo existente
                        BEGIN
                            UPDATE "Videos"
                            SET monitored = true,
                                comentarios_atualizados = true,
                                canal = p_channel_id
                            WHERE "VIDEO" = each_video_id;

                            log_message := log_message || 'Vídeo ' || each_video_id || ' já existe, marcado como monitorado' || E'\\n';
                        EXCEPTION
                            WHEN OTHERS THEN
                                log_message := log_message || 'Erro ao atualizar vídeo ' || each_video_id || ': ' || SQLERRM || E'\\n';
                        END;
                    END IF;
                END LOOP;
            ELSE
                log_message := log_message || 'Nenhum vídeo retornado da API' || E'\\n';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                log_message := log_message || 'Erro ao chamar a Edge Function: ' || SQLERRM || E'\\n';
        END;

        -- Atualizar o canal: mover IDs processados para o campo executed
        executed_ids := COALESCE(canal_record.executed, '');
        IF executed_ids <> '' THEN
            executed_ids := executed_ids || ',';
        END IF;
        executed_ids := executed_ids || array_to_string(video_ids, ',');

        UPDATE public."Canais do youtube"
        SET processar = '',
            executed = executed_ids
        WHERE id = p_channel_id;

        log_message := log_message || 'Canal ' || p_channel_id || ' atualizado: IDs movidos para executed' || E'\\n';

        -- Liberar bloqueio
        PERFORM pg_advisory_unlock(p_channel_id + 20000);
        RETURN log_message;
    EXCEPTION
        WHEN OTHERS THEN
            -- Garantir liberação de bloqueio em caso de erro
            IF lock_acquired THEN
                PERFORM pg_advisory_unlock(p_channel_id + 20000);
            END IF;
            RETURN 'Erro em process_channel_videos: ' || SQLERRM || E'\\n' || log_message;
    END;
END;
$function$;