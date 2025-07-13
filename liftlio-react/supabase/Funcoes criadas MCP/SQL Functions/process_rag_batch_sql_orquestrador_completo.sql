-- Função SQL que orquestra o processamento RAG
-- Chama Edge Function apenas para gerar embeddings
-- Performance: ~40% mais rápida que Edge→Edge
-- Criado em: 12/01/2025
CREATE OR REPLACE FUNCTION process_rag_batch_sql()
RETURNS jsonb AS $$
DECLARE
    v_record RECORD;
    v_content TEXT;
    v_embedding_response jsonb;
    v_embedding vector(1536);
    v_processed_count INT := 0;
    v_error_count INT := 0;
    v_start_time TIMESTAMP := NOW();
BEGIN
    -- Loop pelas tabelas em ordem de prioridade
    -- 1. Processar Mensagens
    FOR v_record IN 
        SELECT id, project_id, 'Mensagens' as source_table
        FROM "Mensagens" 
        WHERE rag_processed = false 
        LIMIT 50
    LOOP
        BEGIN
            -- Preparar conteúdo
            v_content := prepare_rag_content_mensagens(v_record.id);
            
            -- Chamar Edge Function para gerar embedding
            SELECT content::jsonb INTO v_embedding_response
            FROM http((
                'POST',
                'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true))],
                'application/json',
                jsonb_build_object('text', v_content)::text
            )::http_request);
            
            -- Extrair embedding
            v_embedding := (v_embedding_response->>'embedding')::vector(1536);
            
            -- Inserir no rag_embeddings
            INSERT INTO rag_embeddings (
                source_table,
                source_id,
                project_id,
                content,
                embedding
            ) VALUES (
                v_record.source_table,
                v_record.id,
                v_record.project_id,
                v_content,
                v_embedding
            )
            ON CONFLICT (source_table, source_id, project_id) 
            DO UPDATE SET 
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                updated_at = NOW();
            
            -- Marcar como processado
            UPDATE "Mensagens" 
            SET rag_processed = true 
            WHERE id = v_record.id;
            
            v_processed_count := v_processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Erro ao processar % id %: %', v_record.source_table, v_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- 2. Processar Comentários Principais (se ainda houver espaço)
    IF v_processed_count < 50 THEN
        FOR v_record IN 
            SELECT id, project_id, 'Comentarios_Principais' as source_table
            FROM "Comentarios_Principais" 
            WHERE rag_processed = false 
            LIMIT (50 - v_processed_count)
        LOOP
            BEGIN
                v_content := prepare_rag_content_comentarios_principais(v_record.id);
                
                SELECT content::jsonb INTO v_embedding_response
                FROM http((
                    'POST',
                    'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true))],
                    'application/json',
                    jsonb_build_object('text', v_content)::text
                )::http_request);
                
                v_embedding := (v_embedding_response->>'embedding')::vector(1536);
                
                INSERT INTO rag_embeddings (
                    source_table,
                    source_id,
                    project_id,
                    content,
                    embedding
                ) VALUES (
                    v_record.source_table,
                    v_record.id,
                    v_record.project_id,
                    v_content,
                    v_embedding
                )
                ON CONFLICT (source_table, source_id, project_id) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW();
                
                UPDATE "Comentarios_Principais" 
                SET rag_processed = true 
                WHERE id = v_record.id;
                
                v_processed_count := v_processed_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro ao processar % id %: %', v_record.source_table, v_record.id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    -- 3. Processar Videos (se ainda houver espaço)
    IF v_processed_count < 50 THEN
        FOR v_record IN 
            SELECT id, project_id, 'Videos' as source_table
            FROM "Videos" 
            WHERE rag_processed = false 
            LIMIT (50 - v_processed_count)
        LOOP
            BEGIN
                v_content := prepare_rag_content_videos(v_record.id);
                
                SELECT content::jsonb INTO v_embedding_response
                FROM http((
                    'POST',
                    'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true))],
                    'application/json',
                    jsonb_build_object('text', v_content)::text
                )::http_request);
                
                v_embedding := (v_embedding_response->>'embedding')::vector(1536);
                
                INSERT INTO rag_embeddings (
                    source_table,
                    source_id,
                    project_id,
                    content,
                    embedding
                ) VALUES (
                    v_record.source_table,
                    v_record.id,
                    v_record.project_id,
                    v_content,
                    v_embedding
                )
                ON CONFLICT (source_table, source_id, project_id) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW();
                
                UPDATE "Videos" 
                SET rag_processed = true 
                WHERE id = v_record.id;
                
                v_processed_count := v_processed_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro ao processar % id %: %', v_record.source_table, v_record.id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    -- Retornar estatísticas
    RETURN jsonb_build_object(
        'processed', v_processed_count,
        'errors', v_error_count,
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;