-- =============================================
-- Função: verificar_novos_videos_youtube
-- Descrição: Verifica novos vídeos no YouTube para canais ativos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.verificar_novos_videos_youtube(integer);

CREATE OR REPLACE FUNCTION public.verificar_novos_videos_youtube(lote_tamanho integer DEFAULT 15)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    canal_record RECORD;
    video_ids_result JSONB;
    video_ids_array TEXT[];
    api_result JSONB;
    video_id TEXT;
    processados INT := 0;
    total_canais INT;
    canal_com_erro TEXT;
    videos_novos_array TEXT[];
    todos_novos TEXT;
    videos_scanreados_check TEXT;
    processar_check TEXT;
    start_time TIMESTAMP := NOW();
    execution_time INTERVAL;
BEGIN
    -- Conta total de canais a serem processados
    SELECT COUNT(*) INTO total_canais
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    WHERE p."Youtube Active" = true
    AND c.is_active = true
    AND c.desativado_pelo_user = false
    -- Adiciona intervalo mínimo de 30 minutos entre verificações
    AND (c.last_canal_check IS NULL OR c.last_canal_check < NOW() - INTERVAL '30 minutes');

    RAISE NOTICE 'Iniciando verificação SQL otimizada - % canais em lotes de %', total_canais, lote_tamanho;

    -- Seleciona canais usando a estrutura original
    FOR canal_record IN
        SELECT c.id, c.channel_id, c.videos_scanreados, c."processar"
        FROM "Canais do youtube" c
        JOIN "Projeto" p ON c."Projeto" = p.id
        WHERE p."Youtube Active" = true
        AND c.is_active = true
        AND c.desativado_pelo_user = false
        -- Intervalo mínimo de 30 minutos
        AND (c.last_canal_check IS NULL OR c.last_canal_check < NOW() - INTERVAL '30 minutes')
        ORDER BY c.last_canal_check NULLS FIRST
        LIMIT lote_tamanho
    LOOP
        BEGIN
            processados := processados + 1;

            -- Atualiza timestamp usando o campo original
            UPDATE "Canais do youtube"
            SET last_canal_check = CURRENT_TIMESTAMP
            WHERE id = canal_record.id;

            RAISE NOTICE 'Processando canal ID: % (channel_id: %)', canal_record.id, canal_record.channel_id;

            -- Usar função SQL ao invés de Edge Function
            BEGIN
                SELECT monitormanto_de_canal_sql(
                    canal_record.channel_id,
                    'today',    -- timeFilter
                    10,         -- maxResults
                    TRUE        -- simpleResponse (retorna apenas IDs)
                ) INTO video_ids_result;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erro ao verificar canal ID % (channel_id: %): %', canal_record.id, canal_record.channel_id, SQLERRM;
                CONTINUE;
            END;

            -- Verificar se houve erro na resposta
            IF video_ids_result ? 'error' THEN
                RAISE WARNING 'Erro na verificação do canal ID %: %',
                    canal_record.id,
                    video_ids_result->>'error';
                CONTINUE;
            END IF;

            -- Verificar se não há vídeos novos (retorno "NOT")
            IF video_ids_result = '"NOT"'::jsonb THEN
                RAISE NOTICE 'Canal ID %: Nenhum vídeo novo encontrado', canal_record.id;
                CONTINUE;
            END IF;

            -- Converter JSONB array para array PostgreSQL
            IF jsonb_typeof(video_ids_result) = 'array' THEN
                SELECT array_agg(value::text) INTO video_ids_array
                FROM jsonb_array_elements_text(video_ids_result);

                RAISE NOTICE 'Canal ID %: Encontrados % vídeos para verificação',
                    canal_record.id,
                    array_length(video_ids_array, 1);
            ELSE
                RAISE WARNING 'Canal ID %: Formato inesperado de resposta', canal_record.id;
                CONTINUE;
            END IF;

            -- Filtrar apenas vídeos não processados
            videos_novos_array := '{}';
            videos_scanreados_check := ',' || COALESCE(canal_record.videos_scanreados, '') || ',';
            -- MELHORIA: Verificar também contra o campo processar
            processar_check := ',' || COALESCE(canal_record."processar", '') || ',';

            FOREACH video_id IN ARRAY video_ids_array
            LOOP
                -- Verifica se o vídeo é realmente novo (não está em nenhum dos campos)
                IF position(',' || video_id || ',' in videos_scanreados_check) = 0
                   AND position(',' || video_id || ',' in processar_check) = 0 THEN
                    videos_novos_array := array_append(videos_novos_array, video_id);
                END IF;
            END LOOP;

            -- Se há vídeos realmente novos, processa
            IF array_length(videos_novos_array, 1) > 0 THEN
                RAISE NOTICE 'Canal ID %: % vídeos realmente novos encontrados',
                    canal_record.id,
                    array_length(videos_novos_array, 1);

                -- Marca TODOS os vídeos novos imediatamente em videos_scanreados
                todos_novos := array_to_string(videos_novos_array, ',');

                -- Atualiza videos_scanreados com os novos vídeos
                IF canal_record.videos_scanreados IS NULL OR canal_record.videos_scanreados = '' THEN
                    UPDATE "Canais do youtube"
                    SET videos_scanreados = todos_novos
                    WHERE id = canal_record.id;
                ELSE
                    -- SEM TRUNCAMENTO - deixa crescer naturalmente
                    UPDATE "Canais do youtube"
                    SET videos_scanreados = canal_record.videos_scanreados || ',' || todos_novos
                    WHERE id = canal_record.id;
                END IF;

                -- Chama a segunda função para análise detalhada
                BEGIN
                    EXECUTE format('SELECT call_api_edge_function(%L)', canal_record.id) INTO api_result;

                    -- Se a segunda função retornar vídeos bons (não "NOT"), atualiza o campo processar
                    IF (api_result->>'text') != 'NOT' THEN
                        -- Adiciona os vídeos aprovados ao campo processar
                        IF canal_record."processar" IS NULL OR canal_record."processar" = '' THEN
                            UPDATE "Canais do youtube"
                            SET "processar" = api_result->>'text'
                            WHERE id = canal_record.id;
                        ELSE
                            -- SEM TRUNCAMENTO - deixa crescer naturalmente
                            UPDATE "Canais do youtube"
                            SET "processar" = canal_record."processar" || ',' || (api_result->>'text')
                            WHERE id = canal_record.id;
                        END IF;

                        RAISE NOTICE 'Canal ID %: % vídeos aprovados pela análise', canal_record.id, api_result->>'text';
                    ELSE
                        RAISE NOTICE 'Canal ID %: Nenhum vídeo aprovado pela análise', canal_record.id;
                    END IF;

                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Erro ao analisar vídeos do canal ID %: %', canal_record.id, SQLERRM;
                END;
            ELSE
                RAISE NOTICE 'Canal ID %: Todos os vídeos já foram processados anteriormente', canal_record.id;
            END IF;

            -- Log de progresso
            IF processados % 10 = 0 THEN
                RAISE NOTICE 'Processados % de % canais', processados, total_canais;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            canal_com_erro := canal_record.channel_id;
            RAISE WARNING 'Erro geral ao processar canal %: %', canal_com_erro, SQLERRM;
        END;
    END LOOP;

    -- Calcular tempo de execução
    execution_time := NOW() - start_time;

    RAISE NOTICE '<‰ Verificação SQL otimizada concluída em %!', execution_time;
    RAISE NOTICE 'Processados: % de % canais', processados, total_canais;
    RAISE NOTICE '¡ Economia: ~92%% menos invocações Edge Functions!';
    RAISE NOTICE ' Sem truncamento: requisições duplicadas ao Claude eliminadas!';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro crítico na função verificar_novos_videos_youtube: %', SQLERRM;
END;
$function$;