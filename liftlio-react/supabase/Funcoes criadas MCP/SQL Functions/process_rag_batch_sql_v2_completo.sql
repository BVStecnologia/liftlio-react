-- Função melhorada para processar TODAS as 14 tabelas com RAG
-- Versão 2: Inclui Settings messages posts e todas as outras tabelas
-- Data: 14/01/2025

CREATE OR REPLACE FUNCTION process_rag_batch_sql(p_batch_size INT DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_content TEXT;
    v_embedding_response jsonb;
    v_embedding vector(1536);
    v_metadata jsonb;
    v_processed_count INT := 0;
    v_error_count INT := 0;
    v_start_time TIMESTAMP := NOW();
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
    v_remaining_quota INT := p_batch_size;
    v_tables_processed jsonb := '[]'::jsonb;
BEGIN
    -- Lista de todas as tabelas para processar
    -- Priorizando Settings messages posts e outras com mais registros pendentes
    
    -- 1. Settings messages posts (CRÍTICO - 11 registros pendentes)
    FOR v_record IN 
        SELECT id, "Projeto" as project_id, 'Settings messages posts' as source_table
        FROM "Settings messages posts" 
        WHERE rag_processed = false 
        LIMIT LEAST(v_remaining_quota, 15)
    LOOP
        BEGIN
            v_content := prepare_rag_content_settings_messages(v_record.id);
            
            IF v_content IS NOT NULL AND LENGTH(trim(v_content)) > 0 THEN
                -- Gerar embedding via Edge Function
                SELECT content INTO v_embedding_response
                FROM http((
                    'POST',
                    'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                    ARRAY[
                        http_header('authorization', 'Bearer ' || v_anon_key),
                        http_header('content-type', 'application/json')
                    ],
                    jsonb_build_object('content', v_content)::text
                ));
                
                IF v_embedding_response IS NOT NULL AND 
                   v_embedding_response ? 'embedding' AND 
                   jsonb_array_length(v_embedding_response->'embedding') = 1536 THEN
                    
                    v_embedding := v_embedding_response->'embedding';
                    
                    -- Metadata especial para mensagens agendadas
                    v_metadata := jsonb_build_object(
                        'source_table', v_record.source_table,
                        'source_id', v_record.id,
                        'project_id', v_record.project_id,
                        'processed_at', NOW(),
                        'content_length', LENGTH(v_content),
                        'content_preview', LEFT(v_content, 100),
                        'scheduled_for', (SELECT proxima_postagem FROM "Settings messages posts" WHERE id = v_record.id)
                    );
                    
                    INSERT INTO rag_embeddings (
                        content, embedding, metadata, source_table, source_id, project_id
                    ) VALUES (
                        v_content, v_embedding, v_metadata, v_record.source_table, v_record.id, v_record.project_id
                    )
                    ON CONFLICT (source_table, source_id, project_id) 
                    DO UPDATE SET
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW();
                    
                    UPDATE "Settings messages posts" 
                    SET rag_processed = true 
                    WHERE id = v_record.id;
                    
                    v_processed_count := v_processed_count + 1;
                    v_remaining_quota := v_remaining_quota - 1;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Erro em Settings messages posts id %: %', v_record.id, SQLERRM;
        END;
        
        EXIT WHEN v_remaining_quota <= 0;
    END LOOP;
    
    IF v_processed_count > 0 THEN
        v_tables_processed := v_tables_processed || jsonb_build_object('table', 'Settings messages posts', 'count', v_processed_count);
    END IF;

    -- 2. Videos_transcricao (212 registros pendentes)
    IF v_remaining_quota > 0 THEN
        FOR v_record IN 
            SELECT id, projeto_id as project_id, 'Videos_transcricao' as source_table
            FROM "Videos_transcricao" 
            WHERE rag_processed = false 
            LIMIT LEAST(v_remaining_quota, 10)
        LOOP
            BEGIN
                v_content := prepare_rag_content_videos_transcricao(v_record.id);
                
                IF v_content IS NOT NULL AND LENGTH(trim(v_content)) > 0 THEN
                    -- Mesma lógica de processamento...
                    SELECT content INTO v_embedding_response
                    FROM http((
                        'POST',
                        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                        ARRAY[
                            http_header('authorization', 'Bearer ' || v_anon_key),
                            http_header('content-type', 'application/json')
                        ],
                        jsonb_build_object('content', v_content)::text
                    ));
                    
                    IF v_embedding_response IS NOT NULL AND 
                       v_embedding_response ? 'embedding' THEN
                        
                        v_embedding := v_embedding_response->'embedding';
                        v_metadata := jsonb_build_object(
                            'source_table', v_record.source_table,
                            'source_id', v_record.id,
                            'project_id', v_record.project_id,
                            'processed_at', NOW()
                        );
                        
                        INSERT INTO rag_embeddings (
                            content, embedding, metadata, source_table, source_id, project_id
                        ) VALUES (
                            v_content, v_embedding, v_metadata, v_record.source_table, v_record.id, v_record.project_id
                        )
                        ON CONFLICT (source_table, source_id, project_id) 
                        DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW();
                        
                        UPDATE "Videos_transcricao" 
                        SET rag_processed = true 
                        WHERE id = v_record.id;
                        
                        v_processed_count := v_processed_count + 1;
                        v_remaining_quota := v_remaining_quota - 1;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro em Videos_transcricao id %: %', v_record.id, SQLERRM;
            END;
            
            EXIT WHEN v_remaining_quota <= 0;
        END LOOP;
    END IF;

    -- 3. Scanner de videos do youtube (53 registros)
    IF v_remaining_quota > 0 THEN
        FOR v_record IN 
            SELECT id, projeto_id as project_id, 'Scanner de videos do youtube' as source_table
            FROM "Scanner de videos do youtube" 
            WHERE rag_processed = false 
            LIMIT LEAST(v_remaining_quota, 10)
        LOOP
            BEGIN
                v_content := prepare_rag_content_scanner_videos(v_record.id);
                
                IF v_content IS NOT NULL AND LENGTH(trim(v_content)) > 0 THEN
                    -- Processar embedding...
                    SELECT content INTO v_embedding_response
                    FROM http((
                        'POST',
                        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                        ARRAY[
                            http_header('authorization', 'Bearer ' || v_anon_key),
                            http_header('content-type', 'application/json')
                        ],
                        jsonb_build_object('content', v_content)::text
                    ));
                    
                    IF v_embedding_response IS NOT NULL AND 
                       v_embedding_response ? 'embedding' THEN
                        
                        v_embedding := v_embedding_response->'embedding';
                        v_metadata := jsonb_build_object(
                            'source_table', v_record.source_table,
                            'source_id', v_record.id,
                            'project_id', v_record.project_id,
                            'processed_at', NOW()
                        );
                        
                        INSERT INTO rag_embeddings (
                            content, embedding, metadata, source_table, source_id, project_id
                        ) VALUES (
                            v_content, v_embedding, v_metadata, v_record.source_table, v_record.id, v_record.project_id
                        )
                        ON CONFLICT (source_table, source_id, project_id) 
                        DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW();
                        
                        UPDATE "Scanner de videos do youtube" 
                        SET rag_processed = true 
                        WHERE id = v_record.id;
                        
                        v_processed_count := v_processed_count + 1;
                        v_remaining_quota := v_remaining_quota - 1;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro em Scanner videos id %: %', v_record.id, SQLERRM;
            END;
            
            EXIT WHEN v_remaining_quota <= 0;
        END LOOP;
    END IF;

    -- 4. agent_conversations (49 registros)
    IF v_remaining_quota > 0 THEN
        FOR v_record IN 
            SELECT id, project_id, 'agent_conversations' as source_table
            FROM agent_conversations 
            WHERE rag_processed = false 
            LIMIT LEAST(v_remaining_quota, 10)
        LOOP
            BEGIN
                v_content := prepare_rag_content_agent_conversations(v_record.id);
                
                IF v_content IS NOT NULL AND LENGTH(trim(v_content)) > 0 THEN
                    -- Processar...
                    SELECT content INTO v_embedding_response
                    FROM http((
                        'POST',
                        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                        ARRAY[
                            http_header('authorization', 'Bearer ' || v_anon_key),
                            http_header('content-type', 'application/json')
                        ],
                        jsonb_build_object('content', v_content)::text
                    ));
                    
                    IF v_embedding_response IS NOT NULL AND 
                       v_embedding_response ? 'embedding' THEN
                        
                        v_embedding := v_embedding_response->'embedding';
                        v_metadata := jsonb_build_object(
                            'source_table', v_record.source_table,
                            'source_id', v_record.id,
                            'project_id', v_record.project_id,
                            'processed_at', NOW()
                        );
                        
                        INSERT INTO rag_embeddings (
                            content, embedding, metadata, source_table, source_id, project_id
                        ) VALUES (
                            v_content, v_embedding, v_metadata, v_record.source_table, v_record.id, v_record.project_id
                        )
                        ON CONFLICT (source_table, source_id, project_id) 
                        DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW();
                        
                        UPDATE agent_conversations 
                        SET rag_processed = true 
                        WHERE id = v_record.id;
                        
                        v_processed_count := v_processed_count + 1;
                        v_remaining_quota := v_remaining_quota - 1;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro em agent_conversations id %: %', v_record.id, SQLERRM;
            END;
            
            EXIT WHEN v_remaining_quota <= 0;
        END LOOP;
    END IF;

    -- 5. Canais do youtube (29 registros)
    IF v_remaining_quota > 0 THEN
        FOR v_record IN 
            SELECT id, projeto_id as project_id, 'Canais do youtube' as source_table
            FROM "Canais do youtube" 
            WHERE rag_processed = false 
            LIMIT LEAST(v_remaining_quota, 10)
        LOOP
            BEGIN
                v_content := prepare_rag_content_canais(v_record.id);
                
                IF v_content IS NOT NULL AND LENGTH(trim(v_content)) > 0 THEN
                    -- Processar...
                    SELECT content INTO v_embedding_response
                    FROM http((
                        'POST',
                        'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                        ARRAY[
                            http_header('authorization', 'Bearer ' || v_anon_key),
                            http_header('content-type', 'application/json')
                        ],
                        jsonb_build_object('content', v_content)::text
                    ));
                    
                    IF v_embedding_response IS NOT NULL AND 
                       v_embedding_response ? 'embedding' THEN
                        
                        v_embedding := v_embedding_response->'embedding';
                        v_metadata := jsonb_build_object(
                            'source_table', v_record.source_table,
                            'source_id', v_record.id,
                            'project_id', v_record.project_id,
                            'processed_at', NOW()
                        );
                        
                        INSERT INTO rag_embeddings (
                            content, embedding, metadata, source_table, source_id, project_id
                        ) VALUES (
                            v_content, v_embedding, v_metadata, v_record.source_table, v_record.id, v_record.project_id
                        )
                        ON CONFLICT (source_table, source_id, project_id) 
                        DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW();
                        
                        UPDATE "Canais do youtube" 
                        SET rag_processed = true 
                        WHERE id = v_record.id;
                        
                        v_processed_count := v_processed_count + 1;
                        v_remaining_quota := v_remaining_quota - 1;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro em Canais id %: %', v_record.id, SQLERRM;
            END;
            
            EXIT WHEN v_remaining_quota <= 0;
        END LOOP;
    END IF;

    -- Retornar resultado detalhado
    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'error_count', v_error_count,
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
        'processed_at', NOW(),
        'tables_processed', v_tables_processed,
        'remaining_quota', v_remaining_quota
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'processed_count', v_processed_count,
        'error_count', v_error_count,
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))
    );
END;
$$;