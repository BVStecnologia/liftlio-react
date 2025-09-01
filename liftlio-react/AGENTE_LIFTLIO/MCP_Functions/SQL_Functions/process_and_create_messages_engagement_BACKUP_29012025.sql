-- BACKUP DA FUNÇÃO ORIGINAL
-- Data: 29/01/2025
-- Status: FUNCIONANDO EM PRODUÇÃO
-- Descrição: Processa e cria mensagens de engajamento
-- ANTES das modificações para limitar menções

CREATE OR REPLACE FUNCTION public.process_and_create_messages_engagement(p_project_id integer)
 RETURNS TABLE(message_id bigint, cp_id text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '600000'
AS $function$
DECLARE
    v_raw_result JSONB;
    v_fixed_json TEXT;
    v_messages JSONB;
    v_item RECORD;
    v_message_id BIGINT;
    v_count INTEGER := 0;
    v_start_time TIMESTAMP;
    v_batch_size INTEGER := 10; -- Processar em lotes de 10 para grandes volumes
    v_total_messages INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    RAISE NOTICE 'Iniciando processamento para projeto % em %', p_project_id, v_start_time;

    -- Obter o resultado
    SELECT process_engagement_comments_with_claude(p_project_id) INTO v_raw_result;
    RAISE NOTICE 'Dados obtidos do Claude em % segundos', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
    
    -- Converter para texto e limpar escape duplo
    v_fixed_json := REPLACE(v_raw_result::TEXT, '\\\"\\"', '\"');
    v_fixed_json := REPLACE(v_fixed_json, '\\\"\\', '\"\\');
    v_fixed_json := REPLACE(v_fixed_json, '\\\"\\"', '\"');
    v_fixed_json := TRIM(BOTH '[]\"' FROM v_fixed_json);
    v_fixed_json := '[' || v_fixed_json || ']';
    
    -- Converter de volta para JSONB
    v_messages := v_fixed_json::JSONB;
    
    -- Verificar total de mensagens
    v_total_messages := jsonb_array_length(v_messages);
    RAISE NOTICE 'Processando % mensagens em lotes de %', v_total_messages, v_batch_size;
    
    -- Usar CTE e RETURNING para otimizar a inserção em lote
    FOR v_item IN 
        SELECT 
            TRIM(BOTH '\"' FROM (elem->>'cp_id')) as cp_id_text,
            TRIM(BOTH '\"' FROM (elem->>'response')) as response,
            TRIM(BOTH '\"' FROM (elem->>'justificativa')) as justificativa,
            COALESCE((elem->>'project_id')::INTEGER, p_project_id) as project_id,
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
                    -- Inserir na tabela Mensagens com RETURNING otimizado
                    WITH msg_insert AS (
                        INSERT INTO public."Mensagens" (
                            created_at,
                            mensagem,
                            "Comentario_Principais",
                            tipo_msg,
                            template,
                            respondido,
                            justificativa,
                            project_id
                        ) VALUES (
                            NOW(),
                            v_item.response,
                            v_cp_id,
                            2,
                            false,
                            false,
                            v_item.justificativa,
                            v_item.project_id
                        ) RETURNING id
                    ),
                    comment_update AS (
                        UPDATE public."Comentarios_Principais"
                        SET mensagem = true
                        WHERE id = v_cp_id
                    )
                    SELECT id INTO v_message_id FROM msg_insert;
                    
                    v_count := v_count + 1;
                    RETURN QUERY SELECT v_message_id, v_item.cp_id_text, 'Processado com sucesso';
                ELSE
                    RETURN QUERY SELECT NULL::BIGINT, v_item.cp_id_text, 'Comentário não encontrado no banco de dados';
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
    
    RAISE NOTICE 'Processamento concluído em % segundos. % mensagens processadas com sucesso de %.', 
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)), v_count, v_total_messages;
    
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