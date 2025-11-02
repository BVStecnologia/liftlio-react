CREATE OR REPLACE FUNCTION public.process_rag_batch(p_batch_size integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_record RECORD;
    v_content TEXT;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_start_time TIMESTAMP := clock_timestamp();
    v_errors JSONB := '[]'::JSONB;
    base_url TEXT;
    auth_key TEXT;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    base_url := get_edge_functions_url();
    auth_key := get_edge_functions_anon_key();
    -- USAR A VIEW v_rag_pending_data
    FOR v_record IN
        SELECT *
        FROM v_rag_pending_data
        ORDER BY created_at ASC
        LIMIT p_batch_size
    LOOP
        BEGIN
            -- 1. Preparar conte�do
            v_content := prepare_rag_content_universal(
                v_record.table_name,
                v_record.record_id,
                v_record.project_id
            );

            -- 2. Inserir com embedding (chamando Edge Function inline)
            INSERT INTO rag_embeddings (
                source_table,
                source_id,
                project_id,
                content,
                embedding,
                metadata
            )
            SELECT
                v_record.table_name,
                v_record.record_id::TEXT,
                v_record.project_id,
                v_content,
                ARRAY(
                    SELECT jsonb_array_elements_text((response.content::jsonb)->'embedding')::float
                )::vector,
                jsonb_build_object(
                    'processed_at', NOW(),
                    'original_created_at', v_record.created_at,
                    'table_name', v_record.table_name
                )
            FROM http((
                'POST',
                base_url || '/generate-embedding',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer ' || auth_key)
                ]::http_header[],
                'application/json',
                jsonb_build_object('text', v_content)::text
            )::http_request) AS response
            WHERE response.status = 200
            ON CONFLICT (source_table, source_id, project_id)
            DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                updated_at = NOW();

            -- 3. Marcar como processado (UPDATE espec�fico por tabela)
            CASE v_record.table_name
                WHEN 'Mensagens' THEN
                    UPDATE "Mensagens"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Comentarios_Principais' THEN
                    UPDATE "Comentarios_Principais"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Videos' THEN
                    UPDATE "Videos"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Respostas_Comentarios' THEN
                    UPDATE "Respostas_Comentarios"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Videos_trancricao' THEN
                    UPDATE "Videos_trancricao"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Settings messages posts' THEN
                    UPDATE "Settings messages posts"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Canais do youtube' THEN
                    UPDATE "Canais do youtube"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Scanner de videos do youtube' THEN
                    UPDATE "Scanner de videos do youtube"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Notificacoes' THEN
                    UPDATE "Notificacoes"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Integra��es' THEN
                    UPDATE "Integra��es"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;

                WHEN 'Projeto' THEN
                    UPDATE "Projeto"
                    SET rag_processed = TRUE, rag_processed_at = NOW()
                    WHERE id = v_record.record_id;
            END CASE;

            v_processed := v_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_errors := v_errors || jsonb_build_object(
                'table', v_record.table_name,
                'record_id', v_record.record_id,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed', v_processed,
        'failed', v_failed,
        'duration_seconds', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)),
        'errors', v_errors
    );
END;
$function$