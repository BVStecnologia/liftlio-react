-- =============================================
-- Função: process_and_create_messages_engagement
-- Descrição: Processa e cria mensagens de engajamento com Claude
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_and_create_messages_engagement(integer);

CREATE OR REPLACE FUNCTION public.process_and_create_messages_engagement(p_project_id integer)
 RETURNS TABLE(message_id bigint, cp_id text, status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_raw_result JSONB;
    v_fixed_json TEXT;
    v_messages JSONB;
    v_item RECORD;
    v_message_id BIGINT;
    v_count INTEGER := 0;
    v_start_time TIMESTAMP;
    v_batch_size INTEGER := 10;
    v_total_messages INTEGER;
    v_product_mention_count INTEGER := 0;
    v_engagement_only_count INTEGER := 0;
BEGIN
    v_start_time := clock_timestamp();
    RAISE NOTICE 'Iniciando processamento para projeto % em %', p_project_id, v_start_time;

    -- Obter o resultado com os novos campos
    SELECT process_engagement_comments_with_claude(p_project_id) INTO v_raw_result;
    RAISE NOTICE 'Dados obtidos do Claude em % segundos', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));

    -- Se não há resultado, retornar
    IF v_raw_result IS NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, 'Nenhum comentário pendente ou erro ao processar';
        RETURN;
    END IF;

    -- Converter para texto e limpar escape duplo
    v_fixed_json := REPLACE(v_raw_result::TEXT, '\\\\\\\\\\\\\"\\\\\\\\\"', '\\\"');
    v_fixed_json := REPLACE(v_fixed_json, '\\\\\\\\\"\\\\\\\\', '\\\"\\\\\\\\');
    v_fixed_json := REPLACE(v_fixed_json, '\\\\\\\\\\\\\"\\\\\\\\\"', '\\\"');
    v_fixed_json := TRIM(BOTH '[]\\\"' FROM v_fixed_json);

    -- Se já for um array JSON válido, usar diretamente
    IF v_raw_result::TEXT LIKE '[%]' THEN
        v_messages := v_raw_result;
    ELSE
        v_fixed_json := '[' || v_fixed_json || ']';
        v_messages := v_fixed_json::JSONB;
    END IF;

    -- Verificar total de mensagens
    v_total_messages := jsonb_array_length(v_messages);
    RAISE NOTICE 'Processando % mensagens em lotes de %', v_total_messages, v_batch_size;

    -- Processar cada mensagem
    FOR v_item IN
        SELECT
            TRIM(BOTH '\\\"' FROM (elem->>'cp_id')) as cp_id_text,
            TRIM(BOTH '\\\"' FROM (elem->>'response')) as response,
            TRIM(BOTH '\\\"' FROM (elem->>'justificativa')) as justificativa,
            COALESCE((elem->>'project_id')::INTEGER, p_project_id) as project_id,
            (elem->>'video_id')::BIGINT as video_id,
            COALESCE(elem->>'tipo_resposta', 'engajamento') as tipo_resposta,
            (elem->>'video_comment_count')::INTEGER as video_comment_count,
            (elem->>'max_product_mentions')::INTEGER as max_product_mentions,
            row_number() OVER () as row_num
        FROM jsonb_array_elements(v_messages) as elem
    LOOP
        -- Log de progresso a cada 10 itens
        IF v_item.row_num % 10 = 0 THEN
            RAISE NOTICE 'Processando mensagem % de % (% segundos decorridos)',
                v_item.row_num, v_total_messages,
                EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
        END IF;

        BEGIN
            -- Converter cp_id para BIGINT
            DECLARE
                v_cp_id BIGINT := v_item.cp_id_text::BIGINT;
            BEGIN
                -- Verificar existência do comentário
                IF EXISTS (SELECT 1 FROM "Comentarios_Principais" WHERE id = v_cp_id) THEN
                    -- Inserir na tabela Mensagens com os novos campos
                    WITH msg_insert AS (
                        INSERT INTO public."Mensagens" (
                            created_at,
                            mensagem,
                            "Comentario_Principais",
                            tipo_msg,
                            template,
                            respondido,
                            justificativa,
                            project_id,
                            video,
                            tipo_resposta,
                            video_comment_count,
                            max_product_mentions
                        ) VALUES (
                            NOW(),
                            v_item.response,
                            v_cp_id,
                            2,
                            false,
                            false,
                            v_item.justificativa,
                            v_item.project_id,
                            v_item.video_id,
                            v_item.tipo_resposta,
                            v_item.video_comment_count,
                            v_item.max_product_mentions
                        ) RETURNING id
                    ),
                    comment_update AS (
                        UPDATE public."Comentarios_Principais"
                        SET mensagem = true
                        WHERE id = v_cp_id
                    )
                    SELECT id INTO v_message_id FROM msg_insert;

                    v_count := v_count + 1;

                    -- Contar tipos de resposta
                    IF v_item.tipo_resposta = 'produto' THEN
                        v_product_mention_count := v_product_mention_count + 1;
                    ELSE
                        v_engagement_only_count := v_engagement_only_count + 1;
                    END IF;

                    -- Log específico para menções ao produto
                    IF v_item.tipo_resposta = 'produto' THEN
                        RAISE NOTICE 'Mensagem % contém menção ao produto (vídeo com % comentários, limite: %)',
                            v_message_id, v_item.video_comment_count, v_item.max_product_mentions;
                    END IF;

                    RETURN QUERY SELECT v_message_id, v_item.cp_id_text,
                        'Processado com sucesso (' || v_item.tipo_resposta || ')';
                ELSE
                    RETURN QUERY SELECT NULL::BIGINT, v_item.cp_id_text,
                        'Comentário não encontrado no banco de dados';
                END IF;
            END;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT NULL::BIGINT, v_item.cp_id_text, 'Erro: ' || SQLERRM;
        END;

        -- Commit a cada lote para evitar transações muito longas
        IF v_item.row_num % v_batch_size = 0 THEN
            RAISE NOTICE 'Commit do lote % (mensagens % a %)',
                v_item.row_num / v_batch_size,
                v_item.row_num - v_batch_size + 1,
                v_item.row_num;
        END IF;
    END LOOP;

    -- Estatísticas finais
    RAISE NOTICE 'Processamento concluído em % segundos.',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
    RAISE NOTICE 'Total: % mensagens (% com produto, % apenas engajamento)',
        v_count, v_product_mention_count, v_engagement_only_count;

    -- Resumo se nenhuma mensagem foi processada
    IF v_count = 0 THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT,
            'Nenhuma mensagem processada com sucesso de ' || v_total_messages || ' tentativas';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro global após % segundos: %',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)), SQLERRM;
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, 'Erro global: ' || SQLERRM;
END;
$function$;