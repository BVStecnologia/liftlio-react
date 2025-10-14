CREATE OR REPLACE FUNCTION public.process_rag_batch_table(p_table_name text, p_batch_size integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_record RECORD;
    v_content TEXT;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_update_sql TEXT;
BEGIN
    FOR v_record IN
        SELECT *
        FROM v_rag_pending_data
        WHERE table_name = p_table_name
        ORDER BY created_at ASC
        LIMIT p_batch_size
    LOOP
        BEGIN
            -- Preparar conteúdo
            v_content := prepare_rag_content_universal(
                v_record.table_name,
                v_record.record_id,
                v_record.project_id
            );

            -- Inserir com embedding
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
                    'table_name', v_record.table_name
                )
            FROM http((
                'POST',
                'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I')
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

            -- Marcar como processado usando EXECUTE com quote_ident
            v_update_sql := format(
                'UPDATE %I SET rag_processed = TRUE, rag_processed_at = NOW() WHERE id = %s',
                v_record.table_name,
                v_record.record_id
            );
            EXECUTE v_update_sql;

            v_processed := v_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_errors := v_errors || jsonb_build_object(
                'table', v_record.table_name,
                'record_id', v_record.record_id,
                'error', SQLERRM
            );
            RAISE NOTICE 'Erro ao processar %: %', v_record.record_id, SQLERRM;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'table', p_table_name,
        'processed', v_processed,
        'failed', v_failed,
        'errors', v_errors
    );
END;
$function$