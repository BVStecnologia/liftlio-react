-- Função SQL corrigida - Versão 2 FUNCIONANDO
-- Problemas resolvidos:
-- 1. Autorização com anon_key correto
-- 2. Metadata sendo criada corretamente
-- 3. Embeddings sendo gerados e salvos
-- Criado em: 12/01/2025 - 01:59

CREATE OR REPLACE FUNCTION process_rag_batch_sql()
RETURNS jsonb AS $$
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
BEGIN
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
            
            -- Verificar se conteúdo não está vazio
            IF v_content IS NULL OR LENGTH(trim(v_content)) = 0 THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Conteúdo vazio para % id %', v_record.source_table, v_record.id;
                CONTINUE;
            END IF;
            
            -- Preparar metadata
            v_metadata := jsonb_build_object(
                'source_table', v_record.source_table,
                'source_id', v_record.id,
                'project_id', v_record.project_id,
                'processed_at', NOW(),
                'content_length', LENGTH(v_content),
                'content_preview', LEFT(v_content, 100)
            );
            
            -- Chamar Edge Function para gerar embedding
            SELECT content::jsonb INTO v_embedding_response
            FROM http((
                'POST',
                'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                ARRAY[
                    http_header('Authorization', 'Bearer ' || v_anon_key),
                    http_header('Content-Type', 'application/json')
                ],
                'application/json',
                jsonb_build_object('text', v_content)::text
            )::http_request);
            
            -- Verificar se a resposta é válida
            IF v_embedding_response ? 'embedding' THEN
                v_embedding := (v_embedding_response->>'embedding')::vector(1536);
                
                -- Inserir no rag_embeddings
                INSERT INTO rag_embeddings (
                    source_table,
                    source_id,
                    project_id,
                    content,
                    embedding,
                    metadata
                ) VALUES (
                    v_record.source_table,
                    v_record.id::text,
                    v_record.project_id,
                    v_content,
                    v_embedding,
                    v_metadata
                )
                ON CONFLICT (source_table, source_id, project_id) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW();
                
                -- Marcar como processado
                UPDATE "Mensagens" 
                SET rag_processed = true, rag_processed_at = NOW()
                WHERE id = v_record.id;
                
                v_processed_count := v_processed_count + 1;
                
            ELSE
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Erro na resposta da Edge Function para % id %: %', v_record.source_table, v_record.id, v_embedding_response;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Exceção ao processar % id %: %', v_record.source_table, v_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- 2. Processar Comentários (se ainda houver espaço)
    IF v_processed_count < 50 THEN
        FOR v_record IN 
            SELECT id, project_id, 'Comentarios_Principais' as source_table
            FROM "Comentarios_Principais" 
            WHERE rag_processed = false 
            LIMIT (50 - v_processed_count)
        LOOP
            BEGIN
                v_content := prepare_rag_content_comentarios_principais(v_record.id);
                
                IF v_content IS NULL OR LENGTH(trim(v_content)) = 0 THEN
                    v_error_count := v_error_count + 1;
                    CONTINUE;
                END IF;
                
                v_metadata := jsonb_build_object(
                    'source_table', v_record.source_table,
                    'source_id', v_record.id,
                    'project_id', v_record.project_id,
                    'processed_at', NOW(),
                    'content_length', LENGTH(v_content),
                    'content_preview', LEFT(v_content, 100)
                );
                
                SELECT content::jsonb INTO v_embedding_response
                FROM http((
                    'POST',
                    'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                    ARRAY[
                        http_header('Authorization', 'Bearer ' || v_anon_key),
                        http_header('Content-Type', 'application/json')
                    ],
                    'application/json',
                    jsonb_build_object('text', v_content)::text
                )::http_request);
                
                IF v_embedding_response ? 'embedding' THEN
                    v_embedding := (v_embedding_response->>'embedding')::vector(1536);
                    
                    INSERT INTO rag_embeddings (
                        source_table,
                        source_id,
                        project_id,
                        content,
                        embedding,
                        metadata
                    ) VALUES (
                        v_record.source_table,
                        v_record.id::text,
                        v_record.project_id,
                        v_content,
                        v_embedding,
                        v_metadata
                    )
                    ON CONFLICT (source_table, source_id, project_id) 
                    DO UPDATE SET 
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW();
                    
                    UPDATE "Comentarios_Principais" 
                    SET rag_processed = true, rag_processed_at = NOW()
                    WHERE id = v_record.id;
                    
                    v_processed_count := v_processed_count + 1;
                ELSE
                    v_error_count := v_error_count + 1;
                    RAISE NOTICE 'Erro na resposta para % id %: %', v_record.source_table, v_record.id, v_embedding_response;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE 'Exceção ao processar % id %: %', v_record.source_table, v_record.id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    -- Retornar estatísticas detalhadas
    RETURN jsonb_build_object(
        'processed', v_processed_count,
        'errors', v_error_count,
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
        'timestamp', NOW(),
        'status', CASE 
            WHEN v_processed_count > 0 THEN 'success' 
            ELSE 'failed' 
        END
    );
END;
$$ LANGUAGE plpgsql;